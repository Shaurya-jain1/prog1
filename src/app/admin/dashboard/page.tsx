"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc, collection, query, where, limit, onSnapshot, updateDoc,
  setDoc, getDocs, writeBatch, Timestamp, runTransaction,
} from "firebase/firestore";
import QRCode from "qrcode";
import { getOfficeUrl, getTodayDayName, getTodayStr, normalizeCode } from "@/lib/utils";
import { encryptId } from "@/lib/crypto";
import Link from "next/link";
import type { DaySchedule } from "@/lib/types";

const LANG: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading...", now_serving: "Now Serving", call_next: "Call Next",
    total_tokens: "Issued", remaining: "Waiting", completed: "Served", avg_time: "Avg",
    next_5: "Next in Queue", no_waiting: "No waiting tokens", mark_absent: "Absent",
    mark_served: "Served", pause: "Pause", resume: "Resume",
    priority: "Priority", end_day: "End Day", reports: "Reports",
    settings: "Settings", logout: "Logout", paused: "Paused", closed: "Closed",
    priority_name: "Name:", priority_phone: "Phone (10 digits):",
    end_confirm: "End the day? No more tokens today.", rest: "waiting",
    next: "Next", no_office: "No organizations found", register: "Register",
    qr: "QR Code", share: "Share Link", copied: "Copied!",
    public: "Public", privateLabel: "Private",
    today: "Today", hours: "Hours", closed_today: "Closed today",
    settings_btn: "Settings", target: "Target", served_tokens: "Served",
    switch_office: "Switch queue", new_queue: "New Queue",
  },
  hi: {
    loading: "लोड हो रहा है...", now_serving: "अब सेवा", call_next: "अगला बुलाएं",
    total_tokens: "जारी", remaining: "प्रतीक्षा", completed: "सेवित", avg_time: "औसत",
    next_5: "अगली पंक्ति", no_waiting: "कोई प्रतीक्षा नहीं", mark_absent: "अनुपस्थित",
    mark_served: "सेवित", pause: "रोकें", resume: "जारी रखें",
    priority: "प्राथमिकता", end_day: "समाप्त करें", reports: "रिपोर्ट",
    settings: "सेटिंग्स", logout: "लॉगआउट", paused: "रुका", closed: "बंद",
    priority_name: "नाम:", priority_phone: "फोन (10 अंक):",
    end_confirm: "दिन समाप्त करें? आज और टोकन नहीं होंगे।", rest: "प्रतीक्षा",
    next: "अगला", no_office: "कोई संगठन नहीं", register: "पंजीकरण",
    qr: "QR कोड", share: "लिंक शेयर करें", copied: "कॉपी हो गया!",
    public: "सार्वजनिक",
    privateLabel: "निजी",
    today: "आज", hours: "समय", closed_today: "आज बंद है",
    settings_btn: "सेटिंग्स", target: "लक्ष्य", served_tokens: "सेवित",
    switch_office: "कतार बदलें", new_queue: "नई कतार",
  },
};

interface Office { id: string; name: string; code: string; adminPhone: string; serviceTypes: string[]; dailyLimit: number; public?: boolean; schedule?: Record<string, DaySchedule | null>; }
interface Token { id: string; number: number; name: string; phone: string; status: string; issuedAt: any; calledAt?: any; servedAt?: any; waitMinutes: number; serviceType?: string; }

export default function AdminDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = (k: string) => LANG[lang][k] || k;
  const [office, setOffice] = useState<Office | null>(null);
  const [allOffices, setAllOffices] = useState<Office[]>([]);
  const [officeDropdown, setOfficeDropdown] = useState(false);
  const [currentToken, setCurrentToken] = useState(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [totalIssued, setTotalIssued] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayQueueId, setTodayQueueId] = useState("");
  const [actionError, setActionError] = useState("");
  const [servingToken, setServingToken] = useState<Token | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/admin/login"); return; }
    const load = async () => {
      const db = getDb()!;
      let list: Office[];
      if (process.env.NEXT_PUBLIC_TEST_MODE === "true") {
        const snapshot = await getDocs(collection(db, "offices"));
        list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Office));
      } else {
        const q = query(collection(db, "offices"), where("adminUid", "==", user.uid));
        const snapshot = await getDocs(q);
        list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Office));
      }
      setAllOffices(list);
      if (list.length === 0) { router.push("/admin/onboard"); setLoading(false); return; }
      const o = list[0];
      setOffice(o);
      setIsPublic(o.public === true);
      QRCode.toDataURL(getOfficeUrl(o.code), { width: 200, margin: 2 }).then(setQrDataUrl);
      setLoading(false);
    };
    load();
  }, [router, authLoading, user]);

  const switchOffice = (id: string) => {
    const o = allOffices.find((o) => o.id === id);
    if (!o) return;
    setOffice(o);
    setIsPublic(o.public === true);
    setCurrentToken(0); setTokens([]); setIsPaused(false); setIsOpen(true);
    setTotalIssued(0); setTodayQueueId(""); setServingToken(null); setActionError("");
    QRCode.toDataURL(getOfficeUrl(o.code), { width: 200, margin: 2 }).then(setQrDataUrl);
    setOfficeDropdown(false);
  };

  useEffect(() => {
    if (!office) return;
    const db = getDb()!;
    const today = getTodayStr();
    const qId = `${office.id}_${today}`;
    setTodayQueueId(qId);
    const queueRef = doc(db, "queues", qId);
    const unsubQueue = onSnapshot(queueRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentToken(data.currentToken || 0);
        setIsPaused(data.isPaused || false);
        setIsOpen(data.isOpen !== false);
        setTotalIssued(data.totalIssued || 0);
      } else {
        setDoc(queueRef, { date: today, officeId: office.id, isOpen: true, isPaused: false, currentToken: 0, totalIssued: 0 });
      }
    });
    const tokensRef = collection(db, "queues", qId, "tokens");
    const unsubTokens = onSnapshot(tokensRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Token)).sort((a, b) => a.number - b.number);
      setTokens(list);
      const called = list.filter((t) => t.status === "called");
      setServingToken(called.length > 0 ? called[0] : null);
    });
    return () => { unsubQueue(); unsubTokens(); };
  }, [office]);

  const waiting = tokens.filter((t) => t.status === "waiting");
  const served = tokens.filter((t) => t.status === "served");
  const avgTime = served.length > 0 ? Math.round(served.reduce((a, t) => a + (t.waitMinutes || 0), 0) / served.length) : 0;
  const upcoming = waiting.slice(0, 5);

  const handleCallNext = useCallback(async () => {
    if (!office || actionLoading) return;
    setActionError("");
    setActionLoading(true);
    try {
      const db = getDb()!;
      const queueRef = doc(db, "queues", todayQueueId);
      const tokensRef = collection(db, "queues", todayQueueId, "tokens");
      const snapshot = await getDocs(query(tokensRef, where("status", "==", "waiting")));
      const waitingTokens = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Token)).sort((a, b) => a.number - b.number);
      if (waitingTokens.length > 0) {
        const tokenDoc = waitingTokens[0];
        const now = Timestamp.now();
        const batch = writeBatch(db);
        batch.update(doc(db, "queues", todayQueueId, "tokens", tokenDoc.id), { status: "called", calledAt: now });
        batch.update(queueRef, { currentToken: tokenDoc.number });
        await batch.commit();
        setCurrentToken(tokenDoc.number);
        setServingToken({ ...tokenDoc, status: "called", calledAt: now });
        setTokens((prev) => prev.map((t) => t.id === tokenDoc.id ? { ...t, status: "called", calledAt: now } : t));
      } else setActionError("No waiting tokens");
    } catch (err: any) { setActionError(err.message || "Error calling next"); }
    setActionLoading(false);
  }, [office, todayQueueId, actionLoading]);

  const handleMarkAbsent = useCallback(async () => {
    if (!office || actionLoading) return;
    setActionError(""); setActionLoading(true);
    try {
      const db = getDb()!;
      const q = query(collection(db, "queues", todayQueueId, "tokens"), where("status", "==", "called"), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0];
        await updateDoc(docRef.ref, { status: "absent" });
        setServingToken(null);
        setTokens((prev) => prev.map((t) => t.id === docRef.id ? { ...t, status: "absent" } : t));
      } else setActionError("No token being served");
    } catch (err: any) { setActionError(err.message || "Error"); }
    setActionLoading(false);
  }, [office, todayQueueId, actionLoading]);

  const handleMarkServed = useCallback(async () => {
    if (!office || actionLoading) return;
    setActionError(""); setActionLoading(true);
    try {
      const db = getDb()!;
      const q = query(collection(db, "queues", todayQueueId, "tokens"), where("status", "==", "called"), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0];
        const calledToken = snapshot.docs[0].data() as Token;
        const waitMinutes = Math.round((Timestamp.now().toMillis() - calledToken.issuedAt.toDate().getTime()) / 60000);
        await updateDoc(docRef.ref, { status: "served", servedAt: Timestamp.now(), waitMinutes });
        setServingToken(null);
        setTokens((prev) => prev.map((t) => t.id === docRef.id ? { ...t, status: "served", servedAt: Timestamp.now(), waitMinutes } : t));
      } else setActionError("No token being served");
    } catch (err: any) { setActionError(err.message || "Error"); }
    setActionLoading(false);
  }, [office, todayQueueId, actionLoading]);

  const handleTogglePause = useCallback(async () => {
    if (!office) return;
    setActionError("");
    try { await updateDoc(doc(getDb()!, "queues", todayQueueId), { isPaused: !isPaused }); }
    catch (err: any) { setActionError(err.message || "Error"); }
  }, [office, todayQueueId, isPaused]);

  const handlePriorityToken = useCallback(async () => {
    if (!office) return;
    const name = prompt(t("priority_name"));
    if (!name) return;
    const phone = prompt(t("priority_phone"));
    if (!phone || phone.length !== 10) return;
    setActionError(""); setActionLoading(true);
    try {
      const db = getDb()!;
      const queueRef = doc(db, "queues", todayQueueId);
      const tokenRef = doc(collection(db, "queues", todayQueueId, "tokens"));
      await runTransaction(db, async (transaction) => {
        const queueSnap = await transaction.get(queueRef);
        const qData = queueSnap.data();
        if (!qData) return;
        const tokenNumber = (qData.totalIssued || 0) + 1;
        transaction.set(tokenRef, { number: tokenNumber, name, phone: `+91${phone}`, serviceType: "Priority", status: "waiting", issuedAt: Timestamp.now(), waitMinutes: 0 });
        transaction.update(queueRef, { totalIssued: tokenNumber });
      });
    } catch (err: any) { setActionError(err.message || "Error"); }
    setActionLoading(false);
  }, [office, todayQueueId, t]);

  const handleEndDay = useCallback(async () => {
    if (!office) return;
    if (!confirm(t("end_confirm"))) return;
    setActionError("");
    try { await updateDoc(doc(getDb()!, "queues", todayQueueId), { isOpen: false }); setServingToken(null); }
    catch (err: any) { setActionError(err.message || "Error"); }
  }, [office, todayQueueId, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f2ed" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d6d3d1] border-t-[#1e1b4b] rounded-full animate-spin" />
          <p className="text-sm text-[#78716c]">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const todayLabel = getTodayDayName();
  const todaySchedule = office?.schedule?.[todayLabel];
  const isClosedToday = todaySchedule === null || todaySchedule === undefined;
  const progressPct = office && office.dailyLimit > 0 ? Math.min((totalIssued / office.dailyLimit) * 100, 100) : 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f5f2ed" }}>
      {/* HEADER */}
      <div className="bg-white px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#1e1b4b] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <div className="min-w-0">
                {allOffices.length > 1 ? (
                  <div className="relative">
                    <button
                      onClick={() => setOfficeDropdown(!officeDropdown)}
                      className="flex items-center gap-1.5 hover:opacity-80"
                    >
                      <h1 className="font-semibold text-sm text-[#1c1917] truncate max-w-[160px]">{office?.name}</h1>
                      <svg className="w-3.5 h-3.5 text-[#a8a29e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {officeDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOfficeDropdown(false)} />
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#e7e5e4] py-1 min-w-[200px] z-20">
                          <p className="px-3 py-1.5 text-[10px] font-semibold text-[#a8a29e] uppercase tracking-wider">{t("switch_office")}</p>
                          {allOffices.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => switchOffice(o.id)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f5f2ed] transition-colors ${o.id === office?.id ? "bg-[#f5f2ed] text-[#1e1b4b] font-semibold" : "text-[#78716c]"}`}
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${o.id === office?.id ? "bg-[#1e1b4b] text-white" : "bg-[#e7e5e4] text-[#a8a29e]"}`}>
                                {o.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate">{o.name}</p>
                                <p className="text-[10px] text-[#a8a29e] font-mono">{o.code}</p>
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-[#e7e5e4] mt-1 pt-1">
                            <Link href="/admin/onboard" className="flex items-center gap-2 px-3 py-2 text-sm text-[#d97706] hover:bg-[#f5f2ed] transition-colors">
                              <span className="w-5 h-5 rounded-md bg-[#d97706]/10 flex items-center justify-center text-xs">+</span>
                              {t("new_queue")}
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <h1 className="font-semibold text-sm text-[#1c1917]">{office?.name}</h1>
                )}
                <p className="text-[11px] text-[#a8a29e] font-mono">#{office?.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (!office) return;
                  const next = !isPublic;
                  try {
                    await updateDoc(doc(getDb()!, "offices", office.id), { public: next });
                    setIsPublic(next);
                  } catch {}
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isPublic ? "bg-[#059669]/10 text-[#059669]" : "bg-[#f5f2ed] text-[#a8a29e]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="w-7 h-7 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[11px] font-bold text-[#78716c]">{lang === "en" ? "हि" : "EN"}</button>
              <button onClick={() => router.push("/admin/settings")} className="w-7 h-7 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[#a8a29e]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button onClick={() => { signOut(); router.push("/admin/login"); }} className="w-7 h-7 rounded-lg bg-[#f5f2ed] flex items-center justify-center text-[#a8a29e]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPaused && <span className="badge bg-[#d97706]/10 text-[#d97706]"><span className="w-1.5 h-1.5 rounded-full bg-[#d97706] mr-1" />{t("paused")}</span>}
            {!isOpen && <span className="badge bg-[#dc2626]/10 text-[#dc2626]"><span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] mr-1" />{t("closed")}</span>}
            {isOpen && !isPaused && !isClosedToday && (
              <span className="badge bg-[#059669]/10 text-[#059669]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] mr-1" />
                {`${todaySchedule?.open ?? "--:--"} – ${todaySchedule?.close ?? "--:--"}`}
              </span>
            )}
            {isOpen && !isPaused && isClosedToday && (
              <span className="badge bg-[#dc2626]/10 text-[#dc2626]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] mr-1" />{t("closed_today")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-2 space-y-3">
        {actionError && (
          <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {actionError}
          </div>
        )}

        {!office ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-[#f5f2ed] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#a8a29e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-[#78716c] text-sm mb-4">{t("no_office")}</p>
            <Link href="/admin/onboard" className="btn-primary">{t("register")}</Link>
          </div>
        ) : (
          <>
            {/* NOW SERVING */}
            <div className={`card pb-4 ${servingToken ? "ring-2 ring-[#d97706]/30" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider">{t("now_serving")}</p>
                {!servingToken && currentToken > 0 && (
                  <span className="text-[10px] font-medium text-[#d97706] bg-[#d97706]/10 px-2 py-0.5 rounded-full">{t("call_next")} →</span>
                )}
              </div>
              <p className="token-display text-center">{servingToken ? servingToken.number : (currentToken || "—")}</p>
              {servingToken ? (
                <div className="text-center mt-2 mb-4">
                  <p className="text-[#1c1917] font-semibold text-base">{servingToken.name}</p>
                  {servingToken.calledAt && (
                    <p className="text-xs text-[#a8a29e] mt-0.5">
                      ⏱ {servingToken.calledAt?.toDate?.().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={handleMarkServed} disabled={actionLoading} className="btn-primary !bg-[#059669] hover:!bg-[#047857] !min-h-[44px] !text-sm shadow-md shadow-[#059669]/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {t("mark_served")}
                    </button>
                    <button onClick={handleMarkAbsent} disabled={actionLoading} className="btn-outline !border-[#dc2626]/30 !text-[#dc2626] hover:!bg-[#dc2626]/5 !min-h-[44px] !text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      {t("mark_absent")}
                    </button>
                  </div>
                </div>
              ) : currentToken === 0 ? (
                <p className="text-center text-sm text-[#a8a29e] mt-2">{t("no_waiting")}</p>
              ) : null}
            </div>

            {/* CALL NEXT */}
            {!servingToken && (
              <button
                onClick={handleCallNext}
                disabled={actionLoading || !isOpen || isPaused}
                className="btn-primary w-full text-base"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    {t("call_next")}
                  </span>
                )}
              </button>
            )}

            {/* STATS + PROGRESS */}
            <div className="card pb-4">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: t("total_tokens"), value: totalIssued, color: "text-[#1e1b4b]" },
                  { label: t("target"), value: office.dailyLimit ?? "—", color: "text-[#78716c]" },
                  { label: t("remaining"), value: waiting.length, color: "text-[#d97706]" },
                  { label: t("served_tokens"), value: served.length, color: "text-[#059669]" },
                  { label: t("avg_time"), value: `${avgTime}m`, color: "text-[#78716c]" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9px] text-[#a8a29e] font-medium uppercase tracking-wider mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-[#f5f2ed] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #1e1b4b, #d97706)" }} />
              </div>
            </div>

            {/* QUEUE */}
            <div className="card pb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#1c1917]">{t("next_5")}</h2>
                <div className="flex items-center gap-2">
                  {qrDataUrl && (
                    <button
                      onClick={() => {
                        if (!office) return;
                        const url = getOfficeUrl(office.code);
                        if (navigator.share) {
                          navigator.share({ title: office.name, url });
                        } else {
                          navigator.clipboard.writeText(url);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="text-[10px] text-[#d97706] bg-[#d97706]/10 px-2 py-1 rounded-full font-medium flex items-center gap-1"
                    >
                      {copied ? (
                        <>{t("copied")}</>
                      ) : (
                        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>{t("share")}</>
                      )}
                    </button>
                  )}
                  <span className="text-xs text-[#a8a29e]">{waiting.length > 0 ? `${waiting.length} ${t("rest")}` : ""}</span>
                </div>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-[#f5f2ed] rounded-xl flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-[#d6d3d1]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm text-[#a8a29e]">{t("no_waiting")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {upcoming.map((tkn, i) => (
                    <div key={tkn.id} className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      i === 0 ? "bg-[#d97706]/5 border border-[#d97706]/10" : "hover:bg-[#f5f2ed]"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-[#1e1b4b] text-white" : "bg-[#f5f2ed] text-[#78716c]"
                        }`}>{tkn.number}</span>
                        <div>
                          <p className="text-sm font-medium text-[#1c1917]">{tkn.name}</p>
                          <p className="text-[11px] text-[#a8a29e]">
                            {tkn.issuedAt?.toDate?.().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || ""}
                            {tkn.serviceType === "Priority" && <span className="ml-1.5 text-[9px] text-[#d97706] bg-[#d97706]/10 px-1.5 py-0.5 rounded-full">{lang === "hi" ? "प्राथमिकता" : "Priority"}</span>}
                          </p>
                        </div>
                      </div>
                      {i === 0 && <span className="text-[10px] font-semibold text-[#d97706] bg-[#d97706]/10 px-2 py-1 rounded-full">{t("next")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QR CARD */}
            {qrDataUrl && (
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}>
                <img src={qrDataUrl} alt="QR" className="w-10 h-10 rounded-lg border border-[#e7e5e4] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#a8a29e]">{t("qr")}</p>
                  <p className="text-sm font-mono text-[#1c1917]">{office?.code}</p>
                </div>
                <button
                  onClick={() => {
                    if (!office) return;
                    const url = getOfficeUrl(office.code);
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs font-medium text-[#d97706] bg-[#d97706]/10 px-3 py-1.5 rounded-full"
                >
                  {copied ? t("copied") : t("share")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e7e5e4] z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {[
            {
              icon: isPaused
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              label: isPaused ? t("resume") : t("pause"),
              onClick: handleTogglePause,
              disabled: !isOpen,
              active: isPaused,
            },
            {
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
              label: t("priority"),
              onClick: handlePriorityToken,
              disabled: actionLoading || !isOpen,
            },
            {
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>,
              label: t("end_day"),
              onClick: handleEndDay,
              disabled: !isOpen,
            },
            {
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              label: t("reports"),
              onClick: () => router.push("/admin/reports"),
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl transition-colors disabled:opacity-30 ${
                item.active ? "text-[#d97706]" : "text-[#78716c] hover:text-[#1c1917]"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
