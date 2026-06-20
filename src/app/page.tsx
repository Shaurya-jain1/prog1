"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { encryptId } from "@/lib/crypto";

const COPY: Record<string, any> = {
  en: {
    nav: { find: "Find an org", business: "For business", how: "How it works" },
    signin: "Sign in",
    hero: { eyebrow: "Virtual Queue System for India", h1a: "Your turn,", h1b: "from your phone.", sub: "Get a 6-letter code from any clinic, shop, or government office. Type it below to get your token.", placeholder: "ABC123", cta: "Get token →" },
    findLink: "Don't have a code? Find an organization →",
    how: { label: "How it works", title: "Three steps. No app download, no signup.", steps: [
      { num: "1", icon: "ph-qr-code", title: "Get a code", desc: "Look for the LineHai? code at the counter — on a board, a receipt, or a sticker." },
      { num: "2", icon: "ph-device-mobile", title: "Type it here", desc: "Enter the 6-letter code above. We'll give you a token number and your position in line." },
      { num: "3", icon: "ph-bell-ringing", title: "Get a buzz", desc: "We'll text you when your token is close. Walk in, show your number, get served." },
    ]},
    uses: { label: "Skip the line at", title: "Anywhere people queue. Anywhere in India.", list: [
      { icon: "ph-hospital", title: "District hospitals & clinics", desc: "Stop arriving at 6am for a 2pm OPD slot. Get a token from home." },
      { icon: "ph-storefront", title: "Ration & kirana shops", desc: "Take a number from the auto-rickshaw on the way. No more waiting in the sun." },
      { icon: "ph-buildings", title: "Passport & Aadhaar offices", desc: "Get a token the night before, arrive 10 min before your turn." },
      { icon: "ph-fork-knife", title: "Restaurants & dhabas", desc: "Walk-ins get a token, browse nearby, get buzzed when the table is ready." },
      { icon: "ph-scissors", title: "Salons & barbers", desc: "Book a chair from home. No more 'come back in 40 minutes.'" },
      { icon: "ph-bank", title: "Banks & ATMs", desc: "See the live queue at every branch. Pick the one with the shortest line." },
    ]},
    business: { label: "For business", title: "Run a counter? Get a code in 2 minutes.", sub: "No hardware. No app for your staff. No monthly fees for small businesses.", bullets: ["Free for citizens. Easy for businesses.", "Works on 2G, on a 7-year-old phone, in 11 languages.", "Citizens don't need to sign up — they just type the code."], cta: "Register your business", demo: "See a demo queue" },
    footer: "Waiting, reinvented for India.",
  },
  hi: {
    nav: { find: "संगठन खोजें", business: "व्यवसाय के लिए", how: "यह कैसे काम करता है" },
    signin: "साइन इन",
    hero: { eyebrow: "भारत के लिए वर्चुअल कतार", h1a: "आपकी बारी,", h1b: "आपके फोन पर।", sub: "किसी भी क्लिनिक, दुकान, या सरकारी कार्यालय से 6-अक्षर का कोड लें। नीचे टाइप करके अपना टोकन पाएं।", placeholder: "ABC123", cta: "टोकन लें →" },
    findLink: "कोड नहीं है? संगठन खोजें →",
    how: { label: "यह कैसे काम करता है", title: "तीन कदम। कोई ऐप डाउनलोड नहीं, कोई साइनअप नहीं।", steps: [
      { num: "1", icon: "ph-qr-code", title: "कोड लें", desc: "काउंटर पर LineHai? कोड देखें — बोर्ड पर, रसीद पर, या स्टिकर पर।" },
      { num: "2", icon: "ph-device-mobile", title: "यहाँ टाइप करें", desc: "ऊपर 6-अक्षर का कोड डालें। हम आपको टोकन नंबर और कतार में स्थान देंगे।" },
      { num: "3", icon: "ph-bell-ringing", title: "बजर पाएं", desc: "जब आपका टोकन पास होगा तो हम आपको मैसेज करेंगे। अंदर जाएं, नंबर दिखाएं, सेवा पाएं।" },
    ]},
    uses: { label: "यहाँ लाइन छोड़ें", title: "जहाँ भी लोग कतार में खड़े हों। भारत में कहीं भी।", list: [
      { icon: "ph-hospital", title: "ज़िला अस्पताल और क्लीनिक", desc: "दोपहर 2 बजे की ओपीडी के लिए सुबह 6 बजे पहुंचना बंद करें।" },
      { icon: "ph-storefront", title: "राशन और किराना दुकानें", desc: "रास्ते में ऑटो से नंबर लें। अब धूप में इंतज़ार नहीं।" },
      { icon: "ph-buildings", title: "पासपोर्ट और आधार कार्यालय", desc: "एक रात पहले टोकन लें, बारी से 10 मिनट पहले पहुंचें।" },
      { icon: "ph-fork-knife", title: "रेस्तरां और ढाबे", desc: "वॉक-इन को टोकन मिलता है, पास में घूमें, टेबल तैयार होने पर बजर बजे।" },
      { icon: "ph-scissors", title: "सैलून और नाई", desc: "घर से कुर्सी बुक करें। अब '40 मिनट बाद आना' नहीं।" },
      { icon: "ph-bank", title: "बैंक और एटीएम", desc: "हर शाखा की लाइव कतार देखें। जहाँ सबसे छोटी लाइन हो, वहाँ जाएं।" },
    ]},
    business: { label: "व्यवसाय के लिए", title: "काउंटर चलाते हैं? 2 मिनट में कोड लें।", sub: "कोई हार्डवेयर नहीं। स्टाफ के लिए कोई ऐप नहीं। छोटे व्यवसायों के लिए कोई मासिक शुल्क नहीं।", bullets: ["नागरिकों के लिए मुफ़्त। व्यवसायों के लिए आसान।", "2G पर, 7 साल पुराने फोन पर, 11 भाषाओं में।", "नागरिकों को साइन अप नहीं करना — बस कोड टाइप करें।"], cta: "अपना व्यवसाय पंजीकृत करें", demo: "डेमो कतार देखें" },
    footer: "प्रतीक्षा, भारत के लिए पुनः आविष्कृत।",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [code, setCode] = useState("");
  const c = COPY[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleJoin = () => {
    const v = code.trim().toUpperCase();
    if (v) {
      window.location.href = `/q/${encryptId(v)}`;
    }
  };

  return (
    <>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob--amber" />
        <div className="mesh-blob mesh-blob--violet" />
        <div className="mesh-blob mesh-blob--teal" />
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div style={{position:"fixed",inset:0,zIndex:199,background:"rgba(0,0,0,0.5)"}} onClick={() => setMenuOpen(false)} />
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"rgba(20,15,50,0.96)",backdropFilter:"var(--glass-blur)",WebkitBackdropFilter:"var(--glass-blur)",borderTop:"1px solid var(--glass-border-nav)",borderRadius:"24px 24px 0 0",padding:"16px 24px 24px",boxShadow:"var(--glass-shadow)"}}>
            <div style={{width:32,height:4,background:"var(--glass-border-pill)",borderRadius:2,margin:"0 auto 16px"}} />
            <Link href="/find" onClick={() => setMenuOpen(false)} style={{display:"block",padding:"14px 0",fontSize:"16px",fontWeight:500,color:"var(--text-secondary)",borderBottom:"1px solid var(--glass-divider)",textDecoration:"none"}}>{c.nav.find}</Link>
            <Link href="/admin/register" onClick={() => setMenuOpen(false)} style={{display:"block",padding:"14px 0",fontSize:"16px",fontWeight:500,color:"var(--text-secondary)",borderBottom:"1px solid var(--glass-divider)",textDecoration:"none"}}>{c.nav.business}</Link>
            <a href="#how" onClick={() => setMenuOpen(false)} style={{display:"block",padding:"14px 0",fontSize:"16px",fontWeight:500,color:"var(--text-secondary)",textDecoration:"none"}}>{c.nav.how}</a>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 0",color:"var(--text-tertiary)",fontSize:13,cursor:"pointer"}} onClick={() => { setLang(lang==="en"?"hi":"en"); setMenuOpen(false); }}>
              <i className="ph ph-globe" style={{fontSize:18}} />
              <span>{lang === "en" ? "English" : "हिन्दी"}</span>
              <span style={{color:"var(--text-tertiary)"}}>|</span>
              <span>{lang === "en" ? "हिन्दी" : "English"}</span>
            </div>
          </div>
        </>
      )}

      {/* Nav */}
      <nav className={`glass-nav`} style={{position:"sticky",top:0,zIndex:100,background:scrolled?"rgba(13,10,46,0.85)":"var(--glass-bg-nav)",backdropFilter:"var(--glass-blur)",WebkitBackdropFilter:"var(--glass-blur)",borderBottom:"1px solid var(--glass-border-nav)",height:64,display:"flex",alignItems:"center",padding:"0 24px",transition:"background .2s"}}>
        <div className="glass-nav__inner">
          <Link href="/" className="glass-nav__logo">
            <span className="glass-nav__logo-line">Line</span><span className="glass-nav__logo-hai">Hai?</span>
          </Link>
          <div className="glass-nav__links">
            <Link href="/find" className="glass-nav__link">{c.nav.find}</Link>
            <Link href="/admin/register" className="glass-nav__link">{c.nav.business}</Link>
            <a href="#how" className="glass-nav__link">{c.nav.how}</a>
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
            <Link href="/admin/login" className="glass-btn-ghost" style={{height:40,padding:"0 20px",fontSize:13,textDecoration:"none"}}>{c.signin}</Link>
            <button className="glass-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <i className="ph ph-list" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lg-section" style={{minHeight:"calc(100vh - 64px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 16px"}}>
        <div className="glass-card glass-card--glow animate-fade-scale" style={{maxWidth:520,width:"100%",padding:48,textAlign:"center"}}>
          <span style={{display:"inline-block",fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--color-accent)",marginBottom:16}}>{c.hero.eyebrow}</span>
          <h1 style={{fontFamily:"var(--font-display-lg)",fontSize:"clamp(32px,6vw,48px)",fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",marginBottom:12,color:"var(--text-primary)"}}>
            {c.hero.h1a}<br /><span style={{color:"var(--color-accent)"}}>{c.hero.h1b}</span>
          </h1>
          <p style={{fontSize:16,color:"var(--text-secondary)",lineHeight:1.6,maxWidth:420,margin:"0 auto 24px"}}>{c.hero.sub}</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="text" className="glass-input glass-input--code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} onKeyDown={(e) => e.key==="Enter"&&handleJoin()} placeholder={c.hero.placeholder} />
            <button className="glass-btn-primary glass-btn-primary--full" onClick={handleJoin}>
              {c.hero.cta} <i className="ph ph-arrow-right" style={{fontSize:18}} />
            </button>
          </div>
          <p style={{marginTop:12,fontSize:13,color:"var(--text-tertiary)"}}>
            <Link href="/find" style={{color:"var(--color-accent)",fontWeight:500,textDecoration:"none"}}>{c.findLink}</Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="lg-section" id="how" style={{padding:"80px 0"}}>
        <div className="lg-container">
          <p className="section-label" style={{color:"var(--color-accent)",fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"center",marginBottom:4}}>{c.how.label}</p>
          <h2 style={{fontFamily:"var(--font-display-lg)",fontSize:"clamp(24px,3vw,28px)",fontWeight:600,letterSpacing:"-0.02em",color:"var(--text-primary)",textAlign:"center",marginBottom:32}}>{c.how.title}</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24,maxWidth:960,margin:"0 auto",position:"relative"}}>
            {c.how.steps.map((s:any,i:number) => (
              <div key={s.num} className={`glass-card animate-fade-scale ${i===0?"animate-fs-1":i===1?"animate-fs-2":"animate-fs-3"}`} style={{padding:32,textAlign:"center",position:"relative",zIndex:1}}>
                <div style={{fontFamily:"var(--font-display-lg)",fontSize:72,fontWeight:700,color:"rgba(255,255,255,0.15)",lineHeight:1,marginBottom:8}}>{s.num}</div>
                <div style={{fontSize:32,color:"var(--text-primary)",marginBottom:16}}><i className={`${s.icon}`} /></div>
                <h3 style={{fontFamily:"var(--font-display-lg)",fontSize:18,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{s.title}</h3>
                <p style={{fontSize:14,color:"var(--text-secondary)",lineHeight:1.6}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="lg-section" style={{padding:"80px 0"}}>
        <div className="lg-container">
          <p className="section-label" style={{color:"var(--color-accent)",fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"center",marginBottom:4}}>{c.uses.label}</p>
          <h2 style={{fontFamily:"var(--font-display-lg)",fontSize:"clamp(24px,3vw,28px)",fontWeight:600,letterSpacing:"-0.02em",color:"var(--text-primary)",textAlign:"center",marginBottom:32}}>{c.uses.title}</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:960,margin:"0 auto"}}>
            {c.uses.list.map((p:any,i:number) => (
              <div key={p.title} className={`glass-card animate-fade-scale ${`animate-fs-${Math.min(i+1,5)}`}`} style={{padding:24,borderTop:"2px solid var(--color-accent-border)"}}>
                <div style={{fontSize:28,color:"var(--color-accent)",marginBottom:16}}><i className={p.icon} /></div>
                <h3 style={{fontFamily:"var(--font-display-lg)",fontSize:16,fontWeight:600,color:"var(--text-primary)",marginBottom:4}}>{p.title}</h3>
                <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.5}}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business CTA */}
      <section className="lg-section" style={{padding:"80px 0"}}>
        <div className="lg-container">
          <div className="glass-card" style={{maxWidth:960,margin:"0 auto",padding:32,background:"var(--glass-bg-strong)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,alignItems:"start"}}>
              <div>
                <p style={{fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--color-accent)",marginBottom:8}}>{c.business.label}</p>
                <h2 style={{fontFamily:"var(--font-display-lg)",fontSize:"clamp(22px,3vw,28px)",fontWeight:600,letterSpacing:"-0.02em",color:"var(--text-primary)",marginBottom:8}}>{c.business.title}</h2>
                <p style={{fontSize:15,color:"var(--text-secondary)",lineHeight:1.6,marginBottom:20}}>{c.business.sub}</p>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
                  {c.business.bullets.map((b:string,i:number) => (
                    <li key={i} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:14,color:"var(--text-secondary)"}}>
                      <i className="ph ph-check-circle" style={{color:"var(--color-accent)",fontSize:18,flexShrink:0,marginTop:1}} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  <Link href="/admin/register" className="glass-btn-primary" style={{textDecoration:"none",fontSize:14,height:46,padding:"0 28px"}}>{c.business.cta}</Link>
                  <Link href="#how" className="glass-btn-ghost" style={{textDecoration:"none",fontSize:14,height:46,padding:"0 24px"}}>{c.business.demo}</Link>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div className="glass-card" style={{padding:16,textAlign:"center",background:"var(--glass-bg-dark)"}}>
                  <div style={{fontFamily:"var(--font-display-lg)",fontSize:36,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    12 <span className="pulse-dot" />
                  </div>
                  <p style={{fontSize:12,color:"var(--text-tertiary)",marginTop:4}}>Currently waiting</p>
                </div>
                <div className="glass-card" style={{padding:16,textAlign:"center",background:"var(--glass-bg-dark)"}}>
                  <div style={{fontFamily:"var(--font-display-lg)",fontSize:36,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums"}}>47</div>
                  <p style={{fontSize:12,color:"var(--text-tertiary)",marginTop:4}}>Served today</p>
                </div>
                <div className="glass-card" style={{padding:16,textAlign:"center",background:"var(--glass-bg-dark)"}}>
                  <div style={{fontFamily:"var(--font-display-lg)",fontSize:36,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums"}}>3</div>
                  <p style={{fontSize:12,color:"var(--text-tertiary)",marginTop:4}}>No-shows</p>
                </div>
                <div className="glass-card" style={{padding:16,textAlign:"center",background:"var(--glass-bg-dark)"}}>
                  <div style={{fontFamily:"var(--font-display-lg)",fontSize:36,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums"}}>8</div>
                  <p style={{fontSize:12,color:"var(--text-tertiary)",marginTop:4}}>Avg wait (min)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-footer">
        <div className="glass-footer__inner">
          <Link href="/" className="glass-nav__logo">
            <span className="glass-nav__logo-line">Line</span><span className="glass-nav__logo-hai">Hai?</span>
          </Link>
          <p className="glass-footer__tagline">{c.footer}</p>
          <div className="glass-footer__links">
            <Link href="/find">Find an org</Link>
            <Link href="/admin/register">For business</Link>
            <a href="mailto:hello@linehai.app">hello@linehai.app</a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @media(max-width:768px) {
          .glass-card { padding: 24px !important; }
          h1 { font-size: 32px !important; }
          .lg-container > div[style*="grid-template-columns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
          .lg-container > div[style*="position: absolute; top: 40px"] { display: none !important; }
          footer > div { flex-direction: column !important; text-align: center !important; }
          [style*="grid-template-columns: 1fr 1fr; gap: 32px;"] { grid-template-columns: 1fr !important; }
          .glass-hamburger { display: flex !important; }
        }
        @media(max-width:480px) {
          [style*="grid-template-columns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
