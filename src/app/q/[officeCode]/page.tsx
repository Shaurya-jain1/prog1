"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { doc, collection, query, where, getDocs, updateDoc, onSnapshot, Timestamp, runTransaction } from "firebase/firestore";
import { getTodayStr } from "@/lib/utils";

const L: Record<string, Record<string, string>> = {
  en: { title: "Join Queue", now: "Now Serving", today: "Today", name: "Your Name", phone: "Phone", get: "Get Token", send: "Issuing...", your: "Your Token", pos: "Position", wait: "Est. Wait", min: "min", leave: "Track your turn live. We'll notify you when it's near.", cancel: "Cancel", view: "View Status", err_name: "Enter your name", err_phone: "Enter 10-digit phone", err_closed: "Queue is closed", err_paused: "Queue is paused", err_limit: "Limit reached today", err_generic: "Error", notFound: "Organization not found", notFoundDesc: "This code is not valid", loading: "Loading..." },
  hi: { title: "कतार में शामिल हों", now: "अब सेवा", today: "आज", name: "आपका नाम", phone: "मोबाइल", get: "टोकन लें", send: "जारी कर रहा है...", your: "आपका टोकन", pos: "स्थिति", wait: "अनुमानित प्रतीक्षा", min: "मिनट", leave: "अपनी बारी लाइव ट्रैक करें। हम सूचित करेंगे।", cancel: "रद्द करें", view: "स्थिति देखें", err_name: "अपना नाम दर्ज करें", err_phone: "10 अंकों का नंबर दर्ज करें", err_closed: "कतार बंद है", err_paused: "कतार रोक दी गई है", err_limit: "आज की सीमा पूरी", err_generic: "त्रुटि", notFound: "संगठन नहीं मिला", notFoundDesc: "यह कोड मान्य नहीं है", loading: "लोड हो रहा है..." },
};

interface Office { id: string; name: string; code: string; district: string; state: string; dailyLimit: number; serviceTypes: string[]; }
interface QueueData { isOpen: boolean; isPaused: boolean; currentToken: number; totalIssued: number; }
interface Token { id: string; number: number; name: string; status: string; issuedAt: any; }

export default function QueueJoinPage() {
  const params = useParams();
  const code = params.officeCode as string;
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = (k: string) => L[lang][k] || k;
  const [office, setOffice] = useState<Office | null | undefined>(undefined);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [token, setToken] = useState<Token | null>(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (!code || initDone.current) return;
    initDone.current = true;
    let uq: (() => void) | null = null;
    (async () => {
      const db = getDb(); if (!db) { setOffice(null); return; }
      const snap = await getDocs(query(collection(db, "offices"), where("code", "==", code)));
      if (snap.empty) { setOffice(null); return; }
      const o = { id: snap.docs[0].id, ...snap.docs[0].data() } as Office;
      setOffice(o);
      const today = getTodayStr();
      const qid = `${o.id}_${today}`;
      uq = onSnapshot(doc(db, "queues", qid), s => setQueue(s.exists() ? s.data() as QueueData : { isOpen: true, isPaused: false, currentToken: 0, totalIssued: 0 }));
    })();
    return () => { uq?.(); };
  }, [code]);

  const submit = useCallback(async () => {
    setError("");
    if (!name.trim()) { setError(t("err_name")); return; }
    if (!phone.match(/^\d{10}$/)) { setError(t("err_phone")); return; }
    if (!office) return;
    if (queue && !queue.isOpen) { setError(t("err_closed")); return; }
    if (queue?.isPaused) { setError(t("err_paused")); return; }
    setLoading(true);
    try {
      const db = getDb()!;
      const today = getTodayStr();
      const qid = `${office.id}_${today}`;
      const qr = doc(db, "queues", qid);
      const ref = doc(collection(db, "queues", qid, "tokens"));
      const issuedToken = await runTransaction(db, async (transaction) => {
        const queueSnap = await transaction.get(qr);
        const qd = queueSnap.exists()
          ? queueSnap.data()
          : { isOpen: true, isPaused: false, currentToken: 0, totalIssued: 0 };
        if (!qd.isOpen) throw new Error(t("err_closed"));
        if (qd.isPaused) throw new Error(t("err_paused"));
        if (office.dailyLimit && qd.totalIssued >= office.dailyLimit) {
          throw new Error(t("err_limit"));
        }

        const num = (qd.totalIssued || 0) + 1;
        const issuedAt = Timestamp.now();
        const data = {
          number: num,
          name: name.trim(),
          phone: `+91${phone}`,
          serviceType: "General",
          status: "waiting",
          issuedAt,
          waitMinutes: 0,
        };
        transaction.set(ref, data);
        if (queueSnap.exists()) {
          transaction.update(qr, { totalIssued: num });
        } else {
          transaction.set(qr, { date: today, officeId: office.id, isOpen: true, isPaused: false, currentToken: 0, totalIssued: num });
        }
        return { id: ref.id, number: num, name: name.trim(), status: "waiting", issuedAt };
      });
      setToken(issuedToken);
    } catch (err: any) { setError(err.message || t("err_generic")); }
    setLoading(false);
  }, [office, queue, name, phone, t]);

  const cancel = useCallback(async () => {
    if (!token || !office) return;
    const today = getTodayStr();
    await updateDoc(doc(getDb()!, "queues", `${office.id}_${today}`, "tokens", token.id), { status: "cancelled" });
    setToken(null);
  }, [token, office]);

  if (office === undefined) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#f2f2f7" }}><div className="w-8 h-8 border-2 border-[#c6c6c8] border-t-[#007AFF] rounded-full animate-spin" /></div>;

  if (office === null) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f2f2f7" }}>
      <div className="card text-center py-12 max-w-sm w-full shadow-xl shadow-black/5">
        <div className="w-14 h-14 bg-[#FF3B30]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><svg className="w-7 h-7 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div>
        <h1 className="text-lg font-bold text-[#1c1c1e] mb-1">{t("notFound")}</h1>
        <p className="text-sm text-[#8e8e93]">{t("notFoundDesc")}</p>
      </div>
    </div>
  );

  if (token) {
    const pos = Math.max(1, token.number - (queue?.currentToken || 0));
    const est = pos * 5;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f2f2f7" }}>
        <div className="flex items-center justify-end px-4 pt-4">
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">{lang === "en" ? "हि" : "EN"}</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-14 h-14 bg-[#34C759]/10 rounded-2xl flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm text-[#8e8e93] font-medium mb-1">{office.name}</p>
          <p className="token-display mb-5">{token.number}</p>
          <div className="flex gap-3 mb-5">
            <div className="card-sm !p-4 min-w-[90px]"><p className="text-xs text-[#8e8e93] font-medium mb-1">{t("pos")}</p><p className="text-xl font-black text-[#1c1c1e]">{pos}</p></div>
            <div className="card-sm !p-4 min-w-[90px]"><p className="text-xs text-[#8e8e93] font-medium mb-1">{t("wait")}</p><p className="text-xl font-black text-[#1c1c1e]">~{est}{t("min")}</p></div>
          </div>
          <div className="card-sm !bg-[#f2f2f7] mb-5 max-w-xs"><p className="text-sm text-[#8e8e93]">{t("leave")}</p></div>
          <button onClick={cancel} className="btn-ghost !text-[#FF3B30] hover:!bg-[#FF3B30]/5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>{t("cancel")}</button>
        </div>
        <div className="px-4 pb-6 text-center">
          <a href={`/q/${code}/token/${token.id}`} className="btn-primary inline-flex !w-auto !px-8 text-sm">{t("view")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#f2f2f7" }}>
      <div className="max-w-sm mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-xl font-black tracking-tight text-[#1c1c1e]">{t("title")}</h1></div>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">{lang === "en" ? "हि" : "EN"}</button>
        </div>

        {office && <div className="text-center mb-5"><div className="card inline-block px-5 py-3 shadow-xl shadow-black/5"><h2 className="font-semibold text-[#1c1c1e]">{office.name}</h2><p className="text-xs text-[#8e8e93] mt-0.5">{office.district}, {office.state}</p></div></div>}

        {queue && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="card text-center p-4"><p className="text-xs text-[#8e8e93] font-medium">{t("now")}</p><p className="text-2xl font-black text-[#1c1c1e]">{queue.currentToken || "—"}</p></div>
              <div className="card text-center p-4"><p className="text-xs text-[#8e8e93] font-medium">{t("today")}</p><p className="text-2xl font-black text-[#1c1c1e]">{queue.totalIssued}</p></div>
            </div>
            <div className={`text-center mb-5 rounded-full py-2 px-4 text-sm font-medium ${
              queue.isPaused ? "bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20" : queue.isOpen ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20" : "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20"
            }`}>
              {queue.isPaused ? "Paused" : queue.isOpen ? "Open" : "Closed"}
            </div>
          </>
        )}

        {error && <div className="mb-4 bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-slide-down"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}

        {(!queue || queue.isOpen) && !queue?.isPaused && (
          <div className="card animate-slide-up space-y-4 shadow-xl shadow-black/5">
            <div><label className="label">{t("name")}</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Rajesh Kumar" /></div>
            <div><label className="label">{t("phone")}</label><input className="input" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" maxLength={10} type="tel" inputMode="numeric" /></div>
            <button onClick={submit} disabled={loading} className="btn-primary w-full">{loading ? (<span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("send")}</span>) : t("get")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
