"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import QRCode from "qrcode";
import { getOfficeUrl } from "@/lib/utils";
import type { DaySchedule } from "@/lib/types";

const L: Record<string, Record<string, string>> = {
  en: {
    back: "Back", title: "Settings", name: "Organization Name", limit: "Daily Limit",
    services: "Services", add: "Add Service",
    schedule: "Weekly Schedule", closed: "Closed",
    qr: "QR Code", dl: "Download QR", saved: "Saved!", saving: "Saving...", save: "Update",
    loading: "Loading...", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
    public: "Show in public directory",
    publicDesc: "Let people find your organization and join the queue without a code",
  },
  hi: {
    back: "वापस", title: "सेटिंग्स", name: "संगठन का नाम", limit: "दैनिक सीमा",
    services: "सेवाएं", add: "सेवा जोड़ें",
    schedule: "साप्ताहिक समय", closed: "बंद",
    qr: "QR कोड", dl: "QR डाउनलोड", saved: "सहेजा गया!", saving: "सहेज रहा है...", save: "अपडेट करें",
    loading: "लोड हो रहा है...", mon: "सोम", tue: "मंगल", wed: "बुध", thu: "गुरु", fri: "शुक्र", sat: "शनि", sun: "रवि",
    public: "डायरेक्टरी में दिखाएं",
    publicDesc: "लोग आपको खोजकर बिना कोड के कतार में शामिल हो सकें",
  },
};

interface Office {
  id: string; name: string; code: string; serviceTypes: string[]; dailyLimit: number;
  schedule: Record<string, DaySchedule | null>; public: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABEL_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_SCHEDULE = (): Record<string, DaySchedule | null> => ({
  Monday: { open: "09:00", close: "17:00" },
  Tuesday: { open: "09:00", close: "17:00" },
  Wednesday: { open: "09:00", close: "17:00" },
  Thursday: { open: "09:00", close: "17:00" },
  Friday: { open: "09:00", close: "17:00" },
  Saturday: null,
  Sunday: null,
});

export default function AdminSettingsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = (k: string) => L[lang][k] || k;
  const [office, setOffice] = useState<Office | null>(null);
  const [name, setName] = useState(""); const [limit, setLimit] = useState(100);
  const [services, setServices] = useState<string[]>(["General"]);
  const [schedule, setSchedule] = useState<Record<string, DaySchedule | null>>(DEFAULT_SCHEDULE());
  const [isPublic, setIsPublic] = useState(false);
  const [qr, setQr] = useState(""); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/admin/login"); return; }
    const load = async () => {
      const db = getDb()!;
      const snap = await getDocs(query(collection(db, "offices"), where("adminUid", "==", user.uid)));
      if (snap.empty) { router.push("/admin/register"); return; }
      const d = snap.docs[0];
      const data = d.data();
      const sched = data.schedule || DEFAULT_SCHEDULE();
      setOffice({ id: d.id, name: data.name, code: data.code, serviceTypes: data.serviceTypes || ["General"], dailyLimit: data.dailyLimit || 100, schedule: sched, public: data.public === true });
      setName(data.name); setLimit(data.dailyLimit || 100);
      setServices(data.serviceTypes || ["General"]); setSchedule(sched);
      setIsPublic(data.public === true);
      QRCode.toDataURL(getOfficeUrl(data.code), { width: 200, margin: 2 }).then(setQr);
    };
    load();
  }, [router, authLoading, user]);

  const save = async () => {
    if (!office) return; setSaving(true); setSaved(false);
    const openDays = DAYS.filter((day) => schedule[day] !== null);
    const firstOpenDay = openDays.find((day) => schedule[day]);
    const openTime = firstOpenDay ? schedule[firstOpenDay]?.open : "09:00";
    const closeTime = firstOpenDay ? schedule[firstOpenDay]?.close : "17:00";
    try {
      await updateDoc(doc(getDb()!, "offices", office.id), {
        name,
        dailyLimit: limit,
        serviceTypes: services,
        schedule,
        public: isPublic,
        openDays,
        openTime,
        closeTime,
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const toggleDay = (day: string) => {
    setSchedule(p => {
      const cur = p[day];
      if (cur === null) return { ...p, [day]: { open: "09:00", close: "17:00" } };
      return { ...p, [day]: null };
    });
  };

  const updateDayTime = (day: string, field: "open" | "close", val: string) => {
    setSchedule(p => {
      const cur = p[day];
      if (!cur) return p;
      return { ...p, [day]: { ...cur, [field]: val } };
    });
  };

  const addService = () => { const s = prompt("Service name:"); if (s && !services.includes(s)) setServices([...services, s]); };

  if (!office) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f2ed" }}>
      <div className="w-8 h-8 border-2 border-[#d6d3d1] border-t-[#1e1b4b] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-8" style={{ background: "#f5f2ed" }}>
      {/* HEADER */}
      <div className="bg-white px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/dashboard")} className="w-8 h-8 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[#78716c]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="font-semibold text-base text-[#1c1917]">{t("title")}</h1>
          </div>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="w-8 h-8 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[11px] font-bold text-[#78716c]">{lang === "en" ? "हि" : "EN"}</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-2 space-y-3">
        {/* NAME */}
        <div className="card">
          <label className="label">{t("name")}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* LIMIT */}
        <div className="card">
          <label className="label">{t("limit")}</label>
          <input type="number" className="input" value={limit} onChange={e => setLimit(Number(e.target.value))} min={1} max={1000} />
        </div>

        {/* PUBLIC TOGGLE */}
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1c1917]">{t("public")}</p>
              <p className="text-xs text-[#a8a29e] mt-0.5">{t("publicDesc")}</p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublic ? "bg-[#059669]" : "bg-[#d6d3d1]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        {/* SERVICES */}
        <div className="card">
          <label className="label">{t("services")}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {services.map(s => (
              <span key={s} className="bg-[#f5f2ed] text-[#44403c] px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5 font-medium">
                {s}
                <button onClick={() => setServices(services.filter(x => x !== s))} className="text-[#a8a29e] hover:text-[#dc2626] text-lg leading-none">×</button>
              </span>
            ))}
          </div>
          <button onClick={addService} className="text-sm text-[#d97706] font-medium min-h-[36px] flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#d97706]/10 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </span>
            {t("add")}
          </button>
        </div>

        {/* PER-DAY SCHEDULE */}
        <div className="card pb-3">
          <label className="label mb-3">{t("schedule")}</label>
          <div className="space-y-0.5">
            {DAYS.map((day, i) => {
              const daySchedule = schedule[day];
              const isClosed = daySchedule === null;
              return (
                <div key={day} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${isClosed ? "" : "bg-[#f5f2ed]/50"}`}>
                  <button
                    onClick={() => toggleDay(day)}
                    className={`text-sm font-semibold w-12 shrink-0 text-left transition-colors ${isClosed ? "text-[#a8a29e]" : "text-[#1c1917]"}`}
                  >
                    {t(DAY_LABEL_KEYS[i])}
                  </button>
                  <button
                    onClick={() => toggleDay(day)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isClosed ? "bg-[#d6d3d1]" : "bg-[#059669]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isClosed ? "" : "translate-x-4"}`} />
                  </button>
                  {isClosed ? (
                    <span className="text-xs text-[#a8a29e] font-medium ml-1">{t("closed")}</span>
                  ) : (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="time"
                        value={daySchedule!.open}
                        onChange={e => updateDayTime(day, "open", e.target.value)}
                        className="bg-white rounded-lg px-2 py-1.5 text-xs text-[#1c1917] font-medium border border-[#e7e5e4] focus:outline-none focus:ring-2 focus:ring-[#d97706]/30 w-[80px]"
                      />
                      <span className="text-[#a8a29e] text-xs">–</span>
                      <input
                        type="time"
                        value={daySchedule!.close}
                        onChange={e => updateDayTime(day, "close", e.target.value)}
                        className="bg-white rounded-lg px-2 py-1.5 text-xs text-[#1c1917] font-medium border border-[#e7e5e4] focus:outline-none focus:ring-2 focus:ring-[#d97706]/30 w-[80px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* QR */}
        {qr && (
          <div className="flex items-center gap-3 bg-white rounded-2xl p-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}>
            <img src={qr} alt="QR" className="w-12 h-12 rounded-xl border border-[#e7e5e4] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#a8a29e]">{t("qr")}</p>
              <p className="text-sm font-mono text-[#1c1917]">{office?.code}</p>
            </div>
            <button onClick={() => { const a = document.createElement('a'); a.download = `LineHai-${office.code}.png`; a.href = qr; a.click(); }} className="text-xs font-medium text-[#d97706] bg-[#d97706]/10 px-3 py-1.5 rounded-full shrink-0">
              {t("dl")}
            </button>
          </div>
        )}

        {/* SAVED ALERT */}
        {saved && (
          <div className="bg-[#059669]/10 border border-[#059669]/20 text-[#059669] px-4 py-3 rounded-xl text-sm text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            {t("saved")}
          </div>
        )}

        {/* SAVE */}
        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? (
            <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("saving")}</span>
          ) : t("save")}
        </button>
      </div>
    </div>
  );
}
