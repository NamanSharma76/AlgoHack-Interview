"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speakQuestion(text, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}
function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis)
    window.speechSynthesis.cancel();
}

// ─── STT ──────────────────────────────────────────────────────────────────────
function createRecognition() {
  if (typeof window === "undefined") return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

// ─── Step constants ───────────────────────────────────────────────────────────
const STEP_UPLOAD = "upload";
const STEP_INTERVIEW = "interview";
const STEP_EVALUATING = "evaluating";
const STEP_RESULT = "result";

export default function Interview() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Flow step ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(STEP_UPLOAD);

  // ── Upload / Setup state ──────────────────────────────────────────────────
  const [resumeMode, setResumeMode] = useState("file"); // "file" | "text"
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jdMode, setJdMode] = useState("text"); // "text" | "file"
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");

  // ── Interview state ───────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [jobRole, setJobRole] = useState("Technical Role");
  const [result, setResult] = useState(null);

  // ── Speech state ──────────────────────────────────────────────────────────
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState("text");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef(null);
  const answerRef = useRef("");

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user || null);
      setAuthLoading(false);
    };
    init();
    const supported =
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
      !!window.speechSynthesis;
    setSpeechSupported(supported);
    return () => { stopSpeaking(); stopListening(); };
  }, []);

  // ── Reset speech on question change ──────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) return;
    stopListening();
    setAnswer("");
    answerRef.current = "";
    setInterimTranscript("");
    setIsListening(false);
  }, [current, questions.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0: Parse resume + JD → generate questions
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    setSetupError("");
    const hasResume = resumeMode === "file" ? !!resumeFile : resumeText.trim().length > 50;
    const hasJD = jdMode === "file" ? !!jdFile : jdText.trim().length > 20;
    if (!hasResume) return setSetupError("Please provide your resume (file or at least 50 characters of text).");
    if (!hasJD) return setSetupError("Please provide the job description.");

    setSetupLoading(true);
    try {
      // 1. Parse resume → structured JSON
      let parsed;
      if (resumeMode === "file") {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/resume/parse-file`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to parse resume file"); }
        const data = await res.json();
        parsed = data.parsed;
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/resume/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText }),
        });
        if (!res.ok) throw new Error("Failed to parse resume text");
        const data = await res.json();
        parsed = data.parsed;
      }

      // 2. Get JD as text
      let jdContent = jdText;
      if (jdMode === "file" && jdFile) {
        jdContent = await readFileAsText(jdFile);
      }
      // Use first 60 chars of JD as the job role label
      setJobRole(jdContent.slice(0, 500).trim());

      // 3. Generate questions from real data
      const qRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/questions/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume: parsed, jobDescription: jdContent }),
      })
      if (!qRes.ok) throw new Error("Failed to generate questions");
      const qData = await qRes.json();
      if (!qData.questions?.length) throw new Error("No questions were generated. Please try again.");

      setQuestions(qData.questions);
      setStep(STEP_INTERVIEW);
    } catch (err) {
      setSetupError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  // ─────────────────────────────────────────────────────────────────────────
  // TTS / STT
  // ─────────────────────────────────────────────────────────────────────────
  const handleSpeakQuestion = () => {
    if (!questions[current]) return;
    if (isSpeakingQuestion) { stopSpeaking(); setIsSpeakingQuestion(false); return; }
    setIsSpeakingQuestion(true);
    speakQuestion(questions[current], () => setIsSpeakingQuestion(false));
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startListening = useCallback(() => {
    const rec = createRecognition();
    if (!rec) return;
    rec.onresult = (event) => {
      let finalChunk = "", interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (finalChunk += t) : (interim += t);
      }
      if (finalChunk) {
        const updated = (answerRef.current + " " + finalChunk).trimStart();
        answerRef.current = updated;
        setAnswer(updated);
      }
      setInterimTranscript(interim);
    };
    rec.onerror = () => stopListening();
    rec.onend = () => { if (recognitionRef.current) try { recognitionRef.current.start(); } catch (_) {} };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [stopListening]);

  // ─────────────────────────────────────────────────────────────────────────
  // NEXT / SUBMIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    const finalAnswer = answerRef.current || answer;
    if (!finalAnswer.trim()) return alert("Please provide an answer.");
    stopSpeaking(); stopListening(); setIsSpeakingQuestion(false);

    const updatedAnswers = [...answers, { question: questions[current], answer: finalAnswer }];
    setAnswers(updatedAnswers);
    setAnswer(""); answerRef.current = ""; setInterimTranscript("");

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setStep(STEP_EVALUATING);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/evaluation/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qaPairs: updatedAnswers, user_id: user.id, job_role: jobRole }),
        });
        if (!res.ok) throw new Error("Evaluation failed");
        const data = await res.json();
        setResult(data);
        setStep(STEP_RESULT); // ✅ only on success
      } catch (err) {
        console.error("Evaluation failed", err);
        setStep(STEP_UPLOAD); // go back to start on failure
      } finally {
        setStep(STEP_RESULT);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER GUARDS
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading)
    return <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 transition-colors duration-300">Initializing...</div>;

  if (!user)
    return <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-white transition-colors duration-300">Please login to continue.</div>;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0: UPLOAD
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEP_UPLOAD) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex items-center justify-center p-6 transition-colors duration-300">
        <div className="max-w-2xl w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set Up Your Interview</h1>
            <p className="text-sm text-slate-500 mt-1">Upload your resume and job description to get personalised questions.</p>
          </div>

          {/* Resume */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">📄 Your Resume</h2>
              <ModeToggle
                value={resumeMode}
                onChange={(v) => { setResumeMode(v); setResumeFile(null); setResumeText(""); }}
                options={[{ value: "file", label: "Upload File" }, { value: "text", label: "Paste Text" }]}
              />
            </div>
            {resumeMode === "file" ? (
              <FileDropZone
                accept=".pdf,.doc,.docx,.txt"
                file={resumeFile}
                onFile={setResumeFile}
                hint="PDF, Word (.docx), or plain text — max 10MB"
              />
            ) : (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                placeholder="Paste your full resume text here..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-300 outline-none focus:border-blue-500 resize-none transition-colors"
              />
            )}
          </div>

          {/* JD */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">💼 Job Description</h2>
              <ModeToggle
                value={jdMode}
                onChange={(v) => { setJdMode(v); setJdFile(null); setJdText(""); }}
                options={[{ value: "text", label: "Paste Text" }, { value: "file", label: "Upload File" }]}
              />
            </div>
            {jdMode === "text" ? (
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={5}
                placeholder="Paste the job description here..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-300 outline-none focus:border-blue-500 resize-none transition-colors"
              />
            ) : (
              <FileDropZone
                accept=".pdf,.doc,.docx,.txt"
                file={jdFile}
                onFile={setJdFile}
                hint="PDF, Word (.docx), or plain text"
              />
            )}
          </div>

          {setupError && (
            <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              {setupError}
            </div>
          )}

          <button
            onClick={handleStartInterview}
            disabled={setupLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            {setupLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analysing & Generating Questions...
              </span>
            ) : "Generate Interview Questions →"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUATING
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEP_EVALUATING) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-50 transition-colors duration-300">
        <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">Analyzing Performance</h2>
        <p className="text-sm text-slate-500">Your feedback is being generated...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESULT
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEP_RESULT && result) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-4 md:p-8 flex items-center justify-center transition-colors duration-300">
        <div className="max-w-3xl w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <h2 className="text-xl font-bold">Interview Results</h2>
            <div className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-md border border-blue-600/20">
              Score: <span className="font-bold">{result.score}/10</span>
            </div>
          </div>
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Overall Feedback</h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">{result.feedback}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Growth Points</h3>
              <div className="grid gap-2">
                {result.improvements?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERVIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-2xl w-full">

        {/* Progress */}
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full mb-10">
          <div
            className="h-full bg-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
              Question {current + 1} of {questions.length}
            </span>
            {speechSupported && (
              <button
                onClick={handleSpeakQuestion}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium
                  ${isSpeakingQuestion
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-500"
                  }`}
              >
                {isSpeakingQuestion ? (
                  <>
                    <span className="flex gap-0.5 items-end h-3">
                      {[0, 100, 200, 100].map((delay, i) => (
                        <span key={i} className="w-0.5 bg-white rounded animate-bounce"
                          style={{ height: `${[4, 8, 12, 8][i]}px`, animationDelay: `${delay}ms` }} />
                      ))}
                    </span>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    Listen
                  </>
                )}
              </button>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white leading-snug">
            {questions[current]}
          </h1>
        </div>

        {/* Input Mode Toggle */}
        {speechSupported && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Answer via:</span>
            <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => { stopListening(); setInputMode("text"); }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${inputMode === "text" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >⌨️ Type</button>
              <button
                onClick={() => setInputMode("speech")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${inputMode === "speech" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >🎙️ Speak</button>
            </div>
          </div>
        )}

        {/* Answer Area */}
        {inputMode === "text" ? (
          <textarea
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); answerRef.current = e.target.value; }}
            className="w-full h-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-4 rounded-xl text-slate-800 dark:text-slate-300 text-base outline-none mb-6 transition-all resize-none"
            placeholder="Type your technical response..."
          />
        ) : (
          <div className="mb-6">
            <div className="flex flex-col items-center justify-center gap-4 py-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-3">
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isListening ? "bg-red-500 hover:bg-red-600 scale-110" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                    <span className="absolute inset-[-6px] rounded-full border-2 border-red-400/50 animate-pulse" />
                  </>
                )}
                <svg className="w-7 h-7 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
              <p className="text-xs text-slate-500 font-medium">
                {isListening ? "🔴 Listening... tap to stop" : "Tap to start speaking"}
              </p>
            </div>
            <div className="min-h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm leading-relaxed">
              {answer || interimTranscript ? (
                <>
                  <span className="text-slate-800 dark:text-slate-300">{answer}</span>
                  {interimTranscript && (
                    <span className="text-slate-400 dark:text-slate-500 italic">{answer ? " " : ""}{interimTranscript}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-600 italic">Your spoken answer will appear here...</span>
              )}
            </div>
            {(answer || interimTranscript) && (
              <button
                onClick={() => { setAnswer(""); answerRef.current = ""; setInterimTranscript(""); }}
                className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >✕ Clear</button>
            )}
          </div>
        )}

        {/* Next */}
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold rounded-lg hover:opacity-90 transition-all active:scale-95 text-sm"
          >
            {current === questions.length - 1 ? "Finish Interview" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function ModeToggle({ value, onChange, options }) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
            value === opt.value
              ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FileDropZone({ accept, file, onFile, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
        dragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          : file
          ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
          : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            className="ml-2 text-slate-400 hover:text-red-500 text-xs transition-colors"
          >✕</button>
        </div>
      ) : (
        <>
          <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="text-blue-500 font-medium">Click to upload</span> or drag & drop
          </p>
          <p className="text-xs text-slate-400 mt-1">{hint}</p>
        </>
      )}
    </div>
  );
}