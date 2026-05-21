"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

export default function Home() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data.session?.user || null);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch sessions when user logs in
  useEffect(() => {
    if (!user) { setSessions([]); return; }
    const fetchSessions = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history/${user.id}`);
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch (_) {
        setSessions([]);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: { prompt: "select_account", access_type: "offline" },
        redirectTo: window.location.origin,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Computed stats
  const totalInterviews = sessions.length;
  const avgScore = totalInterviews > 0
    ? (sessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalInterviews).toFixed(1)
    : null;
  const lastSession = sessions[0] || null;
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* ── LOGGED OUT: Landing Page ─────────────────────────────────────── */}
      {!user && (
        <div className="flex flex-col">

          {/* Hero */}
          <section className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                AI-Powered Interview Practice
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                Ace your next<br />
                <span className="text-blue-500">interview</span><br />
                with AI
              </h1>

              <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
                Upload your resume and job description. Get personalised interview questions, answer by voice or text, and receive instant AI feedback with a score.
              </p>

              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-xs text-slate-400 mt-4">Free to use. No credit card required.</p>
            </div>
          </section>

          {/* How it works */}
          <section className="py-20 px-6 border-t border-slate-100 dark:border-slate-800/50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-3">How it works</h2>
              <p className="text-center text-slate-500 text-sm mb-12">Three steps to a better interview performance</p>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: "01",
                    title: "Upload Resume & JD",
                    desc: "Upload your resume and the job description as PDF, Word, or plain text.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    ),
                  },
                  {
                    step: "02",
                    title: "Answer AI Questions",
                    desc: "Get 5 personalised questions. Answer by typing or speaking — listen to questions read aloud.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ),
                  },
                  {
                    step: "03",
                    title: "Get AI Feedback",
                    desc: "Receive an instant score out of 10, detailed feedback, and specific improvement points.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative">
                    <div className="absolute top-4 right-4 text-4xl font-black text-slate-100 dark:text-slate-800 select-none">
                      {item.step}
                    </div>
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 rounded-lg flex items-center justify-center text-blue-500 mb-4">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 px-6 border-t border-slate-100 dark:border-slate-800/50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-3">Everything you need</h2>
              <p className="text-center text-slate-500 text-sm mb-12">Built for serious interview preparation</p>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Personalised Questions", desc: "Questions generated from your actual resume and the specific job description — not generic practice sets.", emoji: "🎯" },
                  { title: "Voice Mode", desc: "Listen to questions read aloud and answer by speaking. Real-time speech transcription with duplicate filtering.", emoji: "🎙️" },
                  { title: "AI Scoring & Feedback", desc: "Google Gemini evaluates all your answers together and gives an overall score with actionable improvement points.", emoji: "🤖" },
                  { title: "Interview History", desc: "Every session is saved. Review past interviews, scores, and full Q&A transcripts anytime from your dashboard.", emoji: "📊" },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-2xl shrink-0">{f.emoji}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Footer */}
          <section className="py-20 px-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Ready to practice?</h2>
              <p className="text-slate-500 text-sm mb-8">Sign in with Google and start your first AI mock interview in under a minute.</p>
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="white" fillOpacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="white" fillOpacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="white" fillOpacity="0.9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="white" fillOpacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Get Started Free
              </button>
              <p className="text-slate-500 mt-4 text-sm mb-8">© 2026 HirePrep AI • Built by Naman Sharma</p>
            </div>
          </section>
        </div>
      )}

      {/* ── LOGGED IN: Welcome Dashboard ────────────────────────────────────── */}
      {user && (
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Welcome */}
          <div className="mb-10">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Hey, {firstName} 👋
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                label: "Interviews",
                value: statsLoading ? "—" : totalInterviews,
                sub: "total sessions",
              },
              {
                label: "Avg Score",
                value: statsLoading ? "—" : avgScore ? `${avgScore}/10` : "—",
                sub: "across all sessions",
              },
              {
                label: "Last Session",
                value: statsLoading ? "—" : lastSession
                  ? new Date(lastSession.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "—",
                sub: lastSession?.job_role?.slice(0, 20) || "no sessions yet",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/interview"
              className="group bg-blue-600 hover:bg-blue-700 rounded-xl p-6 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-black text-white text-lg">Start New Interview</h3>
              <p className="text-blue-200 text-xs mt-1">Upload your resume & JD to begin</p>
              <div className="mt-4 text-white/60 group-hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                Go → 
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="group bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-400/50 rounded-xl p-6 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg">View Dashboard</h3>
              <p className="text-slate-500 text-xs mt-1">Review past sessions & scores</p>
              <div className="mt-4 text-slate-400 group-hover:text-blue-500 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                Go →
              </div>
            </Link>
          </div>

          {/* Recent session */}
          {lastSession && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Last Interview</p>
              <Link
                href={`/dashboard/${lastSession.id}`}
                className="group flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 p-4 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-blue-500 font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {lastSession.job_role || "Technical Interview"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(lastSession.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {lastSession.score}<span className="text-[10px] text-slate-400">/10</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          )}

          {/* Nudge if no sessions */}
          {!statsLoading && totalInterviews === 0 && (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No interviews yet</p>
              <p className="text-xs text-slate-400 mt-1">Start your first mock interview to see your stats here.</p>
            </div>
          )}

          {/* Motivational nudge if has sessions */}
          {!statsLoading && totalInterviews > 0 && (
            <p className="text-center text-xs text-slate-400 mt-6">
              {totalInterviews === 1
                ? "Great start! Complete more interviews to track your progress."
                : `You've completed ${totalInterviews} interview${totalInterviews > 1 ? "s" : ""}. Keep pushing! 🚀`}
            </p>
          )}
          <p className="text-center text-xs text-slate-400 mt-6">© 2026 HirePrep AI • Built by Naman Sharma</p>
        </div>
      )}
    </div>
  );
}