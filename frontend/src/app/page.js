"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import supabase from "@/lib/supabaseClient";
import { saveAnswer } from "@/lib/api";

import AuthSection from "@/components/AuthSection";
import ActionSection from "@/components/ActionSection";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user || null);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">AI Interview App</h1>

      {/* 🔐 Auth Section */}
      <AuthSection
        user={user}
        login={loginWithGoogle}
        logout={logout}
      />

      {/* 🔥 Only show after login */}
      {user && (
        <>
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-purple-500 text-white rounded"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/interview"
            className="px-6 py-2 bg-green-500 text-white rounded"
          >
            Start Interview
          </Link>

        </>
      )}
    </div>
  );
}