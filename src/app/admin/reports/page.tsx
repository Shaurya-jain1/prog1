"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, getDocs, getDoc, doc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTodayStr } from "@/lib/utils";

const L: Record<string, Record<string, string>> = {
  en: { back: "Back", title: "Reports", date: "Select Date", served: "Served", avg: "Avg Wait", peak: "Peak Hour", pdf: "Download PDF", noData: "No data for this date", loading: "Loading...", token: "Token", name: "Name", issued: "Issued", served2: "Served", wait: "Wait", rating: "Rating", min: "min" },
  hi: { back: "वापस", title: "रिपोर्ट", date: "तारीख चुनें", served: "सेवित", avg: "औसत प्रतीक्षा", peak: "पीक घंटा", pdf: "PDF डाउनलोड", noData: "इस तारीख का कोई डेटा नहीं", loading: "लोड हो रहा है...", token: "टोकन", name: "नाम", issued: "जारी", served2: "सेवा", wait: "प्रतीक्षा", rating: "रेटिंग", min: "मिनट" },
};

interface Office { id: string; name: string; code: string; }
interface Token { id: string; number: number; name: string; status: string; issuedAt: any; servedAt?: any; waitMinutes: number; rating?: number; }

export default function AdminReportsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = (k: string) => L[lang][k] || k;
  const [office, setOffice] = useState<Office | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [date, setDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/admin/login"); return; }
    const load = async () => {
      const db = getDb()!;
      const snap = await getDocs(query(collection(db, "offices"), where("adminUid", "==", user.uid)));
      if (snap.empty) { router.push("/admin/register"); return; }
      setOffice({ id: snap.docs[0].id, ...snap.docs[0].data() } as Office);
      setLoading(false);
    };
    load();
  }, [router, authLoading, user]);

  useEffect(() => { if (!office || !date) return; load(); }, [office, date]);

  const load = async () => {
    if (!office) return; setLoading(true);
    const db = getDb()!;
    const qid = `${office.id}_${date}`;
    const qSnap = await getDoc(doc(db, "queues", qid));
    if (!qSnap.exists()) { setTokens([]); setLoading(false); return; }
    const snap = await getDocs(query(collection(db, "queues", qid, "tokens"), orderBy("number")));
    setTokens(snap.docs.map(d => ({ id: d.id, ...d.data() } as Token)));
    setLoading(false);
  };

  const served = tokens.filter(t => t.status === "served");
  const total = served.length;
  const avgWait = total > 0 ? Math.round(served.reduce((a, t) => a + (t.waitMinutes || 0), 0) / total) : 0;
  const hourly: Record<string, number> = {};
  served.forEach(t => { if (t.servedAt) { const h = t.servedAt.toDate().getHours().toString().padStart(2, "0"); hourly[h] = (hourly[h] || 0) + 1; } });
  const peak = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const pdf = () => {
    if (!office) return;
    const d = new jsPDF();
    const pw = d.internal.pageSize.getWidth();
    d.setFontSize(18); d.text(office.name, pw / 2, 20, { align: "center" });
    d.setFontSize(12); d.text(`Report - ${date}`, pw / 2, 30, { align: "center" });
    d.setFontSize(10);
    d.text(`${t("served")}: ${total}`, 14, 45);
    d.text(`${t("avg")}: ${avgWait} ${t("min")}`, 14, 52);
    d.text(`${t("peak")}: ${peak}`, 14, 59);
    autoTable(d, { startY: 70, head: [[t("token"), t("name"), t("issued"), t("served2"), t("wait"), t("rating")]], body: tokens.filter(x => x.status === "served").map(x => [x.number.toString(), x.name, x.issuedAt?.toDate?.().toLocaleTimeString() || "-", x.servedAt?.toDate?.().toLocaleTimeString() || "-", `${x.waitMinutes || 0}`, x.rating ? `${x.rating}/5` : "-"]), styles: { fontSize: 8 }, headStyles: { fillColor: [0, 122, 255] } });
    d.save(`LineHai-${date}.pdf`);
  };

  if (loading && !office) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#f2f2f7" }}><div className="w-8 h-8 border-2 border-[#c6c6c8] border-t-[#007AFF] rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-8" style={{ background: "#f2f2f7" }}>
      <div className="glass-strong border-b border-[#c6c6c8]/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/admin/dashboard")} className="btn-ghost !text-[#007AFF] !min-h-[36px] !px-2 !rounded-full text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t("back")}
          </button>
          <h1 className="font-semibold text-sm text-[#1c1c1e]">{t("title")}</h1>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-ghost !text-[#007AFF] !min-h-[36px] !px-2 !rounded-full text-xs">{lang === "en" ? "हि" : "EN"}</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3 space-y-3 relative z-10">
        <div className="card">
          <label className="label">{t("date")}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" max={getTodayStr()} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("served"), value: total, color: "text-[#34C759]" },
            { label: t("avg"), value: `${avgWait}m`, color: "text-[#FF9500]" },
            { label: t("peak"), value: `${peak}:00`, color: "text-[#AF52DE]" },
          ].map((s, i) => (
            <div key={i} className="card-sm text-center">
              <p className={`stat-value !text-lg ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#8e8e93] font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        <button onClick={pdf} disabled={tokens.length === 0} className="btn-primary w-full">{t("pdf")}</button>

        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-[#c6c6c8] border-t-[#007AFF] rounded-full animate-spin" /></div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 bg-[#f2f2f7] rounded-xl flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-[#c6c6c8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
              <p className="text-sm text-[#8e8e93]">{t("noData")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[#8e8e93] border-b border-[#c6c6c8]/20"><th className="pb-3 font-medium text-xs">{t("token")}</th><th className="pb-3 font-medium text-xs">{t("name")}</th><th className="pb-3 font-medium text-xs">{t("issued")}</th><th className="pb-3 font-medium text-xs">{t("served2")}</th><th className="pb-3 font-medium text-xs">{t("wait")}</th><th className="pb-3 font-medium text-xs">{t("rating")}</th></tr></thead>
              <tbody>{tokens.map(x => (<tr key={x.id} className="border-b border-[#c6c6c8]/10 hover:bg-[#f2f2f7] transition-colors"><td className="py-2.5 font-semibold text-[#1c1c1e]">{x.number}</td><td className="py-2.5 text-[#3a3a3c]">{x.name}</td><td className="py-2.5 text-[#8e8e93] text-xs">{x.issuedAt?.toDate?.().toLocaleTimeString() || "-"}</td><td className="py-2.5 text-[#8e8e93] text-xs">{x.servedAt?.toDate?.().toLocaleTimeString() || "-"}</td><td className="py-2.5"><span className="text-[#8e8e93] text-xs bg-[#f2f2f7] px-2 py-0.5 rounded-full">{x.waitMinutes || "-"}</span></td><td className="py-2.5 text-[#8e8e93] text-xs">{x.rating ? `${x.rating}/5` : "-"}</td></tr>))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
