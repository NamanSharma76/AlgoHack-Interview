"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

export default function SessionDetail() {
  const { id } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history/session/${id}`);
        const sessionJson = await sessionRes.json();
        setSessionData(sessionJson);

        const answersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history/answers/${id}`);
        const answersJson = await answersRes.json();
        setAnswers(answersJson);
      } catch (err) {
        console.error("Error fetching session details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id]);

  // Use 'bg-background' for loading and error states to keep them theme-aware
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-slate-500 text-sm">
      Loading details...
    </div>
  );
  
  if (!sessionData) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-medium">
      Session not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push('/dashboard')}
          className="text-slate-500 hover:text-blue-500 text-xs mb-8 flex items-center gap-2 transition-colors font-medium"
        >
          ← Back to Dashboard
        </button>

        {/* Header Summary Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold">{sessionData.job_role || "Technical Interview"}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Attempted on {new Date(sessionData.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-lg border border-blue-600/20 text-center">
              <div className="text-xl font-black">{sessionData.score}/10</div>
              <div className="text-[10px] uppercase font-bold tracking-tight">Final Score</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">AI Feedback</h3>
              <p className="text-sm leading-relaxed bg-background/50 p-4 rounded-lg border border-border/50 text-foreground/90 italic">
                "{sessionData.feedback}"
              </p>
            </div>
          </div>
        </div>

        {/* Q&A Transcript List */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Interview Transcript</h2>
          {answers.map((item, index) => (
            <div key={item.id} className="bg-card/40 border border-border/60 rounded-xl p-6 transition-all">
              <div className="flex gap-5">
                <span className="text-blue-500 font-mono text-sm font-bold opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="space-y-5 w-full">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Question</h4>
                    <p className="text-base font-semibold leading-snug">{item.question}</p>
                  </div>
                  <div className="pt-5 border-t border-border/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Your Answer</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}