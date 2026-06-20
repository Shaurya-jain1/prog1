"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { doc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { getTodayStr, normalizeCode } from "@/lib/utils";
import { decryptId } from "@/lib/crypto";

const L: Record<string, Record<string, string>> = {
  en: { turn: "It's your turn!", coming: "Your turn is coming!", cancelled: "Cancelled", served: "Completed", token: "Your Token", pos: "Position", wait: "Est. Wait", min: "min", now: "Now Serving", progress: "Progress", leave: "Stay where you are. This page updates live.", notFound: "Token not found", newToken: "Get New Token", loading: "Loading...", status: "Status" },
  hi: { turn: "अब आपकी बारी है!", coming: "आपकी बारी आ रही है!", cancelled: "रद्द", served: "पूर्ण", token: "आपका टोकन", pos: "स्थिति", wait: "अनुमानित प्रतीक्षा", min: "मिनट", now: "अब सेवा", progress: "प्रगति", leave: "जहां हैं वहां रहें। यह पेज लाइव अपडेट होता है।", notFound: "टोकन नहीं मिला", newToken: "नया टोकन लें", loading: "लोड हो रहा है...", status: "स्थिति" },
};

interface Office { id: string; name: string; district: string; state: string; }
interface Token { id: string; number: number; name: string; status: string; }
interface QueueData { currentToken: number; totalIssued: number; }

export default function TokenStatusPage() {
  const params = useParams();
  const rawCode = params.officeCode as string;
  const tokenId = params.tokenId as string;
  const decodedCode = decryptId(rawCode);
  const normalizedCode = normalizeCode(decodedCode);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = (k: string) => L[lang][k] || k;
  const [office, setOffice] = useState<Office | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!normalizedCode || !tokenId) return;
    const unsubs: (() => void)[] = [];
    (async () => {
      const db = getDb()!;
      const snap = await getDocs(query(collection(db, "offices"), where("code", "==", normalizedCode)));
      if (snap.empty) { setLoading(false); return; }
      const o = { id: snap.docs[0].id, ...snap.docs[0].data() } as Office;
      setOffice(o);
      const today = getTodayStr();
      const qid = `${o.id}_${today}`;
      unsubs.push(onSnapshot(doc(db, "queues", qid), s => { if (s.exists()) setQueue(s.data() as QueueData); }));
      unsubs.push(onSnapshot(doc(db, "queues", qid, "tokens", tokenId), s => { if (s.exists()) setToken({ id: s.id, ...s.data() } as Token); }));
      setLoading(false);
    })();
    return () => unsubs.forEach(u => u());
  }, [normalizedCode, tokenId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#f2f2f7" }}><div className="w-8 h-8 border-2 border-[#c6c6c8] border-t-[#007AFF] rounded-full animate-spin" /></div>;
  if (!token || !office) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f2f2f7" }}>
      <div className="card text-center py-12 max-w-sm w-full shadow-xl shadow-black/5">
        <div className="w-14 h-14 bg-[#FF3B30]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><svg className="w-7 h-7 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
        <p className="text-[#1c1c1e] font-semibold mb-1">{t("notFound")}</p>
        <Link href={`/q/${rawCode}`} className="btn-primary inline-flex !w-auto !px-6 text-sm mt-4">{t("newToken")}</Link>
      </div>
    </div>
  );

  const current = queue?.currentToken || 0;
  const position = Math.max(0, token.number - current);
  const total = queue?.totalIssued || 0;
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const isNear = position <= 5 && position > 0 && token.status === "waiting";
  const isNow = token.status === "called";
  const estWait = position * 5;

  return (
    <div className="min-h-screen" style={{ background: "#f2f2f7" }}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${token.status === "waiting" ? "bg-[#34C759]" : token.status === "called" ? "bg-[#FF9500]" : token.status === "served" ? "bg-[#007AFF]" : "bg-[#FF3B30]"}`} />
          <span className="text-xs text-[#8e8e93] font-medium">
            {token.status === "waiting" ? t("status") : token.status === "called" ? t("turn") : token.status === "served" ? t("served") : t("cancelled")}
          </span>
        </div>
        <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost">{lang === "en" ? "हि" : "EN"}</button>
      </div>

      {isNow && (
        <div className="mx-4 mt-4 bg-[#007AFF] text-white text-center py-6 px-4 rounded-2xl shadow-lg">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <p className="text-lg font-bold">{t("turn")}</p>
        </div>
      )}

      {isNear && !isNow && (
        <div className="mx-4 mt-4 bg-[#FF9500] text-white text-center py-5 px-4 rounded-2xl shadow-lg">
          <p className="font-bold">{t("coming")}</p>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 pt-4">
        <div className="text-center mb-5"><p className="text-sm text-[#8e8e93] font-medium">{office.name}</p><p className="text-xs text-[#8e8e93] mt-0.5">{office.district}, {office.state}</p></div>

        <div className="card text-center mb-5 shadow-xl shadow-black/5">
          <p className="text-xs text-[#8e8e93] font-medium mb-2">{t("token")}</p>
          <p className="token-display">{token.number}</p>
        </div>

        {(token.status === "cancelled" || token.status === "served") && (
          <div className={`rounded-2xl p-5 text-center mb-5 ${token.status === "cancelled" ? "bg-[#FF3B30]/10 border border-[#FF3B30]/20" : "bg-[#34C759]/10 border border-[#34C759]/20"}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${token.status === "cancelled" ? "bg-[#FF3B30]/10" : "bg-[#34C759]/10"}`}>
              {token.status === "cancelled"
                ? <svg className="w-6 h-6 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-6 h-6 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
            </div>
            <p className="font-bold text-base text-[#1c1c1e]">{token.status === "cancelled" ? t("cancelled") : t("served")}</p>
            <Link href={`/q/${rawCode}`} className="btn-primary inline-flex !w-auto !px-6 text-sm mt-4">{t("newToken")}</Link>
          </div>
        )}

        {token.status === "waiting" && (
          <>
            <div className="card mb-5 shadow-xl shadow-black/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#8e8e93] font-medium">{t("pos")}</span>
                <span className="text-xl font-black text-[#1c1c1e]">{position > 0 ? position : "—"}</span>
              </div>
              <div className="w-full bg-[#f2f2f7] rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#007AFF] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-[#8e8e93] mt-1"><span>0</span><span className="font-medium text-[#3a3a3c]">{pct}%</span><span>{total}</span></div>
              <p className="text-xs text-[#8e8e93] text-center mt-1">{t("progress")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="card-sm text-center p-4"><p className="text-xs text-[#8e8e93] font-medium">{t("now")}</p><p className="text-xl font-black text-[#1c1c1e]">{queue?.currentToken || "—"}</p></div>
              <div className="card-sm text-center p-4"><p className="text-xs text-[#8e8e93] font-medium">{t("wait")}</p><p className="text-xl font-black text-[#1c1c1e]">~{estWait}{t("min")}</p></div>
            </div>

            <div className="bg-[#f2f2f7] rounded-xl p-4 text-center border border-[#c6c6c8]/20">
              <p className="text-sm text-[#8e8e93]">{t("leave")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
