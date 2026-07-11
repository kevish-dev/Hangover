import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, GraduationCap, Lightbulb, MapPin, Music2, User, Users } from "lucide-react";
import { apiClient } from "../../lib/axios";

interface Milestone { id: string; period: string; title: string; tagline: string; description: string; iconName: string; }
const icons = { Lightbulb, MapPin, User, Users, GraduationCap, Music2, Flame };

export function OurJourney() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => { let cancelled = false; apiClient.get("/landing-content/journey").then(r => { if (!cancelled) setMilestones(r.data?.data || []); }).catch(() => { if (!cancelled) setMilestones([]); }); return () => { cancelled = true; }; }, []);
  if (!milestones.length) return null;
  const current = milestones[Math.min(active, milestones.length - 1)];
  const Icon = icons[current.iconName as keyof typeof icons] || MapPin;
  return <section style={{ background: "#f5f0e6", borderTop: "1px solid rgba(0,0,0,0.06)", fontFamily: "'Poppins', sans-serif", padding: "clamp(3rem,6vw,6rem) clamp(1.5rem,5vw,6rem)" }}>
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <p style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "10px" }}>/ Our Journey</p>
      <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.7rem,4vw,3.1rem)", fontWeight: 300, lineHeight: 1.15, margin: "0 0 clamp(2rem,5vw,3.5rem)" }}>From a napkin sketch to <em style={{ color: "#b8943a" }}>a movement.</em></h2>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] gap-8 md:gap-14 items-start">
        <div className="relative pl-8 md:pl-0">
          <div className="absolute left-2 md:left-0 top-2 bottom-2 w-px bg-[#781216]/25" />
          {milestones.map((item, index) => { const ItemIcon = icons[item.iconName as keyof typeof icons] || MapPin; const selected = index === active; return <button key={item.id} type="button" onClick={() => setActive(index)} className="relative block w-full text-left mb-5 md:pl-10" style={{ background: "none", border: "none", paddingRight: 0, cursor: "pointer" }}>
            <span className="absolute -left-7 md:-left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: selected ? "#781216" : "#f5f0e6", border: "2px solid #781216" }}><ItemIcon size={selected ? 10 : 8} color={selected ? "#fff" : "#781216"} /></span>
            <span style={{ color: "#b8943a", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{item.period}</span>
            <strong className="block" style={{ color: "#1e1a14", fontSize: "0.95rem", marginTop: 3 }}>{item.title}</strong>
          </button>; })}
        </div>
        <AnimatePresence mode="wait"><motion.article key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ background: "#fff", borderLeft: "3px solid #b8943a", padding: "clamp(1.25rem,3vw,2rem)", boxShadow: "0 4px 20px rgba(30,26,20,0.06)" }}>
          <div className="flex items-center gap-3 mb-3"><span className="w-9 h-9 rounded-full grid place-items-center bg-[#b8943a]/10"><Icon size={16} color="#b8943a" /></span><span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.72rem", fontStyle: "italic" }}>{current.tagline}</span></div>
          <p style={{ color: "#b8943a", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>{current.period}</p><h3 style={{ color: "#1e1a14", fontSize: "1.25rem", margin: "6px 0 10px" }}>{current.title}</h3><p style={{ color: "rgba(30,26,20,0.62)", fontSize: "0.88rem", lineHeight: 1.75, margin: 0 }}>{current.description}</p>
        </motion.article></AnimatePresence>
      </div>
    </div>
  </section>;
}
