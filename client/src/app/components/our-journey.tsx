import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValue, useTransform, MotionValue } from "motion/react";
import { Lightbulb, MapPin, User, Users, GraduationCap, Music2, Flame } from "lucide-react";

// Curvy path: smooth S-curve through all 7 node positions
// viewBox coords: (cx, cy) within "0 0 1200 110"
const SVG_PATH =
  "M 30,55 C 87,55 143,22 200,22 C 267,22 333,85 400,85 C 467,85 533,32 600,32 C 667,32 733,88 800,88 C 867,88 933,25 1000,25 C 1057,25 1113,55 1170,55";

const MILESTONES = [
  {
    id: 1, period: "Jan 2023", title: "Idea Conceived", tagline: "The spark.",
    desc: "Two wanderers with a stubborn belief that travel should feel more human — and less like a package tour. Scribbled on a napkin in a Ziro dhaba.",
    icon: Lightbulb, above: false,
    cx: 30, cy: 55,   // on the curve, middle height
  },
  {
    id: 2, period: "Mar 2023", title: "First Trip Conducted", tagline: "We just went.",
    desc: "Eight people, one valley, zero expectations. Arunachal Pradesh taught us everything we needed to know about building experiences that last.",
    icon: MapPin, above: true,
    cx: 200, cy: 22,  // peak — label above
  },
  {
    id: 3, period: "May 2023", title: "First Paying Traveler", tagline: "Someone believed.",
    desc: "A stranger paid us real money to take them somewhere real. That single act of trust became the foundation of everything Hangover Trails stands for.",
    icon: User, above: false,
    cx: 400, cy: 85,  // valley — label below
  },
  {
    id: 4, period: "Sep 2023", title: "50 Travelers Milestone", tagline: "A community formed.",
    desc: "Fifty stories, fifty homecomings, fifty people who came back changed. We knew then — this wasn't a side project anymore.",
    icon: Users, above: true,
    cx: 600, cy: 32,  // peak
  },
  {
    id: 5, period: "Jan 2024", title: "Institute Collaborations", tagline: "Education meets adventure.",
    desc: "Universities and colleges began trusting us with their students. Educational travel got a soul — field trips became field experiences.",
    icon: GraduationCap, above: false,
    cx: 800, cy: 88,  // valley
  },
  {
    id: 6, period: "Aug 2024", title: "Festival Partnerships", tagline: "Culture came alive.",
    desc: "We partnered with India's most raw and authentic festivals — Ziro Music Festival, Hornbill, Rann Utsav. Hangover Trails became a festival home.",
    icon: Music2, above: true,
    cx: 1000, cy: 25, // peak
  },
  {
    id: 7, period: "Feb 2025", title: "Community Events", tagline: "Beyond the trip.",
    desc: "Bonfires before departures, meetups between journeys, reunions after them. Hangover Trails stopped being a travel company and became a tribe.",
    icon: Flame, above: true,
    cx: 1170, cy: 55, // end, middle
  },
];

// Glowing dot that tracks the drawn tip of the path
// Uses a short stroke with a large dashoffset that equals total-length minus drawn amount
function GlowDot({ path, pathLength }: { path: string; pathLength: MotionValue<number> }) {
  const ref = useRef<SVGPathElement>(null);
  const [total, setTotal] = useState(1500);

  useEffect(() => {
    if (ref.current) setTotal(ref.current.getTotalLength());
  }, []);

  const dashOffset = useTransform(pathLength, (v) => total - v * total);

  return (
    <>
      {/* Hidden path used only to measure total length */}
      <path ref={ref} d={path} fill="none" stroke="none" />
      {/* Dot: a tiny stroke-dasharray="1 big" shifted so only the 1px tip shows */}
      <motion.path
        d={path}
        fill="none"
        stroke="#781216"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`1 ${total}`}
        style={{ strokeDashoffset: dashOffset, filter: "drop-shadow(0 0 6px rgba(120,18,22,0.9))" }}
      />
    </>
  );
}

// Window-scroll progress hook — avoids the non-static container warning
function useElementScrollProgress(ref: React.RefObject<HTMLDivElement | null>) {
  const { scrollY } = useScroll();
  const progress = useMotionValue(0);

  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const curr = scrollY.get();
      const docTop = el.getBoundingClientRect().top + curr;
      const height = el.offsetHeight;
      const vh = window.innerHeight;
      const raw = (curr - docTop) / Math.max(1, height - vh);
      progress.set(Math.max(0, Math.min(1, raw)));
    };
    const unsub = scrollY.on("change", update);
    window.addEventListener("resize", update);
    const t = setTimeout(update, 60);
    return () => { unsub(); window.removeEventListener("resize", update); clearTimeout(t); };
  }, [scrollY, progress, ref]);

  return progress;
}

export function OurJourney() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useElementScrollProgress(sectionRef);

  // Drive active milestone from scroll
  useEffect(() => {
    const unsub = scrollProgress.on("change", (v) => {
      const idx = Math.min(Math.floor(v * MILESTONES.length), MILESTONES.length - 1);
      setActive(idx);
    });
    return unsub;
  }, [scrollProgress]);

  // Drive the path drawing: 0 → 1 across the scroll section
  const pathLength = useTransform(scrollProgress, [0, 1], [0, 1]);

  const milestone = MILESTONES[active];
  const Icon = milestone.icon;

  // SVG viewBox dimensions for % → px conversion
  const SVG_W = 1200;
  const SVG_H = 110;
  // Container height including space for labels above/below the curve
  const CONTAINER_H = 180;
  const LABEL_SPACE = 35; // px above top of SVG canvas for "above" labels

  return (
    <>
      {/* Tall scroll driver — 100vh per milestone */}
      <div
        ref={sectionRef}
        style={{
          height: `${MILESTONES.length * 100}vh`,
          position: "relative",
          background: "#f5f0e6",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* Sticky viewport */}
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontFamily: "'Poppins', sans-serif",
            overflow: "hidden",
          }}
        >
          <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "0 clamp(1.5rem,5vw,6rem)" }}>

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "clamp(1.2rem,2.5vh,2rem)" }}>
              <div>
                <p style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "8px" }}>
                  / Our Journey
                </p>
                <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.6rem,3vw,2.6rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}>
                  From a napkin sketch to{" "}
                  <em style={{ color: "#b8943a", fontStyle: "italic" }}>a movement.</em>
                </h2>
              </div>
              <p style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                Scroll to explore ↓
              </p>
            </div>

            {/* Active detail card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: milestone.above ? -16 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: milestone.above ? 10 : -10 }}
                transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.08)",
                  borderLeft: "3px solid #b8943a",
                  borderRadius: "12px",
                  padding: "clamp(16px,2vw,26px) clamp(18px,2.5vw,30px)",
                  marginBottom: "clamp(1rem,2.5vh,2rem)",
                  boxShadow: "0 4px 24px rgba(30,26,20,0.06)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "18px",
                  maxWidth: "600px",
                  marginLeft: milestone.above ? 0 : "auto",
                  marginRight: milestone.above ? "auto" : 0,
                }}
              >
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(184,148,58,0.1)", border: "1.5px solid rgba(184,148,58,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} color="#b8943a" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <span style={{ color: "#b8943a", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase" }}>{milestone.period}</span>
                    <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(30,26,20,0.2)", display: "inline-block" }} />
                    <span style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.62rem", fontStyle: "italic" }}>{milestone.tagline}</span>
                  </div>
                  <h3 style={{ color: "#1e1a14", fontSize: "clamp(0.9rem,1.4vw,1.05rem)", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.3, margin: "0 0 6px" }}>{milestone.title}</h3>
                  <p style={{ color: "rgba(30,26,20,0.58)", fontSize: "0.82rem", fontWeight: 300, lineHeight: 1.72, margin: 0 }}>{milestone.desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* ── Curvy SVG Timeline ── */}
            <div style={{ position: "relative", width: "100%", height: `${CONTAINER_H}px` }}>
              <svg
                width="100%"
                height={SVG_H}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  top: `${LABEL_SPACE}px`,
                  left: 0,
                  overflow: "visible",
                }}
              >
                {/* Ghost path — full route, muted */}
                <path
                  d={SVG_PATH}
                  stroke="rgba(30,26,20,0.1)"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="5 8"
                />

                {/* Animated brand-crimson path — drawn as user scrolls */}
                <motion.path
                  d={SVG_PATH}
                  stroke="#781216"
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  style={{ pathLength }}
                />

                {/* Glowing dot at the tip of drawn path — positioned via stroke-dashoffset trick */}
                <GlowDot path={SVG_PATH} pathLength={pathLength} />

                {/* Milestone nodes */}
                {MILESTONES.map((m, i) => {
                  const isActive = i === active;
                  const isPast = i <= active;
                  return (
                    <g key={m.id} style={{ cursor: "pointer" }} onClick={() => setActive(i)}>
                      {/* Outer halo ring */}
                      <circle
                        cx={m.cx} cy={m.cy} r={18}
                        fill="rgba(184,148,58,0.1)"
                        stroke="rgba(184,148,58,0.2)"
                        strokeWidth={1}
                        style={{ opacity: isActive ? 1 : 0, transition: "opacity 0.3s ease" }}
                      />
                      {/* Node circle — plain SVG, no motion.circle to avoid r animation issues */}
                      <circle
                        cx={m.cx} cy={m.cy}
                        r={isActive ? 11 : 7}
                        fill={isActive ? "#781216" : isPast ? "rgba(120,18,22,0.2)" : "#ede8dc"}
                        stroke={isActive ? "#781216" : isPast ? "rgba(120,18,22,0.5)" : "rgba(30,26,20,0.15)"}
                        strokeWidth={1.5}
                        style={{ transition: "r 0.3s ease, fill 0.3s ease, stroke 0.3s ease" }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Overlay: node labels (HTML for Poppins + rich layout) */}
              {MILESTONES.map((m, i) => {
                const isActive = i === active;
                const isPast = i <= active;
                // Convert SVG coords → % / px
                const leftPct = (m.cx / SVG_W) * 100;
                // SVG is positioned at top: LABEL_SPACE, height: SVG_H
                const nodePxFromContainerTop = LABEL_SPACE + m.cy;

                return (
                  <button
                    key={m.id}
                    onClick={() => setActive(i)}
                    style={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      top: `${nodePxFromContainerTop}px`,
                      transform: "translate(-50%, 0)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      pointerEvents: "auto",
                      zIndex: 3,
                    }}
                  >
                    {m.above ? (
                      // Label ABOVE node
                      <div style={{ position: "absolute", bottom: "calc(100% + 14px)", left: "50%", transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ display: "block", fontFamily: "'Poppins', sans-serif", fontSize: "0.63rem", fontWeight: isActive ? 600 : 400, color: isActive ? "#1e1a14" : "rgba(30,26,20,0.45)", lineHeight: 1.3, transition: "color 0.2s" }}>
                          {m.title}
                        </span>
                        <span style={{ display: "block", fontFamily: "'Poppins', sans-serif", fontSize: "0.55rem", fontWeight: 500, color: isActive ? "#b8943a" : isPast ? "rgba(184,148,58,0.6)" : "rgba(30,26,20,0.28)", letterSpacing: "0.1em", marginTop: "1px", transition: "color 0.2s" }}>
                          {m.period}
                        </span>
                      </div>
                    ) : (
                      // Label BELOW node
                      <div style={{ position: "absolute", top: "calc(100% + 14px)", left: "50%", transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ display: "block", fontFamily: "'Poppins', sans-serif", fontSize: "0.55rem", fontWeight: 500, color: isActive ? "#b8943a" : isPast ? "rgba(184,148,58,0.6)" : "rgba(30,26,20,0.28)", letterSpacing: "0.1em", marginBottom: "1px", transition: "color 0.2s" }}>
                          {m.period}
                        </span>
                        <span style={{ display: "block", fontFamily: "'Poppins', sans-serif", fontSize: "0.63rem", fontWeight: isActive ? 600 : 400, color: isActive ? "#1e1a14" : "rgba(30,26,20,0.45)", lineHeight: 1.3, transition: "color 0.2s" }}>
                          {m.title}
                        </span>
                      </div>
                    )}
                    {/* Invisible hit area */}
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "clamp(0.8rem,2vh,1.5rem)", paddingTop: "8px", borderTop: "1px solid rgba(30,26,20,0.06)" }}>
              <span style={{ color: "rgba(30,26,20,0.3)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {String(active + 1).padStart(2, "0")} / {String(MILESTONES.length).padStart(2, "0")} milestones
              </span>
              <div style={{ display: "flex", gap: "5px" }}>
                {MILESTONES.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? "16px" : "4px", height: "2px", borderRadius: "1px", background: i === active ? "#b8943a" : "rgba(30,26,20,0.16)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.4s ease, background 0.3s ease" }} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile: vertical tap-to-expand */}
      <div
        className="md:hidden"
        style={{ background: "#f5f0e6", padding: "clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,2.5rem)", fontFamily: "'Poppins', sans-serif", borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <p style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "10px" }}>/ Our Journey</p>
        <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.7rem,5vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: "clamp(2rem,5vw,3rem)" }}>
          From a napkin sketch to{" "}<em style={{ color: "#b8943a", fontStyle: "italic" }}>a movement.</em>
        </h2>
        <div style={{ position: "relative", paddingLeft: "34px" }}>
          <div style={{ position: "absolute", left: "9px", top: "6px", bottom: "6px", width: "1.5px", background: "linear-gradient(to bottom, #781216, rgba(120,18,22,0.12))" }} />
          {MILESTONES.map((m, i) => {
            const isActive = i === active;
            const MIcon = m.icon;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45, delay: i * 0.05 }} onClick={() => setActive(i)} style={{ position: "relative", marginBottom: i < MILESTONES.length - 1 ? "26px" : 0, cursor: "pointer" }}>
                <div style={{ position: "absolute", left: "-28px", top: "5px", width: isActive ? "20px" : "15px", height: isActive ? "20px" : "15px", borderRadius: "50%", background: isActive ? "#781216" : "rgba(120,18,22,0.15)", border: `2px solid ${isActive ? "#781216" : "rgba(120,18,22,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", boxShadow: isActive ? "0 0 0 5px rgba(120,18,22,0.12)" : "none", marginLeft: isActive ? "-2.5px" : "0", marginTop: isActive ? "-2.5px" : "0" }}>
                  <MIcon size={isActive ? 9 : 6} color={isActive ? "#ffffff" : "#781216"} strokeWidth={2} />
                </div>
                <div style={{ background: isActive ? "#ffffff" : "transparent", border: isActive ? "1px solid rgba(30,26,20,0.08)" : "none", borderLeft: isActive ? "2.5px solid #781216" : "none", borderRadius: "10px", padding: isActive ? "14px 16px" : "3px 0", transition: "all 0.3s ease", boxShadow: isActive ? "0 3px 14px rgba(30,26,20,0.06)" : "none" }}>
                  <span style={{ color: "#781216", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>{m.period}</span>
                  <h4 style={{ color: "#1e1a14", fontSize: isActive ? "0.92rem" : "0.85rem", fontWeight: isActive ? 500 : 400, margin: "3px 0 0", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{m.title}</h4>
                  <AnimatePresence>
                    {isActive && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ color: "rgba(30,26,20,0.58)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.7, margin: "6px 0 0", overflow: "hidden" }}>
                        {m.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
