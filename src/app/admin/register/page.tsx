"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { registerWithPassword } from "@/lib/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { getOfficeUrl } from "@/lib/utils";

const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const LANG: Record<string, Record<string, string>> = {
  en: {
    title: "Register Your Organization",
    name: "Your Name",
    office: "Organization Name",
    district: "District",
    state: "State",
    phone: "Phone Number",
    password: "Set Password",
    create: "Create Organization",
    fill: "Please fill in all fields",
    invalidPhone: "Please enter a 10-digit phone number",
    shortPassword: "Password must be at least 6 characters",
    error: "Something went wrong",
    creating: "Creating...",
    success: "Registered!",
    successDesc:
      "Your organization is now live. Share the QR code below to let people join the queue.",
    code: "Organization Code",
    download: "Download QR",
    whatsapp: "Share on WhatsApp",
    dashboard: "Go to Dashboard",
    public: "Show in public directory",
    publicDesc: "Let people find your organization and join without a code",
  },
  hi: {
    title: "अपना संगठन पंजीकृत करें",
    name: "आपका नाम",
    office: "संगठन का नाम",
    district: "ज़िला",
    state: "राज्य",
    phone: "मोबाइल नंबर",
    password: "पासवर्ड सेट करें",
    create: "संगठन बनाएं",
    fill: "कृपया सभी फील्ड भरें",
    invalidPhone: "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें",
    shortPassword: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए",
    error: "कुछ गलत हो गया",
    creating: "बना रहा है...",
    success: "पंजीकृत!",
    successDesc:
      "आपका संगठन अब लाइव है। नीचे QR कोड शेयर करें ताकि लोग कतार में शामिल हो सकें।",
    code: "संगठन कोड",
    download: "QR डाउनलोड करें",
    whatsapp: "WhatsApp पर शेयर करें",
    dashboard: "डैशबोर्ड पर जाएं",
  },
};

type Lang = "en" | "hi";

const DEFAULT_SCHEDULE = {
  Monday: { open: "09:00", close: "17:00" },
  Tuesday: { open: "09:00", close: "17:00" },
  Wednesday: { open: "09:00", close: "17:00" },
  Thursday: { open: "09:00", close: "17:00" },
  Friday: { open: "09:00", close: "17:00" },
  Saturday: null,
  Sunday: null,
};

function Confetti() {
  useEffect(() => {
    const colors = [
      "#1e1b4b", "#d97706", "#059669",
      "#dc2626", "#78716c", "#f5f2ed",
    ];
    const pieces: HTMLDivElement[] = [];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "%";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = Math.random() * 6 + 3 + "px";
      el.style.height = Math.random() * 6 + 3 + "px";
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      el.style.animationDuration = Math.random() * 2 + 2 + "s";
      el.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(el);
      pieces.push(el);
    }
    return () => pieces.forEach((p) => p.remove());
  }, []);
  return null;
}

export default function AdminRegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const content = LANG[lang];
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [officeCode, setOfficeCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [done, setDone] = useState(false);

  const generateCode = (name: string) => {
    const prefix =
      name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "ORG";
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${suffix}`;
  };

  const handleRegister = async () => {
    setError("");
    if (!name || !officeName || !district || !stateName) {
      setError(content.fill);
      return;
    }
    if (phone.length !== 10) {
      setError(content.invalidPhone);
      return;
    }
    if (!TEST_MODE && password.length < 6) {
      setError(content.shortPassword);
      return;
    }
    setLoading(true);
    try {
      const code = generateCode(officeName);
      const db = getDb()!;

      let adminUid = "test-uid";
      if (!TEST_MODE) {
        const result = await registerWithPassword(phone, password);
        adminUid = result.user.uid;
      }

      const officeRef = doc(collection(db, "offices"));
      await setDoc(officeRef, {
        name: officeName,
        district,
        state: stateName,
        code,
        adminPhone: `+91${phone}`,
        adminUid,
        public: isPublic,
        serviceTypes: ["General"],
        dailyLimit: 100,
        schedule: DEFAULT_SCHEDULE,
        openDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        openTime: "09:00",
        closeTime: "17:00",
        createdAt: serverTimestamp(),
      });

      setOfficeCode(code);
      const qr = await QRCode.toDataURL(getOfficeUrl(code), {
        width: 280,
        margin: 2,
      });
      setQrDataUrl(qr);
      setShowConfetti(true);
      setDone(true);
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/email-already-in-use") {
        setError("This phone is already registered. Try signing in.");
      } else {
        setError(content.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f2ed" }}>
      {showConfetti && <Confetti />}

      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e7e5e4]">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/logo.png" alt="LineHai?" className="w-7 h-7 rounded-md" />
            <span className="text-lg font-black tracking-tight text-[#1e1b4b]">LineHai?</span>
          </span>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">
            {lang === "en" ? "हि" : "EN"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {!done && (
            <div className="animate-slide-up">
              <div className="card">
                <h2 className="text-lg font-bold text-[#1c1917] mb-5">{content.title}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">{content.name}</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" />
                  </div>
                  <div>
                    <label className="label">{content.office}</label>
                    <input className="input" value={officeName} onChange={(e) => setOfficeName(e.target.value)} placeholder="City Hospital, Delhi" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">{content.district}</label>
                      <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Jaipur" />
                    </div>
                    <div>
                      <label className="label">{content.state}</label>
                      <input className="input" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Rajasthan" />
                    </div>
                  </div>
                  <div>
                    <label className="label">{content.phone}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a8a29e] font-medium text-sm">+91</span>
                      <input
                        className="input !pl-14 tracking-widest font-bold"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        maxLength={10}
                        type="tel"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  {/* PUBLIC TOGGLE */}
                  <div className="bg-[#f5f2ed] rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1c1917]">{content.public}</p>
                        <p className="text-xs text-[#a8a29e] mt-0.5">{content.publicDesc}</p>
                      </div>
                      <button
                        onClick={() => setIsPublic(!isPublic)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublic ? "bg-[#059669]" : "bg-[#d6d3d1]"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {!TEST_MODE && (
                    <div>
                      <label className="label">{content.password}</label>
                      <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <div className="mt-4 bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-slide-down">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}
              <button onClick={handleRegister} disabled={loading} className="btn-primary w-full mt-5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {content.creating}
                  </span>
                ) : content.create}
              </button>
            </div>
          )}

          {done && (
            <div className="animate-scale-in text-center">
              <div className="card">
                <div className="py-4">
                  <div className="w-16 h-16 bg-[#059669]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-xl font-black text-[#1c1917] mb-2">{content.success}</h2>
                  <p className="text-sm text-[#a8a29e] mb-5">{content.successDesc}</p>

                  <div className="bg-[#f5f2ed] rounded-xl p-4 mb-5">
                    <p className="text-xs text-[#a8a29e] font-medium mb-1">{content.code}</p>
                    <p className="text-2xl font-black tracking-[0.15em] text-[#1c1917] select-all">{officeCode}</p>
                  </div>

                  {qrDataUrl && (
                    <div className="mb-5">
                      <div className="bg-white rounded-xl p-3 inline-block border border-[#e7e5e4]">
                        <img src={qrDataUrl} alt="QR" className="w-36 h-36 mx-auto" />
                      </div>
                      <p className="text-xs text-[#a8a29e] mt-1 font-mono">{getOfficeUrl(officeCode).replace("https://", "")}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.download = `LineHai-${officeCode}.png`;
                        a.href = qrDataUrl;
                        a.click();
                      }}
                      className="btn-primary w-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {content.download}
                    </button>
                    <button
                      onClick={() => {
                        const msg = `Join our queue at ${officeName}. Visit: ${getOfficeUrl(officeCode)}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                      className="btn-accent w-full"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      {content.whatsapp}
                    </button>
                    <button onClick={() => router.push("/admin/dashboard")} className="btn-outline w-full">
                      {content.dashboard}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
