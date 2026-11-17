import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { apiClient } from "../../lib/axios";

interface Footprint { id: string; value: number; suffix: string; label: string; sublabel: string; }

/* ── animated counter hook ─────────────────────────────────────── */
function useCountUp(
  target: number,
  decimals = 0,
  duration = 2200
): { count: string; ref: React.RefObject<HTMLDivElement> } {
  const [count, setCount] = useState("0");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setCount((eased * target).toFixed(decimals));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, decimals, duration]);

  return { count, ref };
}

/* ── single stat ───────────────────────────────────────────────── */
function Stat({ stat, index }: { stat: Footprint; index: number }) {
  const { count, ref } = useCountUp(stat.value, 0, 2000 + index * 120);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.08 }}
      style={{
        flex: "1 1 0",
        padding: "clamp(1.5rem,3vw,2.5rem) clamp(1rem,2.5vw,2rem)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        position: "relative",
      }}
    >
      {/* vertical rule — hide on first item */}
      {index > 0 && (
        <div style={{
          position: "absolute",
          left: 0,
          top: "20%",
          height: "60%",
          width: "1px",
          background: "rgba(30,26,20,0.1)",
        }} />
      )}

      {/* number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "2px", marginBottom: "10px" }}>
        <span style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "clamp(2.8rem, 5vw, 4.5rem)",
          fontWeight: 300,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: "#1e1a14",
        }}>
          {count}
        </span>
        <span style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "clamp(1.6rem, 3vw, 2.6rem)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: "#b8943a",
        }}>
          {stat.suffix}
        </span>
      </div>

      {/* label */}
      <p style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "clamp(0.78rem, 1.2vw, 0.92rem)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: "rgba(30,26,20,0.88)",
        margin: "0 0 4px",
        lineHeight: 1.3,
      }}>
        {stat.label}
      </p>
      <p style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "0.65rem",
        fontWeight: 400,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(30,26,20,0.42)",
        margin: 0,
      }}>
        {stat.sublabel}
      </p>
    </motion.div>
  );
}

/* ── main export ───────────────────────────────────────────────── */
export function OurFootprints() {
  const [stats, setStats] = useState<Footprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { let cancelled = false; apiClient.get("/landing-content/footprints").then(r => { if (!cancelled) setStats(r.data?.data || []); }).catch(() => { if (!cancelled) setStats([]); }).finally(() => { if (!cancelled) setIsLoading(false); }); return () => { cancelled = true; }; }, []);
  if (!isLoading && stats.length === 0) return null;
  return (
    <section
      style={{
        background: "#f5f0e6",
        borderTop: "1px solid rgba(0,0,0,0.1)",
        fontFamily: "'Poppins', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle photo texture in background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?w=1600&h=800&fit=crop&auto=format&q=60)`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />

      {/* Large watermark text */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        overflow: "hidden",
      }}>
        <span style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "clamp(6rem,18vw,18rem)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "rgba(30,26,20,0.04)",
          whiteSpace: "nowrap",
          userSelect: "none",
          lineHeight: 1,
        }}>
          FOOTPRINTS
        </span>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,6rem)", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "20px", marginBottom: "clamp(2.5rem,5vw,4.5rem)" }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "14px" }}
            >
              / Our Footprints
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.1 }}
              style={{ color: "#1e1a14", fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}
            >
              Every number here is{" "}
              <em style={{ color: "#b8943a", fontStyle: "italic" }}>a story.</em>
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{ color: "rgba(30,26,20,0.52)", fontSize: "0.82rem", fontWeight: 300, lineHeight: 1.9, maxWidth: "300px", margin: 0 }}
          >
            We're small by choice — every traveler who books with us gets personal attention, real care, and a trip worth remembering.
          </motion.p>
        </div>

        {/* ── Gold divider ── */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ height: "1px", background: "linear-gradient(to right, #b8943a, rgba(184,148,58,0.15))", marginBottom: "0", transformOrigin: "left" }}
        />

        {/* ── Stats grid ── */}
        <div
          style={{ display: "flex", flexWrap: "wrap" }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        >
          {stats.map((stat, i) => (
            <Stat key={stat.label} stat={stat} index={i} />
          ))}
        </div>

        {/* ── Bottom divider ── */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          style={{ height: "1px", background: "linear-gradient(to right, rgba(184,148,58,0.15), #b8943a, rgba(184,148,58,0.15))", transformOrigin: "left", marginBottom: "clamp(2rem,4vw,3rem)" }}
        />

        {/* ── Trust line ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}
        >
          <p style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
            Est. 2023 · Hangover Trails
          </p>
        </motion.div>

      </div>
    </section>
  );
}
