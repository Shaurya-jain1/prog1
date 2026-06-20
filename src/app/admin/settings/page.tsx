"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { migrateOfficeCodes } from "@/lib/firestore";
import QRCode from "qrcode";
import { getOfficeUrl } from "@/lib/utils";
import Link from "next/link";
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
    switch_office: "Switch queue", add_queue: "Add New Queue",
    migrate: "Fix old codes", migrate_done: "Fixed {n} codes",
  },
  hi: {
    back: "वापस", title: "सेटिंग्स", name: "संगठन का नाम", limit: "दैनिक सीमा",
    services: "सेवाएं", add: "सेवा जोड़ें",
    schedule: "साप्ताहिक समय", closed: "बंद",
    qr: "QR कोड", dl: "QR डाउनलोड", saved: "सहेजा गया!", saving: "सहेज रहा है...", save: "अपडेट करें",
    loading: "लोड हो रहा है...", mon: "सोम", tue: "मंगल", wed: "बुध", thu: "गुरु", fri: "शुक्र", sat: "शनि", sun: "रवि",
    public: "डायरेक्टरी में दिखाएं",
    publicDesc: "लोग आपको खोजकर बिना कोड के कतार में शामिल हो सकें",
    switch_office: "कतार बदलें", add_queue: "नई कतार जोड़ें",
    migrate: "पुराने कोड ठीक करें", migrate_done: "{n} कोड ठीक हुए",
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
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeIdx, setOfficeIdx] = useState(0);
  const [office, setOffice] = useState<Office | null>(null);
  const [name, setName] = useState(""); const [limit, setLimit] = useState(100);
  const [services, setServices] = useState<string[]>(["General"]);
  const [schedule, setSchedule] = useState<Record<string, DaySchedule | null>>(DEFAULT_SCHEDULE());
  const [isPublic, setIsPublic] = useState(false);
  const [qr, setQr] = useState(""); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [migrating, setMigrating] = useState(false); const [migrateMsg, setMigrateMsg] = useState("");

  const { user, loading: authLoading } = useAuth();

  const loadOffice = async (idx: number, list?: Office[]) => {
    const db = getDb()!;
    if (!list) {
      const snap = await getDocs(query(collection(db, "offices"), where("adminUid", "==", user!.uid)));
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Office));
      setOffices(list);
    }
    if (list.length === 0) { router.push("/admin/onboard"); return; }
    const idx2 = Math.min(idx, list.length - 1);
    const d = list[idx2];
    const sched = d.schedule || DEFAULT_SCHEDULE();
    setOfficeIdx(idx2);
    setOffice({ id: d.id, name: d.name, code: d.code, serviceTypes: d.serviceTypes || ["General"], dailyLimit: d.dailyLimit || 100, schedule: sched, public: d.public === true });
    setName(d.name); setLimit(d.dailyLimit || 100);
    setServices(d.serviceTypes || ["General"]); setSchedule(sched);
    setIsPublic(d.public === true);
    QRCode.toDataURL(getOfficeUrl(d.code), { width: 200, margin: 2 }).then(setQr);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/admin/login"); return; }
    loadOffice(0);
  }, [router, authLoading, user]);

  const switchOffice = (n: number) => loadOffice(n);

  const save = async () => {
    if (!office) return; setSaving(true); setSaved(false);
    const openDays = DAYS.filter((day) => schedule[day] !== null);
    const firstOpenDay = openDays.find((day) => schedule[day]);
    const openTime = firstOpenDay ? schedule[firstOpenDay]?.open : "09:00";
    const closeTime = firstOpenDay ? schedule[firstOpenDay]?.close : "17:00";
    try {
      await updateDoc(doc(getDb()!, "offices", office.id), {
        name, dailyLimit: limit, serviceTypes: services, schedule, public: isPublic,
        openDays, openTime, closeTime,
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

  const handleMigrate = async () => {
    setMigrating(true); setMigrateMsg("");
    try {
      const n = await migrateOfficeCodes();
      setMigrateMsg(t("migrate_done").replace("{n}", String(n)));
      setTimeout(() => setMigrateMsg(""), 3000);
    } catch { setMigrateMsg("Error"); }
    setMigrating(false);
  };

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
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/admin/dashboard")} className="w-8 h-8 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[#78716c] shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              {offices.length > 1 ? (
                <div className="flex items-center gap-1.5">
                  <h1 className="font-semibold text-base text-[#1c1917]">{office.name}</h1>
                </div>
              ) : (
                <h1 className="font-semibold text-base text-[#1c1917]">{t("title")}</h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {offices.length > 1 && (
              <div className="flex items-center gap-0.5 mr-1">
                {offices.map((o, i) => (
                  <button
                    key={o.id}
                    onClick={() => switchOffice(i)}
                    className={`w-6 h-6 rounded-md text-[9px] font-bold transition-colors ${i === officeIdx ? "bg-[#1e1b4b] text-white" : "bg-[#f5f2ed] text-[#a8a29e] hover:text-[#78716c]"}`}
                  >
                    {o.name.charAt(0)}
                  </button>
                ))}
              </div>
            )}
            <Link href="/admin/onboard" className="w-8 h-8 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[#a8a29e] hover:text-[#78716c]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </Link>
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="w-8 h-8 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[11px] font-bold text-[#78716c]">{lang === "en" ? "हि" : "EN"}</button>
          </div>
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

        {/* MIGRATE OLD CODES */}
        <button onClick={handleMigrate} disabled={migrating} className="btn-outline w-full !border-[#d97706]/30 !text-[#d97706] hover:!bg-[#d97706]/5 text-sm flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {migrating ? "..." : t("migrate")}
        </button>
        {migrateMsg && (
          <div className="bg-[#059669]/10 border border-[#059669]/20 text-[#059669] px-4 py-3 rounded-xl text-sm text-center">{migrateMsg}</div>
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
