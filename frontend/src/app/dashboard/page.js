"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/");
        return;
      }

      setUser(userData.user);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/history/${userData.user.id}`
        );
        const history = await res.json();
        setSessions(history);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-slate-500 transition-colors duration-300">
        Loading interview history...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-border pb-6">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            {user && (
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                Account: {user.email}
              </p>
            )}
          </div>
          <button 
            onClick={() => router.push('/interview')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            New Interview
          </button>
        </header>

        {sessions.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
            <p className="text-slate-500 text-sm">No interview sessions found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                onClick={() => router.push(`/dashboard/${session.id}`)}
                className="group bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:border-blue-500/50 hover:bg-background transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* AI Badge using theme-aware border and bg */}
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-blue-500 font-bold text-xs border border-border">
                    AI
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-blue-500 transition-colors">
                      {session.job_role || "Technical Interview"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(session.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-lg font-black">
                      {session.score || 0}<span className="text-[10px] text-slate-500">/10</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Performance</span>
                  </div>
                  <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}