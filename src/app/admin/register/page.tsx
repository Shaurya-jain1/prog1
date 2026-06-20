"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithPassword } from "@/lib/auth";
import Link from "next/link";

const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const LANG: Record<string, Record<string, string>> = {
  en: { title: "Register Your Organization", phone: "Phone Number", password: "Password", confirm: "Confirm Password", register: "Register", invalid: "Enter a valid 10-digit phone", pwShort: "At least 6 characters", pwMismatch: "Passwords don't match", error: "Something went wrong", logging: "Creating account...", existing: "Phone already registered" },
  hi: { title: "अपना संगठन पंजीकृत करें", phone: "मोबाइल नंबर", password: "पासवर्ड", confirm: "पासवर्ड दोबारा दर्ज करें", register: "पंजीकरण", invalid: "10 अंकों का नंबर दर्ज करें", pwShort: "कम से कम 6 अक्षर", pwMismatch: "पासवर्ड मेल नहीं खाते", error: "कुछ गलत हो गया", logging: "खाता बना रहा है...", existing: "फ़ोन नंबर पहले से पंजीकृत है" },
};

export default function AdminRegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = LANG[lang];
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (phone.length !== 10) { setError(c.invalid); return; }
    if (password.length < 6) { setError(c.pwShort); return; }
    if (password !== confirm) { setError(c.pwMismatch); return; }
    setLoading(true);
    try {
      if (TEST_MODE) { router.push("/admin/onboard"); return; }
      await registerWithPassword(phone, password);
      router.push("/admin/onboard");
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/phone-already-exists" || code === "auth/email-already-exists") setError(c.existing);
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
            <Link href="/admin/register" className="glass-nav__link" style={{color:"var(--text-primary)",fontWeight:600}}>For business</Link>
          </div>
          <div className="glass-nav__right">
            <Link href="/admin/login" className="glass-btn-ghost" style={{height:40,padding:"0 20px",fontSize:13,textDecoration:"none"}}>Sign in</Link>
          </div>
        </div>
      </nav>

      <section style={{minHeight:"calc(100vh - 64px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",position:"relative",zIndex:1}}>
        <div className="glass-card glass-card--glow animate-fade-scale" style={{maxWidth:480,width:"100%",padding:40,borderRadius:"var(--radius-xl)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:24}}>
            <span style={{fontFamily:"var(--font-display-lg)",fontSize:22,fontWeight:400,color:"var(--text-primary)"}}>Line</span>
            <span style={{fontFamily:"var(--font-display-lg)",fontSize:22,fontWeight:700,color:"var(--color-accent)"}}>Hai?</span>
          </div>
          <h1 style={{fontFamily:"var(--font-display-lg)",fontSize:20,fontWeight:600,textAlign:"center",marginBottom:4,color:"var(--text-primary)"}}>{c.title}</h1>
          <p style={{fontSize:14,color:"var(--text-secondary)",textAlign:"center",marginBottom:24}}>Create an account to set up your queue.</p>

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
                <input type={showPw ? "text" : "password"} className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                <button className="glass-input__icon" onClick={() => setShowPw(!showPw)} type="button">
                  <i className={`ph ${showPw ? "ph-eye-slash" : "ph-eye"}`} />
                </button>
              </div>
            </div>
            <div>
              <label className="lg-label">{c.confirm}</label>
              <div className="glass-input__wrapper">
                <input type={showPw ? "text" : "password"} className="glass-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" onKeyDown={(e) => e.key==="Enter"&&handleRegister()} />
              </div>
            </div>
            <button className="glass-btn-primary glass-btn-primary--full" onClick={handleRegister} disabled={loading}>
              {loading ? <><span className="pulse-dot" style={{width:16,height:16}} /> {c.logging}</> : <>{c.register} <i className="ph ph-arrow-right" style={{fontSize:18}} /></>}
            </button>
            <p style={{textAlign:"center",fontSize:13,color:"var(--text-tertiary)",margin:0}}>
              Already have an account?{" "}<Link href="/admin/login" style={{color:"var(--color-accent)",textDecoration:"none"}}>Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
