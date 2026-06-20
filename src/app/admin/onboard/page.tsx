"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { generateOfficeCode } from "@/lib/utils";
import Link from "next/link";

const LANG: Record<string, Record<string, string>> = {
  en: {
    title: "Create Your Queue", name: "Organization Name", district: "District", state: "State",
    phone: "Contact Phone", price: "Appointment Price (₹)", price_hint: "Leave 0 for free",
    submit: "Create Queue", creating: "Creating...", error: "Something went wrong",
    success: "Queue created! Code:", later: "I'll do this later",
  },
  hi: {
    title: "अपनी कतार बनाएं", name: "संगठन का नाम", district: "ज़िला", state: "राज्य",
    phone: "संपर्क फ़ोन", price: "अपॉइंटमेंट मूल्य (₹)", price_hint: "मुफ्त के लिए 0 छोड़ें",
    submit: "कतार बनाएं", creating: "बना रहा है...", error: "कुछ गलत हो गया",
    success: "कतार बन गई! कोड:", later: "बाद में करूंगा",
  },
};

export default function OnboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = LANG[lang];
  const [name, setName] = useState(""); const [district, setDistrict] = useState("");
  const [state_, setState] = useState(""); const [phone, setPhone] = useState("");
  const [appointmentPrice, setAppointmentPrice] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const { user } = useAuth();

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError(lang === "en" ? "Enter organization name" : "संगठन का नाम दर्ज करें"); return; }
    if (!user) { router.push("/admin/login"); return; }
    setLoading(true);
    try {
      const db = getDb()!;
      const code = generateOfficeCode(name.trim());
      const ref = doc(collection(db, "offices"));
      await setDoc(ref, {
        name: name.trim(), district: district.trim(), state: state_.trim(),
        adminPhone: phone.trim(), adminUid: user.uid, code, public: false,
        serviceTypes: ["General"], dailyLimit: 100,
        appointmentPrice: appointmentPrice ? Number(appointmentPrice) : 0,
        schedule: { Monday: { open: "09:00", close: "17:00" }, Tuesday: { open: "09:00", close: "17:00" }, Wednesday: { open: "09:00", close: "17:00" }, Thursday: { open: "09:00", close: "17:00" }, Friday: { open: "09:00", close: "17:00" }, Saturday: null, Sunday: null },
        openDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        openTime: "09:00", closeTime: "17:00", createdAt: serverTimestamp(),
      });
      setCreatedCode(code);
    } catch { setError(c.error); }
    setLoading(false);
  };

  if (createdCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f5f2ed" }}>
        <div className="card text-center py-12 max-w-sm w-full">
          <div className="w-14 h-14 bg-[#059669]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm text-[#78716c] font-medium mb-1">{c.success}</p>
          <p className="text-2xl font-black text-[#1e1b4b] tracking-widest font-mono mb-6">{createdCode}</p>
          <button onClick={() => router.push("/admin/dashboard")} className="btn-primary w-full">{lang === "en" ? "Go to Dashboard" : "डैशबोर्ड पर जाएं"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f5f2ed" }}>
      <div className="card max-w-sm w-full py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-black text-[#1c1917]">{c.title}</h1>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost text-xs">{lang === "en" ? "हि" : "EN"}</button>
        </div>

        {error && <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}

        <div className="space-y-4">
          <div><label className="label">{c.name}</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Apollo Clinic" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">{c.district}</label><input className="input" value={district} onChange={e => setDistrict(e.target.value)} placeholder="South Delhi" /></div>
            <div><label className="label">{c.state}</label><input className="input" value={state_} onChange={e => setState(e.target.value)} placeholder="Delhi" /></div>
          </div>
          <div><label className="label">{c.phone}</label><input className="input" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" type="tel" /></div>
          <div><label className="label">{c.price} <span style={{fontWeight:400,color:"#a8a29e",fontSize:12}}>({c.price_hint})</span></label><input className="input" value={appointmentPrice} onChange={e => setAppointmentPrice(e.target.value.replace(/\D/g, ""))} placeholder="0" type="tel" inputMode="numeric" /></div>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
            {loading ? <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{c.creating}</span> : c.submit}
          </button>
          <Link href="/admin/dashboard" className="block text-center text-sm text-[#a8a29e] hover:text-[#78716c]">{c.later}</Link>
        </div>
      </div>
    </div>
  );
}
