import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, Home, Heart, GraduationCap, Mountain, Compass
} from "lucide-react";
import { apiClient } from "../../lib/axios";

interface LandingTripType {
  id: string;
  label: string;
  description: string;
  tag: string;
  imageUrl: string;
  iconName: string;
}

const iconMap = { Users, Home, Heart, GraduationCap, Mountain, Compass };

const ITEM_H = 64;

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

const getStatus = (index: number, current: number, total: number) => {
  const d = index - current;
  const n = d > total / 2 ? d - total : d < -total / 2 ? d + total : d;
  if (n === 0) return "active";
  if (n === -1) return "prev";
  if (n === 1) return "next";
  return "hidden";
};

export function TripTypes() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [trips, setTrips] = useState<LandingTripType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const current = trips.length ? ((step % trips.length) + trips.length) % trips.length : 0;
  const next = useCallback(() => setStep((s) => s + 1), []);

  const handleChip = (i: number) => {
    const diff = (i - current + trips.length) % trips.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    let cancelled = false;
    apiClient.get("/landing-trip-types")
      .then((response) => {
        if (!cancelled && Array.isArray(response.data?.data)) setTrips(response.data.data);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused || trips.length < 2) return;
    const id = setInterval(next, 3200);
    return () => clearInterval(id);
  }, [next, paused, trips.length]);

  if (!isLoading && trips.length === 0) return null;

  return (
    <section
      style={{
        background: "#f5f0e6",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "'Poppins', sans-serif",
        padding: "clamp(3rem,6vw,5rem) clamp(1rem,3vw,3rem)",
      }}
    >
      {/* Section header */}
      <div style={{ maxWidth: "1280px", margin: "0 auto 2.5rem" }}>
        <p style={{ color: "#b8943a", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "10px" }}>
          / Types of Trips
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}>
            Pick your kind of{" "}
            <em style={{ color: "#b8943a", fontStyle: "italic" }}>hangover.</em>
          </h2>
          <p style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.8, maxWidth: "280px", margin: 0 }}>
            Every trip is designed around a specific kind of wanderer. Find yours.
          </p>
        </div>
      </div>

      {/* Main carousel card */}
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            borderRadius: "clamp(1rem, 5vw, 2.5rem)",
            overflow: "hidden",
            display: "flex",
            minHeight: "520px",
          }}
          className="flex-col lg:flex-row"
        >
          {/* ── LEFT: colored drum scroll ── */}
          <div
            style={{
              background: "#1e1a14",
              position: "relative",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: "clamp(1.5rem, 6vw, 2rem) clamp(1rem, 6vw, 2.5rem)",
              minHeight: "300px",
            }}
            className="hidden lg:flex lg:w-[38%]"
          >
            {/* top/bottom fades */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "90px", background: "linear-gradient(to bottom, #1e1a14 20%, transparent)", zIndex: 3, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "90px", background: "linear-gradient(to top, #1e1a14 20%, transparent)", zIndex: 3, pointerEvents: "none" }} />

            {/* drum */}
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", zIndex: 2 }}>
              {trips.map((trip, i) => {
                const isActive = i === current;
                const dist = i - current;
                const wrapped = wrap(-(trips.length / 2), trips.length / 2, dist);
                const Icon = iconMap[trip.iconName as keyof typeof iconMap] || Compass;

                return (
                  <motion.div
                    key={trip.id}
                    style={{ height: ITEM_H, position: "absolute", width: "100%" }}
                    animate={{
                      y: wrapped * ITEM_H,
                      opacity: 1 - Math.abs(wrapped) * 0.2,
                    }}
                    transition={{ type: "spring", stiffness: 90, damping: 22, mass: 1 }}
                  >
                    <button
                      onClick={() => handleChip(i)}
                      onMouseEnter={() => setPaused(true)}
                      onMouseLeave={() => setPaused(false)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 22px",
                        borderRadius: "999px",
                        border: isActive ? "1.5px solid #b8943a" : "1.5px solid rgba(242,237,228,0.1)",
                        background: isActive ? "#b8943a" : "rgba(242,237,228,0.04)",
                        color: isActive ? "#1e1a14" : "rgba(242,237,228,0.55)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "0.78rem",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <Icon size={14} strokeWidth={isActive ? 2.2 : 1.5} color={isActive ? "#1e1a14" : "rgba(242,237,228,0.4)"} />
                      {trip.label}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: dark card carousel ── */}
          <div
            style={{
              flex: 1,
              background: "#1a1612",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3rem 1.5rem",
              overflow: "hidden",
              minHeight: "480px",
            }}
            className="w-full"
          >
            {/* card stack */}
            <div style={{ position: "relative", width: "min(100%, 340px)", aspectRatio: "3/4" }}>
              {trips.map((trip, i) => {
                const status = getStatus(i, current, trips.length);
                const isActive = status === "active";
                const isPrev = status === "prev";
                const isNext = status === "next";
                const Icon = iconMap[trip.iconName as keyof typeof iconMap] || Compass;

                return (
                  <motion.div
                    key={trip.id}
                    initial={false}
                    animate={{
                      x: isActive ? 0 : isPrev ? -72 : isNext ? 72 : 0,
                      scale: isActive ? 1 : isPrev || isNext ? 0.86 : 0.7,
                      opacity: isActive ? 1 : isPrev || isNext ? 0.45 : 0,
                      rotate: isPrev ? -4 : isNext ? 4 : 0,
                      zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.8 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "1.5rem",
                      overflow: "hidden",
                      border: "5px solid #2a2520",
                      background: "#2a2520",
                      transformOrigin: "center",
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <img
                      src={trip.imageUrl}
                      alt={trip.label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: isActive ? "none" : "grayscale(1) brightness(0.65)",
                        transition: "filter 0.6s ease",
                      }}
                    />

                    {/* live dot */}
                    {isActive && (
                      <div style={{ position: "absolute", top: "14px", left: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 8px rgba(255,255,255,0.8)" }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif" }}>
                          Live Session
                        </span>
                      </div>
                    )}

                    {/* bottom overlay */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            padding: "24px",
                            paddingTop: "45%",
                            background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            background: "#f5f0e6",
                            color: "#1e1a14",
                            borderRadius: "999px",
                            padding: "4px 13px",
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            width: "fit-content",
                            marginBottom: "10px",
                          }}>
                            <Icon size={10} strokeWidth={2} />
                            {String(i + 1).padStart(2,"0")} · {trip.label}
                          </div>
                          <p style={{ color: "#ffffff", fontSize: "1.15rem", fontWeight: 300, lineHeight: 1.4, letterSpacing: "-0.01em", margin: "0 0 6px" }}>
                            {trip.description}
                          </p>
                          <p style={{ color: "rgba(242,237,228,0.5)", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
                            {trip.tag}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* dot indicators */}
            <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
              {trips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleChip(i)}
                  style={{
                    width: i === current ? "18px" : "5px",
                    height: "2px",
                    borderRadius: "1px",
                    background: i === current ? "#b8943a" : "rgba(242,237,228,0.25)",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "width 0.4s ease, background 0.4s ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
