"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import type { DaySchedule } from "@/lib/types";
import { getTodayDayName } from "@/lib/utils";

const LANG: Record<string, Record<string, string>> = {
  en: {
    title: "Find an Organization",
    search: "Search by name, district, or city...",
    noResults: "No organizations found",
    loading: "Finding organizations...",
    join: "Join Queue",
    open: "Open",
    closed: "Closed",
    registerTitle: "Own a clinic or shop?",
    registerDesc: "List your organization on LineHai? and let people join your queue directly.",
    register: "Register Now",
  },
  hi: {
    title: "संगठन खोजें",
    search: "नाम, ज़िला या शहर से खोजें...",
    noResults: "कोई संगठन नहीं मिला",
    loading: "संगठन खोज रहा है...",
    join: "कतार में शामिल हों",
    open: "खुला",
    closed: "बंद",
    registerTitle: "आपकी क्लिनिक या दुकान है?",
    registerDesc: "अपने संगठन को LineHai? पर सूचीबद्ध करें और लोगों को सीधे कतार में शामिल होने दें।",
    register: "अभी पंजीकरण करें",
  },
};

interface Org {
  id: string;
  name: string;
  district: string;
  state: string;
  code: string;
  schedule?: Record<string, DaySchedule | null>;
  openDays: string[];
  openTime: string;
  closeTime: string;
}

export default function FindPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const c = LANG[lang];
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [query_, setQuery_] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const db = getDb();
      if (!db) return;
      const q = query(collection(db, "offices"), where("public", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Org));
      setOrgs(list);
      setLoading(false);
    };
    load();
  }, []);

  const todayName = getTodayDayName();
  const timeParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const currentMinutes = Number(timeParts.hour) * 60 + Number(timeParts.minute);

  const getTodayHours = (org: Org): DaySchedule | null => {
    if (org.schedule && Object.prototype.hasOwnProperty.call(org.schedule, todayName)) {
      return org.schedule[todayName];
    }
    if (!org.openDays?.includes(todayName)) return null;
    return {
      open: org.openTime || "09:00",
      close: org.closeTime || "17:00",
    };
  };

  const isOpenNow = (org: Org) => {
    const hours = getTodayHours(org);
    if (!hours) return false;
    const [oh, om] = hours.open.split(":").map(Number);
    const [ch, cm] = hours.close.split(":").map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    return currentMinutes >= openMins && currentMinutes < closeMins;
  };

  const filtered = orgs.filter((org) => {
    if (!query_.trim()) return true;
    const q = query_.toLowerCase();
    return (
      org.name?.toLowerCase().includes(q) ||
      org.district?.toLowerCase().includes(q) ||
      org.state?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen" style={{ background: "#f5f2ed" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e7e5e4]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <button onClick={() => router.push("/")} className="btn-ghost !min-h-[36px] !px-2 !rounded-xl">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <img src="/logo.png" alt="LineHai?" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-black tracking-tight text-[#1e1b4b]">LineHai?</span>
          </span>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">{lang === "en" ? "हि" : "EN"}</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-black text-[#1c1917] mb-2">{c.title}</h1>

        {/* SEARCH */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            className="input !pl-11"
            value={query_}
            onChange={(e) => setQuery_(e.target.value)}
            placeholder={c.search}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#78716c]">
              <div className="w-5 h-5 border-2 border-[#d6d3d1] border-t-[#1e1b4b] rounded-full animate-spin" />
              <span className="text-sm">{c.loading}</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-[#e7e5e4] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="text-sm text-[#78716c]">{c.noResults}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#a8a29e] font-medium">{filtered.length} {lang === "en" ? "organizations found" : "संगठन मिले"}</p>
            {filtered.map((org) => {
              const open = isOpenNow(org);
              const hours = getTodayHours(org);
              return (
                <div key={org.id} className="card flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#1c1917]">{org.name}</h3>
                    <p className="text-xs text-[#78716c] mt-0.5">
                      {org.district}, {org.state}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        open ? "bg-[#059669]/10 text-[#059669]" : "bg-[#dc2626]/10 text-[#dc2626]"
                      }`}>
                        {open ? c.open : c.closed}
                      </span>
                      <span className="text-[10px] text-[#a8a29e]">{hours ? `${hours.open} - ${hours.close}` : c.closed}</span>
                    </div>
                  </div>
                  <Link
                    href={`/q/${org.code}`}
                    className="btn-primary !min-h-[40px] !px-4 !text-sm shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    {c.join}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* REGISTER CTA */}
        <div className="mt-10 card-amber text-center">
          <div className="w-12 h-12 bg-[#d97706]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#d97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-base font-bold text-[#1c1917] mb-1">{c.registerTitle}</h3>
          <p className="text-sm text-[#78716c] mb-4 max-w-sm mx-auto">{c.registerDesc}</p>
          <Link href="/admin/register" className="btn-accent">{c.register}</Link>
        </div>
      </main>
    </div>
  );
}
