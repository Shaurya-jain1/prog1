"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, signOut } from "@/lib/auth";
import { getDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const LANG: Record<string, Record<string, string>> = {
  en: { title: "Sign In", phone: "Phone Number", password: "Password", signin: "Sign In", invalid: "Enter a 10-digit number", notFound: "Not registered", wrongPassword: "Wrong password", error: "Something went wrong", register: "Register", logging: "Signing in...", noOffice: "No organization found" },
  hi: { title: "साइन इन", phone: "मोबाइल नंबर", password: "पासवर्ड", signin: "साइन इन", invalid: "10 अंकों का नंबर दर्ज करें", notFound: "पंजीकृत नहीं है", wrongPassword: "गलत पासवर्ड", error: "कुछ गलत हो गया", register: "पंजीकरण", logging: "साइन इन कर रहा है...", noOffice: "कोई संगठन नहीं मिला" },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = LANG[lang];
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (phone.length !== 10) { setError(c.invalid); return; }
    setLoading(true);
    try {
      if (TEST_MODE) { router.push("/admin/dashboard"); return; }
      const result = await loginWithPassword(phone, password);
      const uid = result.user.uid;
      const db = getDb();
      if (db) {
        const q = query(collection(db, "offices"), where("adminUid", "==", uid));
        const snap = await getDocs(q);
        if (snap.empty) { setError(c.notFound); signOut(); setLoading(false); return; }
      }
      router.push("/admin/dashboard");
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") setError(c.notFound);
      else if (code === "auth/wrong-password") setError(c.wrongPassword);
      else setError(c.error);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob--amber" />
        <div className="mesh-blob mesh-blob--violet" />
        <div className="mesh-blob mesh-blob--teal" />
      </div>

      <nav className="glass-nav">
        <div className="glass-nav__inner">
          <Link href="/" className="glass-nav__logo"><span className="glass-nav__logo-line">Line</span><span className="glass-nav__logo-hai">Hai?</span></Link>
          <div className="glass-nav__links">
            <Link href="/find" className="glass-nav__link">Find an org</Link>
            <Link href="/admin/register" className="glass-nav__link">For business</Link>
          </div>
          <div className="glass-nav__right">
            <Link href="/admin/login" className="glass-btn-ghost" style={{height:40,padding:"0 20px",fontSize:13,textDecoration:"none",color:"var(--text-primary)",fontWeight:600}}>Sign in</Link>
          </div>
        </div>
      </nav>

      <section style={{minHeight:"calc(100vh - 64px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",position:"relative",zIndex:1}}>
        <div className="glass-card glass-card--glow animate-fade-scale" style={{maxWidth:420,width:"100%",padding:40,borderRadius:"var(--radius-xl)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:24}}>
            <span style={{fontFamily:"var(--font-display-lg)",fontSize:22,fontWeight:400,color:"var(--text-primary)"}}>Line</span>
            <span style={{fontFamily:"var(--font-display-lg)",fontSize:22,fontWeight:700,color:"var(--color-accent)"}}>Hai?</span>
          </div>
          <h1 style={{fontFamily:"var(--font-display-lg)",fontSize:20,fontWeight:600,textAlign:"center",marginBottom:4,color:"var(--text-primary)"}}>{c.title}</h1>
          <p style={{fontSize:14,color:"var(--text-secondary)",textAlign:"center",marginBottom:24}}>Sign in to manage your organization's queue.</p>

          {error && (
            <div style={{marginBottom:16,padding:"12px 16px",borderRadius:"var(--radius-sm)",background:"rgba(255,69,58,0.15)",border:"1px solid rgba(255,69,58,0.25)",color:"#FF453A",fontSize:13,display:"flex",alignItems:"center",gap:8}}>
              <i className="ph ph-warning-circle" style={{fontSize:18,flexShrink:0}} /> {error}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <label className="lg-label">{c.phone}</label>
              <div className="glass-input__wrapper">
                <span className="glass-input__prefix">+91</span>
                <input type="tel" className="glass-input glass-input--phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="9876543210" maxLength={10} inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className="lg-label">{c.password}</label>
              <div className="glass-input__wrapper">
                <input type={showPw ? "text" : "password"} className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key==="Enter"&&handleLogin()} />
                <button className="glass-input__icon" onClick={() => setShowPw(!showPw)} type="button">
                  <i className={`ph ${showPw ? "ph-eye-slash" : "ph-eye"}`} />
                </button>
              </div>
            </div>
            <button className="glass-btn-primary glass-btn-primary--full" onClick={handleLogin} disabled={loading}>
              {loading ? <><span className="pulse-dot" style={{width:16,height:16}} /> {c.logging}</> : <>{c.signin} <i className="ph ph-arrow-right" style={{fontSize:18}} /></>}
            </button>
            <Link href="/admin/register" className="glass-btn-ghost glass-btn-ghost--full" style={{textDecoration:"none",fontSize:14}}>{c.register}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
