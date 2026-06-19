"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COPY = {
  en: {
    status: "🟢 Live · Free for citizens · Works on any phone",
    nav: { find: "Find an org", business: "For business", signin: "Sign in" },
    register: "Get a code for your business",
    hero: {
      kicker: "Virtual queues for India",
      h1a: "Your turn,",
      h1b: "from your phone.",
      sub: "Get a 6-letter code from any clinic, shop, or government office. Type it here, get a token, and we'll buzz you when it's your turn.",
      codePlaceholder: "Enter 6-letter code",
      join: "Get my token",
    },
    token: { now: "Now serving", you: "Your token", ahead: "people ahead", eta: "≈ wait" },
    trust: "Used at clinics, shops, and offices across India",
    how: {
      title: "How it works",
      sub: "Three steps. No app download, no signup.",
      steps: [
        { n: "1", t: "Get a code", d: "Look for the LineHai? code at the counter — on a board, a receipt, or a sticker." },
        { n: "2", t: "Type it here", d: "Enter the 6-letter code above. We'll give you a token number and your position in line." },
        { n: "3", t: "Get a buzz", d: "We'll text you when your token is close. Walk in, show your number, get served." },
      ],
    },
    uses: {
      title: "Skip the line at",
      sub: "Anywhere people queue. Anywhere in India.",
      places: [
        { icon: "🏥", t: "District hospitals & clinics", d: "Stop arriving at 6am for a 2pm OPD slot." },
        { icon: "🛒", t: "Ration & kirana shops", d: "Take a number from the auto-rickshaw on the way." },
        { icon: "🏛️", t: "Passport & Aadhaar offices", d: "Get a token the night before, arrive 10 min before your turn." },
        { icon: "🍽️", t: "Restaurants & dhabas", d: "Walk-ins get a token, browse nearby, get buzzed when the table's ready." },
        { icon: "✂️", t: "Salons & barbers", d: "Book a chair from home. No more 'come back in 40 minutes'." },
        { icon: "🏦", t: "Banks & ATMs", d: "See the live queue at every branch. Pick the one with the shortest line." },
      ],
    },
    business: {
      title: "Run a counter? Get a code in 2 minutes.",
      sub: "No hardware. No app for your staff. No monthly fees for small businesses.",
      bullets: [
        "Free up to 50 tokens/day — perfect for shops, clinics, and small offices",
        "Works on 2G, on a 7-year-old phone, in 11 languages",
        "Citizens don't need to sign up — they just type the code",
      ],
      cta: "Register your business",
      secondary: "See a demo queue",
    },
    final: {
      h: "Your turn, from your phone.",
      s: "Free for citizens. No app download. No signup. Just a code, and your place in line.",
      cta: "Find an organization",
    },
    footer: "LineHai? — Queue management, simplified.",
  },
  hi: {
    status: "🟢 लाइव · नागरिकों के लिए मुफ़्त · किसी भी फोन पर",
    nav: { find: "संगठन खोजें", business: "व्यवसाय के लिए", signin: "साइन इन" },
    register: "अपने व्यवसाय के लिए कोड लें",
    hero: {
      kicker: "भारत के लिए वर्चुअल कतार",
      h1a: "आपकी बारी,",
      h1b: "आपके फोन पर।",
      sub: "किसी भी क्लिनिक, दुकान, या सरकारी कार्यालय से 6-अक्षर का कोड लें। यहाँ टाइप करें, टोकन पाएं, और बारी आने पर हम बजर देंगे।",
      codePlaceholder: "6-अक्षर का कोड डालें",
      join: "मेरा टोकन लें",
    },
    token: { now: "अभी सेवा", you: "आपका टोकन", ahead: "लोग आगे", eta: "≈ प्रतीक्षा" },
    trust: "भारत भर के क्लीनिक, दुकानों और कार्यालयों में उपयोग में",
    how: {
      title: "यह कैसे काम करता है",
      sub: "तीन कदम। कोई ऐप डाउनलोड नहीं, कोई साइनअप नहीं।",
      steps: [
        { n: "1", t: "कोड लें", d: "काउंटर पर LineHai? कोड देखें — बोर्ड पर, रसीद पर, या स्टिकर पर।" },
        { n: "2", t: "यहाँ टाइप करें", d: "ऊपर 6-अक्षर का कोड डालें। हम आपको टोकन नंबर और कतार में स्थान देंगे।" },
        { n: "3", t: "बजर पाएं", d: "जब आपका टोकन पास होगा तो हम आपको मैसेज करेंगे। अंदर जाएं, नंबर दिखाएं, सेवा पाएं।" },
      ],
    },
    uses: {
      title: "यहाँ लाइन छोड़ें",
      sub: "जहाँ भी लोग कतार में खड़े हों। भारत में कहीं भी।",
      places: [
        { icon: "🏥", t: "ज़िला अस्पताल और क्लीनिक", d: "दोपहर 2 बजे की ओपीडी के लिए सुबह 6 बजे पहुंचना बंद।" },
        { icon: "🛒", t: "राशन और किराना दुकानें", d: "रास्ते में ऑटो से टोकन लें।" },
        { icon: "🏛️", t: "पासपोर्ट और आधार कार्यालय", d: "रात को टोकन लें, बारी से 10 मिनट पहले पहुंचें।" },
        { icon: "🍽️", t: "रेस्तरां और ढाबे", d: "वॉक-इन को टोकन मिलता है, पास में घूमें, टेबल तैयार होने पर बजर बजे।" },
        { icon: "✂️", t: "सैलून और नाई", d: "घर से कुर्सी बुक करें। अब '40 मिनट बाद आना' नहीं।" },
        { icon: "🏦", t: "बैंक और एटीएम", d: "हर शाखा की लाइव कतार देखें। जहाँ सबसे छोटी लाइन हो, वहाँ जाएं।" },
      ],
    },
    business: {
      title: "काउंटर चलाते हैं? 2 मिनट में कोड लें।",
      sub: "कोई हार्डवेयर नहीं। स्टाफ के लिए कोई ऐप नहीं। छोटे व्यवसायों के लिए कोई मासिक शुल्क नहीं।",
      bullets: [
        "50 टोकन/दिन तक मुफ़्त — दुकानों, क्लीनिकों और छोटे कार्यालयों के लिए",
        "2G पर, 7 साल पुराने फोन पर, 11 भाषाओं में",
        "नागरिकों को साइन अप नहीं करना — बस कोड टाइप करें",
      ],
      cta: "अपना व्यवसाय पंजीकृत करें",
      secondary: "डेमो कतार देखें",
    },
    final: {
      h: "आपकी बारी, आपके फोन पर।",
      s: "नागरिकों के लिए मुफ़्त। कोई ऐप डाउनलोड नहीं। कोई साइनअप नहीं। बस कोड, और कतार में आपकी जगह।",
      cta: "संगठन खोजें",
    },
    footer: "LineHai? — कतार प्रबंधन, सरल।",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (v) window.location.href = `/q/${v}`;
  };

  return (
    <div className="min-h-screen bg-[#fdf8f1] text-[#1c1917] font-display">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all ${scrolled ? "bg-[#fdf8f1]/95 backdrop-blur-sm border-b border-[#1c1917]/8" : "bg-[#fdf8f1] border-b border-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="LineHai?" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-[#1e1b4b]">LineHai?</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/find" className="px-3 h-9 inline-flex items-center rounded-lg text-sm font-medium text-[#44403c] hover:text-[#1c1917] hover:bg-[#1c1917]/5 transition-colors">
              {c.nav.find}
            </Link>
            <Link href="/admin/register" className="px-3 h-9 inline-flex items-center rounded-lg text-sm font-medium text-[#44403c] hover:text-[#1c1917] hover:bg-[#1c1917]/5 transition-colors">
              {c.nav.business}
            </Link>
            <Link href="/admin/login" className="px-3 h-9 inline-flex items-center rounded-lg text-sm font-medium text-[#44403c] hover:text-[#1c1917] hover:bg-[#1c1917]/5 transition-colors">
              {c.nav.signin}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-[#1c1917]/5 items-center justify-center text-xs font-bold text-[#78716c] transition-colors" aria-label="Toggle language">
              {lang === "en" ? "हि" : "EN"}
            </button>
            <Link href="/admin/register" className="hidden sm:inline-flex items-center h-9 px-4 rounded-full bg-[#d97706] text-white text-sm font-semibold hover:bg-[#b45309] transition-colors" style={{ boxShadow: "0 4px 12px rgba(217,119,6,0.25)" }}>
              {c.register}
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 rounded-lg hover:bg-[#1c1917]/5 flex items-center justify-center" aria-label="Menu">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[#1c1917]/8 bg-[#fdf8f1]">
            <div className="px-4 py-3 space-y-1">
              <Link href="/find" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-[#1c1917] hover:bg-[#fef3c7] rounded-lg">{c.nav.find}</Link>
              <Link href="/admin/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-[#1c1917] hover:bg-[#fef3c7] rounded-lg">{c.nav.business}</Link>
              <Link href="/admin/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-[#1c1917] hover:bg-[#fef3c7] rounded-lg">{c.nav.signin}</Link>
              <Link href="/admin/register" onClick={() => setMenuOpen(false)} className="block mt-2 px-3 py-2.5 text-sm font-semibold text-white bg-[#d97706] text-center rounded-lg">{c.register}</Link>
              <div className="pt-2 mt-2 border-t border-[#1c1917]/8">
                <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="block w-full text-left px-3 py-2 text-xs font-bold text-[#78716c]">
                  {lang === "en" ? "हिन्दी में बदलें" : "Switch to English"}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO — two-column: input on left, real product mockup on right */}
      <section className="px-4 sm:px-6 pt-12 md:pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="inline-block text-xs font-bold text-[#d97706] uppercase tracking-widest mb-6 px-3 py-1 bg-[#fef3c7] rounded-full">
            {c.hero.kicker}
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-[-0.03em] leading-[0.98] text-[#1c1917]">
            {c.hero.h1a}
            <br />
            <span className="text-[#d97706] italic">{c.hero.h1b}</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-[#57534e] leading-relaxed max-w-xl mx-auto">
            {c.hero.sub}
          </p>

          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-2 border border-[#e7e5e4] flex flex-col sm:flex-row gap-2" style={{ boxShadow: "0 6px 24px rgba(217,119,6,0.08)" }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder={c.hero.codePlaceholder}
                className="flex-1 px-4 py-3.5 bg-[#fdf8f1] rounded-xl text-[#1c1917] placeholder:text-[#a8a29e] text-base font-bold tracking-[0.25em] text-center uppercase focus:outline-none focus:ring-2 focus:ring-[#d97706]/40 border border-transparent transition-all"
              />
              <button onClick={handleJoin} className="inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl bg-[#d97706] text-white text-sm font-bold hover:bg-[#b45309] transition-colors" style={{ boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}>
                {c.hero.join}
              </button>
            </div>
            <p className="mt-3 text-xs text-[#78716c]">
              <Link href="/find" className="font-semibold text-[#1e1b4b] hover:text-[#d97706] underline-offset-2 hover:underline">
                {c.nav.find} →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-8 border-y border-[#1c1917]/8 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-widest">{c.trust}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[#78716c] font-medium text-sm">
            <span>🏥 Apollo Clinics</span>
            <span>🛒 BigBasket</span>
            <span>🏛️ e-District</span>
            <span>🍽️ Haldiram's</span>
            <span>✂️ Naturals Salon</span>
            <span>🏦 SBI Branch</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.03em] text-[#1c1917] text-balance">{c.how.title}</h2>
            <p className="mt-3 text-[#57534e] text-balance">{c.how.sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {c.how.steps.map((s) => (
              <div key={s.n} className="bg-white rounded-2xl p-7 border border-[#e7e5e4]">
                <div className="w-10 h-10 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-base font-bold mb-4">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold text-[#1c1917] mb-2">{s.t}</h3>
                <p className="text-sm text-[#57534e] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.03em] text-[#1c1917] text-balance">{c.uses.title}</h2>
            <p className="mt-3 text-[#57534e] text-balance">{c.uses.sub}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.uses.places.map((p) => (
              <div key={p.t} className="bg-[#fdf8f1] rounded-2xl p-6 border border-[#e7e5e4] hover:border-[#d97706]/40 transition-colors">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="text-base font-semibold text-[#1c1917] mb-1.5">{p.t}</h3>
                <p className="text-sm text-[#57534e] leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For business */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-[#1e1b4b] rounded-3xl p-8 md:p-14 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #d97706, transparent 60%)" }} />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold text-[#fbbf24] uppercase tracking-widest mb-3">For business</p>
              <h2 className="text-3xl md:text-4xl font-medium tracking-[-0.02em] leading-tight text-balance mb-4">
                {c.business.title}
              </h2>
              <p className="text-white/75 leading-relaxed mb-6">{c.business.sub}</p>
              <ul className="space-y-2.5 mb-8">
                {c.business.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-white/85">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#d97706]/20 text-[#fbbf24] flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/register" className="inline-flex items-center h-11 px-5 rounded-full bg-[#d97706] text-white text-sm font-semibold hover:bg-[#b45309] transition-colors" style={{ boxShadow: "0 4px 12px rgba(217,119,6,0.4)" }}>
                  {c.business.cta}
                </Link>
                <Link href="/find" className="inline-flex items-center h-11 px-5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-colors">
                  {c.business.secondary}
                </Link>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4">Your dashboard</p>
              <div className="space-y-3">
                {[
                  { t: "Served today", v: "47", c: "#059669" },
                  { t: "Currently waiting", v: "12", c: "#d97706" },
                  { t: "No-shows", v: "3", c: "#ef4444" },
                  { t: "Avg wait", v: "8 min", c: "#1e1b4b" },
                ].map((m) => (
                  <div key={m.t} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5">
                    <span className="text-xs text-white/70 font-medium">{m.t}</span>
                    <span className="text-xl font-medium" style={{ color: m.c }}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — small, warm, not big black section */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.03em] text-[#1c1917] text-balance leading-tight">
            {c.final.h}
          </h2>
          <p className="mt-4 text-[#57534e] text-balance max-w-xl mx-auto leading-relaxed">{c.final.s}</p>
          <div className="mt-7">
            <Link href="/find" className="inline-flex items-center h-12 px-7 rounded-full bg-[#1e1b4b] text-white text-sm font-semibold hover:bg-[#312e81] transition-colors" style={{ boxShadow: "0 6px 20px rgba(30,27,75,0.25)" }}>
              {c.final.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1c1917]/8 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="LineHai?" className="w-5 h-5 rounded" />
            <span className="text-sm font-bold text-[#1e1b4b]">LineHai?</span>
          </div>
          <p className="text-xs text-[#a8a29e]">{c.footer}</p>
          <div className="flex items-center gap-4 text-xs text-[#78716c]">
            <Link href="/find" className="hover:text-[#1c1917]">{c.nav.find}</Link>
            <Link href="/admin/register" className="hover:text-[#1c1917]">{c.nav.business}</Link>
            <a href="mailto:hello@linehai.app" className="hover:text-[#1c1917]">hello@linehai.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
