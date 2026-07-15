import { motion } from "motion/react";
import { SiteFooter } from "../components/site-footer";

// ── Inline travel illustration ─────────────────────────────────────
function JourneyIllustration() {
  return (
    <svg
      viewBox="0 0 520 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: "520px", height: "auto" }}
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0e0e" />
          <stop offset="100%" stopColor="#2d1a14" />
        </linearGradient>
        <linearGradient id="mountainFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d1a1e" />
          <stop offset="100%" stopColor="#2a1210" />
        </linearGradient>
        <linearGradient id="mountainNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#781216" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#4a0c0e" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1a14" />
          <stop offset="100%" stopColor="#0f0d0b" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8A96E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C8A96E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8A96E" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#781216" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background sky */}
      <rect width="520" height="480" fill="url(#sky)" rx="16" />

      {/* Stars */}
      {[
        [45, 35], [90, 55], [140, 28], [195, 48], [240, 22], [290, 42],
        [340, 30], [390, 55], [440, 25], [480, 48], [60, 80], [170, 72],
        [310, 68], [420, 80], [70, 110], [200, 95], [360, 100], [460, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="#C8A96E" opacity={0.4 + (i % 4) * 0.12} />
      ))}

      {/* Moon */}
      <circle cx="430" cy="70" r="28" fill="url(#moonGlow)" />
      <circle cx="430" cy="70" r="16" fill="#f2d89a" opacity="0.9" />
      <circle cx="438" cy="65" r="12" fill="#2d1a14" />

      {/* Far mountains */}
      <path d="M0 290 L80 170 L160 250 L240 140 L320 230 L400 160 L480 210 L520 180 L520 340 L0 340 Z"
        fill="url(#mountainFar)" opacity="0.8" />

      {/* Near mountains */}
      <path d="M-10 380 L70 240 L140 310 L220 195 L310 280 L390 210 L460 265 L530 240 L530 400 L-10 400 Z"
        fill="url(#mountainNear)" />

      {/* Ground */}
      <path d="M0 380 Q130 360 260 375 Q390 390 520 370 L520 480 L0 480 Z"
        fill="url(#ground)" />

      {/* Winding path */}
      <path d="M260 480 Q260 430 240 410 Q220 390 230 370 Q245 350 260 355 Q275 360 285 345 Q300 325 275 310"
        stroke="#C8A96E" strokeWidth="2" strokeDasharray="5 4" opacity="0.6" strokeLinecap="round" fill="none" />

      {/* Tent */}
      <path d="M225 395 L260 345 L295 395 Z" fill="#781216" opacity="0.9" />
      <path d="M245 395 L260 365 L275 395 Z" fill="#C8A96E" opacity="0.7" />
      <line x1="260" y1="340" x2="260" y2="400" stroke="#C8A96E" strokeWidth="1.5" opacity="0.8" />

      {/* Campfire glow */}
      <ellipse cx="310" cy="400" rx="30" ry="12" fill="url(#fireGlow)" />

      {/* Fire */}
      <path d="M302 400 Q305 385 310 390 Q312 378 315 388 Q319 380 318 397 Q315 402 310 403 Q305 402 302 400 Z"
        fill="#C8A96E" opacity="0.9" />
      <path d="M307 400 Q309 390 311 393 Q313 386 315 394 Q314 401 311 402 Q308 401 307 400 Z"
        fill="#f2d89a" opacity="0.85" />

      {/* Sitting figure */}
      <circle cx="328" cy="390" r="5" fill="#f2ede4" opacity="0.6" />
      <path d="M326 395 Q328 405 330 405 Q332 405 334 395" stroke="#f2ede4" strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* Pine trees */}
      {[[60, 370], [90, 350], [440, 355], [465, 370]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y} L${x - 14} ${y + 30} L${x + 14} ${y + 30} Z`} fill="#1a1612" opacity="0.8" />
          <path d={`M${x} ${y + 10} L${x - 18} ${y + 42} L${x + 18} ${y + 42} Z`} fill="#1a1612" opacity="0.8" />
          <rect x={x - 3} y={y + 40} width="6" height="12" fill="#2a2018" opacity="0.8" />
        </g>
      ))}

      {/* Compass rose — bottom right */}
      <g transform="translate(445, 415)">
        <circle cx="0" cy="0" r="22" stroke="#C8A96E" strokeWidth="1" opacity="0.3" fill="none" />
        <circle cx="0" cy="0" r="3" fill="#C8A96E" opacity="0.6" />
        {/* N S E W marks */}
        <line x1="0" y1="-22" x2="0" y2="-12" stroke="#C8A96E" strokeWidth="1.5" opacity="0.6" />
        <line x1="0" y1="12" x2="0" y2="22" stroke="#C8A96E" strokeWidth="1" opacity="0.35" />
        <line x1="-22" y1="0" x2="-12" y2="0" stroke="#C8A96E" strokeWidth="1" opacity="0.35" />
        <line x1="12" y1="0" x2="22" y2="0" stroke="#C8A96E" strokeWidth="1" opacity="0.35" />
        <path d="M0 -18 L3 -8 L0 -5 L-3 -8 Z" fill="#C8A96E" opacity="0.7" />
        <text x="0" y="-26" textAnchor="middle" fill="#C8A96E" fontSize="7" fontFamily="Poppins, sans-serif" fontWeight="600" opacity="0.6">N</text>
      </g>

      {/* Floating quote mark decoration */}
      <text x="50" y="350" fill="#C8A96E" fontSize="80" fontFamily="Georgia, serif" opacity="0.07" fontWeight="700">"</text>
    </svg>
  );
}

// ── Founders data ──────────────────────────────────────────────────
const FOUNDERS = [
  {
    name: "Donyi Camder Tok",
    role: "Co-Founder & Head of Operations",
    avatar: "/images/Donyi Camder Tok.jpg",
    imagePosition: "center bottom",
    description: "Arunachal is home, and Donyi knows it like the back of his hand. The mastermind behind our on-ground operations, he turns every itinerary into a seamless adventure through his local expertise, trusted network, and knack for making things happen.",
    emoji: "🏕",
  },
  {
    name: "Kaustav Banerjee",
    role: "Co-Founder & Head of Technology",
    avatar: "/images/Kaustav Banerjee.jpg",
    description: "A traveller at heart with a knack for all things digital, Kaustav looks after Hangover Trails' digital presence—from the website to the technology that keeps things running smoothly behind the scenes. His focus is simple: making every interaction with Hangover Trails as seamless as the journeys themselves.",
    emoji: "🎵",
  },
  {
    name: "Sandeep Kumar Singh",
    role: "Co-Founder & Head of Marketing and Sales",
    avatar: "/images/Sandeep Kumar Singh.jpg",
    imagePosition: "center bottom",
    description: "A passionate traveller and avid biker, Sandeep is always chasing the next road less travelled. When he's not out on a weekend ride, he's shaping Hangover Trails' digital presence—crafting stories, capturing experiences, and bringing our adventures to life, both online and on the ground.",
    emoji: "🗺",
  },
];

// ── Page ──────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="about-page" style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        .about-page {
          overflow-x: clip;
        }

        @media (max-width: 767px) {
          .about-hero-inner {
            padding: 6.5rem 1.25rem 3.5rem !important;
          }

          .about-hero-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 2.75rem !important;
          }

          .about-hero-illustration {
            width: 100%;
            max-width: 30rem;
            margin: 0 auto;
          }

          .about-stats {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.25rem !important;
            margin-top: 2rem !important;
            padding-top: 1.5rem !important;
          }

          .about-values-grid,
          .about-founder-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .about-founder-photo {
            aspect-ratio: 4 / 3 !important;
          }

          .about-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .about-actions a {
            justify-content: center;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .about-values-grid,
          .about-founder-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      {/* ════════════════════════════════
          HERO — Origin story + illustration
      ════════════════════════════════ */}
      <section style={{ background: "#1e1a14", overflow: "hidden", position: "relative" }}>
        {/* Subtle texture dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(200,169,110,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

        <div className="about-hero-inner" style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(6rem,12vw,9rem) clamp(1.5rem,5vw,6rem) clamp(4rem,8vw,6rem)", position: "relative", zIndex: 1 }}>
          <div className="about-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(3rem,6vw,8rem)", alignItems: "center" }}>

            {/* Left: story */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <p style={{ color: "#C8A96E", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "24px", height: "1.5px", background: "#C8A96E", display: "inline-block" }} />
                Our Story
              </p>

              <h1 style={{ color: "#f2ede4", fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 0 28px" }}>
                Why did we start{" "}
                <em style={{ color: "#C8A96E", fontStyle: "italic" }}>Hangover?</em>
              </h1>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {[
                  "It started in a dhaba in Ziro Valley, 2023. Three friends sat around a table with rice beer, no phone signal, and a question none of them could stop thinking about — why does travel in India feel so transactional? Book a package, see a monument, take a photo, go home.",
                  "We'd all been travelling for years. We'd done the Instagram spots. We'd done the group tours with 40 strangers who never spoke. And somewhere on a rice paddy ridge at dawn, watching a farmer tend his fields exactly as his grandfather had, we decided something needed to change.",
                  "Hangover Trails was built around a single idea — that the best travel is the kind that leaves you changed. Not because you saw something beautiful, but because you were part of something real. A community, a culture, a moment that couldn't be replicated on a screen.",
                  "The name? Because the feeling lasts long after you've come home.",
                ].map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                    style={{
                      color: i === 3 ? "rgba(200,169,110,0.85)" : "rgba(242,237,228,0.62)",
                      fontSize: "clamp(0.85rem,1.3vw,0.96rem)",
                      fontWeight: i === 3 ? 400 : 300,
                      lineHeight: 1.85,
                      margin: 0,
                      fontStyle: i === 3 ? "italic" : "normal",
                    }}
                  >
                    {para}
                  </motion.p>
                ))}
              </div>

              {/* Stat strip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="about-stats"
                style={{ display: "flex", gap: "clamp(1.5rem,3vw,3rem)", marginTop: "36px", paddingTop: "28px", borderTop: "1px solid rgba(242,237,228,0.08)" }}
              >
                {[
                  { num: "2023",  label: "Founded" },
                  { num: "100+",  label: "Travelers" },
                  { num: "3",     label: "Co-Founders" },
                  { num: "4.9★",  label: "Avg Rating" },
                ].map(({ num, label }) => (
                  <div key={label}>
                    <p style={{ color: "#C8A96E", fontSize: "clamp(1.2rem,2vw,1.6rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, margin: "0 0 4px" }}>{num}</p>
                    <p style={{ color: "rgba(242,237,228,0.35)", fontSize: "0.6rem", fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: illustration */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
              className="about-hero-illustration"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <JourneyIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          VALUES — what we stand for
      ════════════════════════════════ */}
      <section style={{ background: "#f5f0e6", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "clamp(4rem,8vw,6rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ marginBottom: "clamp(2.5rem,5vw,4rem)" }}>
            <p style={{ color: "#781216", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "12px" }}>/ What We Stand For</p>
            <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}>
              The things we refuse{" "}
              <em style={{ color: "#781216", fontStyle: "italic" }}>to compromise on.</em>
            </h2>
          </motion.div>

          <div className="about-values-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {[
              { icon: "🏕", title: "Real Over Packaged", body: "We don't book monuments. We design experiences — the kind where you wake up at dawn in a valley with no agenda and find that's exactly what you needed." },
              { icon: "🤝", title: "Community First", body: "Every trip is small by design. 8–16 people maximum. Because real connection doesn't happen in groups of 50 and a tour guide with a flag." },
              { icon: "🗺", title: "Honest Itineraries", body: "We don't promise what we can't deliver. If a road closes in winter, we tell you. If a trek is hard, we say so. Trust is the only currency we care about." },
              { icon: "🏔", title: "Northeast as Identity", body: "Most travel companies treat the Northeast as an afterthought. We built our entire foundation here. This is home — and we know every trail, tribe and tea shop." },
              { icon: "🌱", title: "Leave It Better", body: "Our community cleanups, homestay partnerships and local guide hiring aren't PR moves. They're the only way we know how to travel." },
              { icon: "✨", title: "The Hangover Effect", body: "We're obsessed with one outcome — that weeks after you've returned, you're still thinking about what happened. That's when we know we did our job." },
            ].map((v, i) => (
              <motion.div key={v.title}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                style={{ background: "#ffffff", border: "1px solid rgba(30,26,20,0.07)", borderRadius: "12px", padding: "26px 24px", boxShadow: "0 2px 8px rgba(30,26,20,0.04)" }}>
                <span style={{ fontSize: "1.6rem", display: "block", marginBottom: "14px" }}>{v.icon}</span>
                <h3 style={{ color: "#1e1a14", fontSize: "0.95rem", fontWeight: 500, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{v.title}</h3>
                <div style={{ width: "20px", height: "1.5px", background: "#781216", borderRadius: "1px", marginBottom: "12px" }} />
                <p style={{ color: "rgba(30,26,20,0.58)", fontSize: "0.8rem", fontWeight: 300, lineHeight: 1.75, margin: 0 }}>{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          FOUNDERS
      ════════════════════════════════ */}
      <section style={{ background: "#1e1a14", borderTop: "1px solid rgba(0,0,0,0.15)", padding: "clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,6rem)", position: "relative", overflow: "hidden" }}>
        {/* Subtle dot texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(200,169,110,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ marginBottom: "clamp(3rem,5vw,5rem)" }}>
            <p style={{ color: "#C8A96E", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "14px" }}>/ The Founders</p>
            <h2 style={{ color: "#f2ede4", fontSize: "clamp(1.8rem,3.5vw,3rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 14px", maxWidth: "720px" }}>
              The people who were in{" "}
              <em style={{ color: "#C8A96E", fontStyle: "italic" }}>"Hangover"</em>{" "}
              while building this.
            </h2>
            <p style={{ color: "rgba(242,237,228,0.42)", fontSize: "0.88rem", fontWeight: 300, lineHeight: 1.8, maxWidth: "520px", margin: 0 }}>
              Three people, one valley, and a shared belief that travel could mean something more. Here's the team that made Hangover Trails real.
            </p>
          </motion.div>

          <div className="about-founder-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
            {FOUNDERS.map((f, i) => (
              <motion.div key={f.name}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                style={{ display: "flex", flexDirection: "column" }}
              >
                {/* Photo with frame */}
                <div style={{ position: "relative", marginBottom: "22px" }}>
                  <div className="about-founder-photo" style={{ aspectRatio: "3/4", borderRadius: "12px", overflow: "hidden", background: "#2a2018" }}>
                    <img src={f.avatar} alt={f.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: f.imagePosition, filter: "grayscale(0.2)", display: "block" }} />
                    {/* Gradient on photo */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(30,26,20,0.8) 0%, transparent 55%)", borderRadius: "12px" }} />
                    {/* Role badge on photo */}
                    <div style={{ position: "absolute", bottom: "14px", left: "14px", right: "14px" }}>
                      <p style={{ color: "#C8A96E", fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 3px" }}>{f.emoji} {f.role}</p>
                      <h3 style={{ color: "#f2ede4", fontSize: "1.15rem", fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.25 }}>{f.name}</h3>
                    </div>
                  </div>
                  {/* Gold corner accent */}
                  <div style={{ position: "absolute", top: "10px", right: "10px", width: "20px", height: "20px", borderTop: "1.5px solid #C8A96E", borderRight: "1.5px solid #C8A96E", borderRadius: "0 4px 0 0" }} />
                </div>

                {/* Description */}
                <div style={{ borderLeft: "2px solid rgba(200,169,110,0.35)", paddingLeft: "16px", marginBottom: "14px", flex: 1 }}>
                  <p style={{ color: "rgba(242,237,228,0.7)", fontSize: "0.83rem", fontWeight: 300, lineHeight: 1.75, margin: 0 }}>
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          CLOSING — what comes next
      ════════════════════════════════ */}
      <section style={{ background: "#f5f0e6", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "clamp(4rem,8vw,6rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p style={{ color: "#781216", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "16px" }}>/ What's Next</p>
            <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 20px" }}>
              We're just getting{" "}
              <em style={{ color: "#781216", fontStyle: "italic" }}>started.</em>
            </h2>
            <p style={{ color: "rgba(30,26,20,0.58)", fontSize: "clamp(0.88rem,1.3vw,1rem)", fontWeight: 300, lineHeight: 1.85, margin: "0 0 32px" }}>
              100 travelers in, 12 trips running, 3 institute collaborations signed — and we still treat every booking like it's the first one. The Northeast is big. India is massive. The world has barely been touched. We plan to change that — one small group at a time.
            </p>
            <div className="about-actions" style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <a href="/trips" style={{ background: "#781216", color: "#fff", padding: "13px 28px", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "7px", transition: "background 0.25s ease", borderRadius: "4px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#9a1a1f")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#781216")}>
                See Our Trips
              </a>
              <a href="/#more-about" style={{ background: "transparent", color: "rgba(30,26,20,0.65)", border: "1.5px solid rgba(30,26,20,0.18)", padding: "13px 24px", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", transition: "border-color 0.25s, color 0.25s", borderRadius: "4px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#781216"; (e.currentTarget as HTMLAnchorElement).style.color = "#781216"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(30,26,20,0.18)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(30,26,20,0.65)"; }}>
                Read Our Story
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
