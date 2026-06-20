"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import type { DaySchedule } from "@/lib/types";
import { getTodayDayName, normalizeCode } from "@/lib/utils";
import { encryptId } from "@/lib/crypto";

const LANG: Record<string, Record<string, string>> = {
  en: { title: "Find an Organization", search: "Search by name, district, or city...", noResults: "No organizations found", loading: "Finding organizations...", join: "Join Queue", open: "Open", closed: "Closed", registerTitle: "Own a clinic or shop?", registerDesc: "List your organization on LineHai? and let people join your queue directly.", register: "Register Now" },
  hi: { title: "संगठन खोजें", search: "नाम, ज़िला या शहर से खोजें...", noResults: "कोई संगठन नहीं मिला", loading: "संगठन खोज रहा है...", join: "कतार में शामिल हों", open: "खुला", closed: "बंद", registerTitle: "आपकी क्लिनिक या दुकान है?", registerDesc: "अपने संगठन को LineHai? पर सूचीबद्ध करें और लोगों को सीधे कतार में शामिल होने दें।", register: "अभी पंजीकरण करें" },
};

interface Org { id: string; name: string; district: string; state: string; code: string; schedule?: Record<string, DaySchedule | null>; openDays: string[]; openTime: string; closeTime: string; }

export default function FindPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [langOpen, setLangOpen] = useState(false);
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
  const timeParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const currentMinutes = Number(timeParts.hour) * 60 + Number(timeParts.minute);

  const getTodayHours = (org: Org): DaySchedule | null => {
    if (org.schedule && Object.prototype.hasOwnProperty.call(org.schedule, todayName)) return org.schedule[todayName];
    if (!org.openDays?.includes(todayName)) return null;
    return { open: org.openTime || "09:00", close: org.closeTime || "17:00" };
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
    return org.name?.toLowerCase().includes(q) || org.district?.toLowerCase().includes(q) || org.state?.toLowerCase().includes(q);
  });

  const OrgIcon = ({ name }: { name: string }) => {
    const n = name.toLowerCase();
    if (n.includes("hospital") || n.includes("clinic") || n.includes("health")) return "🏥";
    if (n.includes("bank") || n.includes("sbi")) return "🏦";
    if (n.includes("e-district") || n.includes("passport") || n.includes("aadhaar") || n.includes("government")) return "🏛️";
    if (n.includes("restaurant") || n.includes("haldiram") || n.includes("dhaba")) return "🍽️";
    if (n.includes("salon") || n.includes("naturals") || n.includes("barber")) return "✂️";
    if (n.includes("ration") || n.includes("bigbasket") || n.includes("kirana") || n.includes("retail")) return "🛒";
    return "🏪";
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
            <Link href="/find" className="glass-nav__link" style={{color:"var(--text-primary)",fontWeight:600}}>{c.title}</Link>
            <Link href="/admin/register" className="glass-nav__link">For business</Link>
            <Link href="/#how" className="glass-nav__link">How it works</Link>
          </div>
          <div className="glass-nav__right">
            <div className="glass-lang" onClick={() => setLangOpen(!langOpen)}>
              <i className="ph ph-globe" style={{fontSize:14}} />
              <span>{lang === "en" ? "EN" : "हि"}</span>
              <span style={{fontSize:8,color:"var(--text-tertiary)",lineHeight:1}}>▾</span>
              <div className={`glass-lang__dropdown ${langOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
                <button className={`glass-lang__item ${lang==="en"?"glass-lang__item--active":""}`} onClick={() => { setLang("en"); setLangOpen(false); }}>English</button>
                <button className={`glass-lang__item ${lang==="hi"?"glass-lang__item--active":""}`} onClick={() => { setLang("hi"); setLangOpen(false); }}>हिन्दी</button>
              </div>
            </div>
            <Link href="/admin/login" className="glass-btn-ghost" style={{height:40,padding:"0 20px",fontSize:13,textDecoration:"none"}}>Sign in</Link>
          </div>
        </div>
      </nav>

      <section className="lg-section" style={{padding:"40px 16px"}}>
        <div className="lg-container">
          <div style={{maxWidth:560,margin:"0 auto 32px",textAlign:"center"}}>
            <h1 style={{fontFamily:"var(--font-display-lg)",fontSize:28,fontWeight:600,letterSpacing:"-0.02em",color:"var(--text-primary)",marginBottom:4}}>{c.title}</h1>
            <p style={{fontSize:14,color:"var(--text-secondary)",marginBottom:20}}>Search for clinics, shops, and offices using LineHai?</p>
            <div className="glass-input__wrapper">
              <input type="text" className="glass-input" value={query_} onChange={(e) => setQuery_(e.target.value)} placeholder={c.search} autoFocus />
            </div>
          </div>

          {loading ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,maxWidth:960,margin:"0 auto"}}>
              {[1,2,3].map((i) => (
                <div key={i} className="glass-skeleton" style={{padding:24}}>
                  <div className="glass-skeleton__line glass-skeleton__line--med" />
                  <div className="glass-skeleton__line glass-skeleton__line--long" />
                  <div className="glass-skeleton__line glass-skeleton__line--short" />
                  <div className="glass-skeleton__line glass-skeleton__line--long" style={{marginTop:12}} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"48px 0"}}>
              <div style={{fontSize:48,color:"var(--text-tertiary)",marginBottom:16}}><i className="ph ph-magnifying-glass" /></div>
              <p style={{fontSize:15,color:"var(--text-secondary)"}}>{c.noResults}</p>
            </div>
          ) : (
            <>
              <p style={{fontSize:12,color:"var(--text-tertiary)",maxWidth:960,margin:"0 auto 12px",fontWeight:500}}>{filtered.length} {lang==="en"?"organizations found":"संगठन मिले"}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,maxWidth:960,margin:"0 auto"}}>
                {filtered.map((org) => {
                  const open = isOpenNow(org);
                  const hours = getTodayHours(org);
                  return (
                    <div key={org.id} className="glass-card animate-fade-scale" style={{padding:20,display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <span style={{fontSize:28}}><OrgIcon name={org.name} /></span>
                        <span className={`glass-badge ${open?"":"glass-badge--green"}`} style={open?{}:{background:"rgba(48,209,88,0.20)",borderColor:"rgba(48,209,88,0.40)",color:"#30D158"}}>
                          {open ? "🟢" : "🔴"} {open ? c.open : c.closed}
                        </span>
                      </div>
                      <h3 style={{fontFamily:"var(--font-display-lg)",fontSize:16,fontWeight:600,color:"var(--text-primary)"}}>{org.name}</h3>
                      <p style={{fontSize:13,color:"var(--text-tertiary)",display:"flex",alignItems:"center",gap:4}}>
                        <i className="ph ph-map-pin" style={{fontSize:14}} /> {org.district}, {org.state}
                      </p>
                      {hours && <p style={{fontSize:11,color:"var(--text-tertiary)"}}>{hours.open} - {hours.close}</p>}
                      <Link href={`/q/${encryptId(normalizeCode(org.code))}`} className="glass-btn-ghost glass-btn-ghost--full" style={{height:44,fontSize:14,marginTop:"auto",textDecoration:"none"}}>
                        {c.join} <i className="ph ph-arrow-right" style={{fontSize:16}} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="glass-card" style={{maxWidth:480,margin:"40px auto 0",padding:24,textAlign:"center",background:"var(--glass-bg-strong)"}}>
            <div style={{fontSize:32,marginBottom:8,color:"var(--color-accent)"}}><i className="ph ph-storefront" /></div>
            <h3 style={{fontFamily:"var(--font-display-lg)",fontSize:16,fontWeight:600,color:"var(--text-primary)",marginBottom:4}}>{c.registerTitle}</h3>
            <p style={{fontSize:13,color:"var(--text-secondary)",marginBottom:16,maxWidth:360,margin:"0 auto 16px"}}>{c.registerDesc}</p>
            <Link href="/admin/register" className="glass-btn-primary" style={{textDecoration:"none",fontSize:14,height:46,padding:"0 28px",display:"inline-flex"}}>{c.register}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
