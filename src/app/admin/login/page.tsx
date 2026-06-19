"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, signOut } from "@/lib/auth";
import { getDb } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Link from "next/link";

const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const LANG: Record<string, Record<string, string>> = {
  en: {
    title: "Sign In",
    phone: "Phone Number",
    password: "Password",
    signin: "Sign In",
    invalid: "Enter a 10-digit number",
    notFound: "Not registered",
    wrongPassword: "Wrong password",
    error: "Something went wrong",
    register: "Register",
    logging: "Signing in...",
    noOffice: "No organization found",
  },
  hi: {
    title: "साइन इन",
    phone: "मोबाइल नंबर",
    password: "पासवर्ड",
    signin: "साइन इन",
    invalid: "10 अंकों का नंबर दर्ज करें",
    notFound: "पंजीकृत नहीं है",
    wrongPassword: "गलत पासवर्ड",
    error: "कुछ गलत हो गया",
    register: "पंजीकरण",
    logging: "साइन इन कर रहा है...",
    noOffice: "कोई संगठन नहीं मिला",
  },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = LANG[lang];
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (phone.length !== 10) {
      setError(c.invalid);
      return;
    }
    setLoading(true);
    try {
      if (TEST_MODE) {
        router.push("/admin/dashboard");
        return;
      }
      const result = await loginWithPassword(phone, password);
      const uid = result.user.uid;
      const db = getDb();
      if (db) {
        const q = query(
          collection(db, "offices"),
          where("adminUid", "==", uid)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setError(c.notFound);
          signOut();
          setLoading(false);
          return;
        }
      }
      router.push("/admin/dashboard");
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError(c.notFound);
      } else if (code === "auth/wrong-password") {
        setError(c.wrongPassword);
      } else {
        setError(c.error);
      }
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f2ed" }}>
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e7e5e4]">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/logo.png" alt="LineHai?" className="w-7 h-7 rounded-md" />
            <span className="text-lg font-black tracking-tight text-[#1e1b4b]">LineHai?</span>
          </span>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">{lang === "en" ? "हि" : "EN"}</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="card">
            <div className="w-14 h-14 bg-[#f5f2ed] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>

            <h2 className="text-lg font-bold text-[#1c1917] text-center mb-5">{c.title}</h2>

            {error && (
              <div className="mb-4 bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-slide-down">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">{c.phone}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a8a29e] font-medium text-sm">+91</span>
                  <input
                    className="input !pl-14 tracking-widest font-bold text-center"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    type="tel"
                    inputMode="numeric"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              <div>
                <label className="label">{c.password}</label>
                <input
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  type="password"
                  onKeyDown={handleKeyDown}
                />
              </div>

              <button onClick={handleLogin} disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {c.logging}
                  </span>
                ) : c.signin}
              </button>

              <Link href="/admin/register" className="btn-outline w-full text-sm text-center block">{c.register}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
