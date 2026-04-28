"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 1. Check current session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getSession();

    // 2. Listen for login/logout changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push("/");
//   };
  
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // line that forces the account selector
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
        redirectTo: window.location.origin, // Returns to your home page
      },
    });
  };

  const handleLogout = async () => {
    try {
      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Force redirect to home page
      // Using window.location.href is safer for Auth transitions
      window.location.href = "/"; 
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-black text-slate-900 dark:text-white">
            AlgoHack<span className="text-blue-500">AI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm ${pathname === "/" ? "text-blue-500 font-bold" : "text-slate-500 dark:text-slate-400"}`}>
              Home
            </Link>
            {/* ✅ Dashboard link now appears correctly when logged in */}
            {user && (
              <Link href="/dashboard" className={`text-sm ${pathname.startsWith("/dashboard") ? "text-blue-500 font-bold" : "text-slate-500 dark:text-slate-400"}`}>
                Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/interview" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                New Interview
              </Link>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-500">
                Logout
              </button>
            </div>
          ) : (
             /* ✅ Only shows if user is null. Note: Ensure you have an 'auth' or 'login' page! */
            <button onClick={handleLogin} className="text-xs text-slate-500 hover:text-red-500">
                Login
              </button>
          )}
        </div>
      </div>
    </nav>
  );
}