// @ts-ignore
import logoSrc from "../../imports/final-logo_png_transparent.png";

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { fetchAllFestivals, formatPrice, ApiFestival } from "../../lib/festivalApi";
import { motion } from "motion/react";
import { MapPin, ArrowRight, ChevronRight, Calendar } from "lucide-react";
import { SiteFooter } from "../components/site-footer";


// ── Transparent Hangover badge — no bg, no border ─────────────────
function HangoverBadge({ large = false }: { large?: boolean }) {
  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: large ? "5px" : "3px",
      pointerEvents: "none",
      filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 12px rgba(0,0,0,0.7))",
    }}>
      <img
        src={logoSrc as string}
        alt="Hangover Trails"
        style={{ height: large ? "46px" : "20px", width: "auto", filter: "brightness(10) sepia(0.08)", display: "block" }}
      />
      <span style={{
        color: "#C8A96E",
        fontSize: large ? "0.72rem" : "0.5rem",
        fontWeight: 700,
        letterSpacing: "0.26em",
        textTransform: "uppercase",
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1,
      }}>
        Featured
      </span>
    </div>
  );
}

// ── Festival card — mirrors trip card design language ─────────────
function FestivalCard({ festival, index }: { festival: any; index: number }) {
  const [hovered, setHovered] = useState(false);
  
  const slug = festival.slug;
  const name = festival.title ?? festival.name;
  const location = festival.location;
  const price = festival.price ? formatPrice(festival.price) : (festival.price ?? "TBA");
  const image = festival.bannerImages?.[0] || festival.image || "";
  const tagline = festival.overview ? festival.overview.substring(0, 60) + "..." : (festival.tagline ?? "");
  const type = festival.tags?.[0]?.tag || festival.type || "Festival";

  // Slot-based date and status
  const firstSlot = festival.slots?.[0];
  let status = festival.status;
  if (firstSlot) {
    const filled = firstSlot.filledSpots ?? 0;
    const cap = firstSlot.capacity ?? 0;
    if (filled >= cap) status = "Sold Out";
    else if (new Date(firstSlot.startDate) < new Date()) status = "Closed";
    else status = "Bookings Open";
  }
  const isOpen = status === "Bookings Open";

  const dates = firstSlot
    ? `${new Date(firstSlot.startDate).getDate()} ${new Date(firstSlot.startDate).toLocaleString('default', { month: 'short' })} - ${new Date(firstSlot.endDate).getDate()} ${new Date(firstSlot.endDate).toLocaleString('default', { month: 'short' })} ${new Date(firstSlot.startDate).getFullYear()}`
    : (festival.dates ?? "Dates TBA");

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.06 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(30,26,20,0.07)",
        boxShadow: hovered ? "0 8px 32px rgba(30,26,20,0.1)" : "0 2px 8px rgba(30,26,20,0.05)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
        <img src={image} alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.55s ease", transform: hovered ? "scale(1.05)" : "scale(1)" }} />
        {/* Bottom gradient — makes text readable */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,11,0.72) 0%, rgba(11,11,11,0.18) 50%, transparent 75%)", pointerEvents: "none" }} />
        {/* Top-left vignette — keeps badge visible on any image */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 0% 0%, rgba(0,0,0,0.45) 0%, transparent 100%)", pointerEvents: "none" }} />

        {/* Hangover badge — fully transparent, top-left */}
        <div style={{ position: "absolute", top: "12px", left: "13px", zIndex: 2 }}>
          <HangoverBadge />
        </div>

        {/* Booking status — top-right */}
        <span style={{
          position: "absolute", top: "12px", right: "12px", zIndex: 2,
          background: isOpen ? "rgba(37,211,102,0.14)" : "rgba(200,169,110,0.11)",
          border: `1px solid ${isOpen ? "rgba(37,211,102,0.38)" : "rgba(200,169,110,0.28)"}`,
          borderRadius: "999px", padding: "3px 10px", backdropFilter: "blur(6px)",
          color: isOpen ? "#25D366" : "#C8A96E",
          fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase",
          fontFamily: "'Poppins', sans-serif",
        }}>
          {status}
        </span>

        {/* Type — bottom-left of image */}
        <span style={{
          position: "absolute", bottom: "12px", left: "12px", zIndex: 2,
          background: "#781216", color: "#fff",
          borderRadius: "4px", padding: "3px 9px",
          fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          fontFamily: "'Poppins', sans-serif",
        }}>
          {type}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
          <MapPin size={10} color="#781216" />
          <span style={{ color: "#781216", fontSize: "0.6rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {location}
          </span>
        </div>

        <h3 style={{ color: "#1e1a14", fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.3, margin: "0 0 5px" }}>
          {name}
        </h3>

        <p style={{ color: "rgba(30,26,20,0.52)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.6, margin: "0 0 12px" }}>
          {tagline}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "16px" }}>
          <Calendar size={10} color="rgba(30,26,20,0.35)" />
          <span style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.68rem", fontWeight: 300 }}>{dates}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid rgba(30,26,20,0.07)" }}>
          <div>
            <p style={{ color: "rgba(30,26,20,0.35)", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px" }}>From</p>
            <p style={{ color: "#1e1a14", fontSize: "0.9rem", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{price}</p>
          </div>
          <Link to={`/festivals/${slug}`} style={{
            background: hovered ? "#C8A96E" : "transparent",
            border: `1.5px solid ${hovered ? "#C8A96E" : "rgba(30,26,20,0.14)"}`,
            color: hovered ? "#1e1a14" : "rgba(30,26,20,0.58)",
            borderRadius: "4px", padding: "7px 15px",
            fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "'Poppins', sans-serif",
            transition: "all 0.25s ease",
            display: "flex", alignItems: "center", gap: "5px", textDecoration: "none",
          }}>
            View Trip <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function FestivalsPage() {
  const [featuredFestival, setFeaturedFestival] = useState<ApiFestival | null>(null);
  const [otherFestivals, setOtherFestivals] = useState<ApiFestival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllFestivals()
      .then((all) => {
        const active = all.filter(f => f.isActive && f.isPublished);
        const hero = active.find(f => f.isFeatured) ?? null;
        setFeaturedFestival(hero);
        setOtherFestivals(active.filter(f => f.id !== hero?.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derive hero display values from the featured festival
  const dbFeatured = featuredFestival;
  const firstSlot = dbFeatured?.slots?.[0];
  const spotsLeft = firstSlot ? Math.max(0, firstSlot.capacity - firstSlot.filledSpots) : 0;

  const featured = dbFeatured ? {
    name: dbFeatured.title,
    year: firstSlot ? new Date(firstSlot.startDate).getFullYear().toString() : new Date().getFullYear().toString(),
    dates: firstSlot
      ? `${new Date(firstSlot.startDate).getDate()} ${new Date(firstSlot.startDate).toLocaleString('default', { month: 'short' })} – ${new Date(firstSlot.endDate).getDate()} ${new Date(firstSlot.endDate).toLocaleString('default', { month: 'short' })} ${new Date(firstSlot.startDate).getFullYear()}`
      : "Dates TBA",
    location: dbFeatured.location,
    tagline: dbFeatured.overview?.substring(0, 100) + "...",
    description: dbFeatured.overview || "",
    price: formatPrice(dbFeatured.price),
    spotsLeft,
    duration: `${dbFeatured.duration} Days`,
    image: dbFeatured.bannerImages?.[0] || "",
    tripSlug: dbFeatured.slug,
    stats: [
      { num: `${dbFeatured.duration || "?"}`, label: "Day Trip", detail: "Camping and homestay included" },
      { num: `${firstSlot?.capacity || "?"}`, label: "People Max", detail: "Small group, personal experience" },
    ]
  } : null;

  const displayOthers = otherFestivals;

  return (
    <div style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>

      {/* ════════════════════
          FEATURED HERO
      ════════════════════ */}
      <section className="relative w-full h-screen overflow-hidden bg-[#0b0b0b]">
        {/* Background */}
        {featured?.image ? (
          <motion.img
            key={featured.image}
            src={featured.image}
            alt={featured.name}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #0b0b0b 0%, #1a1510 30%, #201a12 50%, #1a1510 70%, #0b0b0b 100%)" }}
            animate={{ opacity: loading ? [0.6, 1, 0.6] : 1 }}
            transition={{ duration: 2.2, repeat: loading ? Infinity : 0, ease: "easeInOut" }}
          />
        )}

        <style>{`@keyframes skPulse { 0%,100% { opacity:0.3; } 50% { opacity:0.6; } }`}</style>

        {/* Overlay — dark left fading right, same as home hero */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to right, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.60) 50%, rgba(11,11,11,0.20) 100%), linear-gradient(to top, rgba(11,11,11,0.70) 0%, transparent 45%)",
          }}
        />

        {/* Content — same padding as home hero */}
        <div className="absolute inset-0 z-30 flex items-center">
          <div className="px-6 md:px-10 lg:px-12 max-w-2xl w-full">
            {loading ? (
              <>
                <motion.div className="h-3 w-24 rounded-full mb-6" style={{ background: "rgba(200,169,110,0.15)" }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="rounded mb-4" style={{ background: "rgba(242,237,228,0.08)", height: "clamp(3.5rem,8vw,7rem)", width: "80%" }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.15 }} />
                <div className="w-12 h-px mb-6" style={{ background: "rgba(200,169,110,0.2)" }} />
                <div className="space-y-2 mb-8">
                  {[0.9, 0.75, 0.6].map((w, i) => (
                    <motion.div key={i} className="h-3 rounded-full" style={{ background: "rgba(242,237,228,0.06)", width: `${w * 100}%` }} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 * i }} />
                  ))}
                </div>
                <div className="flex items-center gap-8 mb-8">
                  <motion.div className="h-10 w-20 rounded" style={{ background: "rgba(242,237,228,0.06)" }} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
                  <div className="w-px h-8" style={{ background: "rgba(242,237,228,0.1)" }} />
                  <motion.div className="h-10 w-24 rounded" style={{ background: "rgba(242,237,228,0.06)" }} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
                </div>
                <div className="flex gap-3">
                  <motion.div className="h-11 w-36 rounded" style={{ background: "rgba(200,169,110,0.12)" }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
                  <motion.div className="h-11 w-32 rounded" style={{ background: "rgba(242,237,228,0.06)" }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />
                </div>
              </>
            ) : featured ? (
              <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}>
                {/* Location chip */}
                <div className="flex items-center gap-2 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <MapPin size={12} color="#c8a96e" />
                  <span style={{ color: "#c8a96e", fontSize: "0.72rem", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    {featured.location}
                  </span>
                </div>

                {/* Festival name */}
                <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "clamp(3.5rem,8vw,7rem)", letterSpacing: "-0.02em", lineHeight: 1.05, color: "#f2ede4", margin: "0 0 16px" }}>
                  {featured.name}
                </h1>

                {/* Gold separator */}
                <div style={{ width: "48px", height: "1px", background: "#c8a96e", marginBottom: "24px" }} />

                {/* Tagline */}
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "0.88rem", lineHeight: 1.75, color: "rgba(242,237,228,0.80)", maxWidth: "440px", margin: "0 0 32px" }}>
                  {featured.tagline}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-8 mb-8">
                  <div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(242,237,228,0.65)", marginBottom: "4px" }}>Dates</div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "0.88rem", color: "#f2ede4" }}>{featured.dates}</div>
                  </div>
                  <div style={{ width: "1px", height: "32px", background: "rgba(242,237,228,0.3)" }} />
                  <div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(242,237,228,0.65)", marginBottom: "4px" }}>Starting</div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "0.88rem", color: "#c8a96e" }}>{featured.price}</div>
                  </div>
                  <div style={{ width: "1px", height: "32px", background: "rgba(242,237,228,0.3)" }} />
                  <div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(242,237,228,0.65)", marginBottom: "4px" }}>Spots Left</div>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "0.88rem", color: "#f2ede4" }}>{featured.spotsLeft}</div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    to={`/book/${featured.tripSlug}?type=festival`}
                    style={{ background: "#C8A96E", color: "#0b0b0b", padding: "12px 28px", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", transition: "background 0.25s ease" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#dfc08a")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#C8A96E")}
                  >
                    Book Your Spot <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/festivals/${featured.tripSlug}`}
                    style={{ background: "rgba(242,237,228,0.07)", color: "rgba(242,237,228,0.75)", border: "1px solid rgba(242,237,228,0.16)", padding: "12px 22px", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", backdropFilter: "blur(6px)", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(200,169,110,0.4)"; (e.currentTarget as HTMLAnchorElement).style.color = "#C8A96E"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(242,237,228,0.16)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(242,237,228,0.75)"; }}
                  >
                    Explore the Trip
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                <p style={{ color: "rgba(242,237,228,0.45)", fontSize: "1rem", fontWeight: 300, fontStyle: "italic", fontFamily: "'Poppins', sans-serif" }}>
                  No featured festival at this time. Check back soon.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Scroll hint — same as home hero */}
        <div className="absolute bottom-10 right-10 z-30 flex flex-col items-center gap-2">
          <div className="w-px h-10 relative overflow-hidden" style={{ background: "rgba(242,237,228,0.15)" }}>
            <motion.div
              className="absolute top-0 left-0 w-full bg-[#c8a96e]"
              animate={{ height: ["0%", "100%"], top: ["0%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              style={{ height: "30%" }}
            />
          </div>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.58rem", color: "rgba(242,237,228,0.65)", textTransform: "uppercase", letterSpacing: "0.15em", writingMode: "vertical-rl" }}>
            Scroll
          </span>
        </div>
      </section>


      {/* ════════════════════
          MORE ABOUT
      ════════════════════ */}
      {featured && (
      <section id="more-about" style={{ background: "#f5f0e6", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "clamp(2.5rem,5vw,4rem)" }}>
            <div>
              <p style={{ color: "#781216", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "12px" }}>
                / About This Trip
              </p>
              <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.8rem,3.5vw,3rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}>
                Why this is the trip you'll{" "}
                <em style={{ color: "#781216", fontStyle: "italic" }}>talk about for years.</em>
              </h2>
            </div>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(2.5rem,5vw,6rem)", alignItems: "start" }} className="grid-cols-1 lg:grid-cols-2">

            {/* Left: editorial body */}
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.08 }}>
              <p style={{ color: "rgba(30,26,20,0.68)", fontSize: "clamp(0.88rem,1.3vw,0.98rem)", fontWeight: 300, lineHeight: 1.9, marginBottom: "22px" }}>
                {featured.description}
              </p>

              {/* Pull quote */}
              <div style={{ borderLeft: "2px solid #C8A96E", paddingLeft: "20px", marginBottom: "28px" }}>
                <p style={{ color: "#1e1a14", fontSize: "0.98rem", fontWeight: 300, fontStyle: "italic", lineHeight: 1.75, margin: "0 0 7px" }}>
                  "The valley doesn't just host the festival. It becomes the festival."
                </p>
                <span style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  — Hangover Trails Team
                </span>
              </div>

              <Link to={`/festivals/${featured.tripSlug}`} style={{ display: "inline-flex", alignItems: "center", gap: "7px", color: "#781216", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", borderBottom: "1.5px solid rgba(120,18,22,0.22)", paddingBottom: "3px", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#781216")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(120,18,22,0.22)")}>
                View Full Trip Details <ChevronRight size={13} />
              </Link>
            </motion.div>

            {/* Right: stat cards + banner image */}
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {featured.stats.map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                    style={{ background: "#ffffff", border: "1px solid rgba(30,26,20,0.07)", borderRadius: "10px", padding: "18px", boxShadow: "0 1px 6px rgba(30,26,20,0.04)" }}>
                    <p style={{ color: "#781216", fontSize: "clamp(1.4rem,2.5vw,1.8rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, margin: "0 0 4px" }}>{s.num}</p>
                    <p style={{ color: "#1e1a14", fontSize: "0.78rem", fontWeight: 500, margin: "0 0 3px" }}>{s.label}</p>
                    <p style={{ color: "rgba(30,26,20,0.44)", fontSize: "0.68rem", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{s.detail}</p>
                  </motion.div>
                ))}
              </div>
              {dbFeatured?.bannerImages?.[1] && (
                <div style={{ borderRadius: "10px", overflow: "hidden", aspectRatio: "16/9" }}>
                  <img src={dbFeatured.bannerImages[1]}
                    alt={featured.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* ════════════════════
          OTHER FESTIVALS
      ════════════════════ */}
      <section style={{ background: "#ede8dc", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "clamp(2rem,4vw,3rem)" }}>
            <div>
              <p style={{ color: "#781216", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "10px" }}>
                / More Festival Trips
              </p>
              <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.15, margin: 0 }}>
                Every festival we take you to is{" "}
                <em style={{ color: "#781216", fontStyle: "italic" }}>personally curated.</em>
              </h2>
            </div>
            <p style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.8, maxWidth: "230px", margin: 0 }}>
              We only partner with festivals we've attended ourselves.
            </p>
          </motion.div>

          <div style={{ display: "grid", gap: "20px" }} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {displayOthers.map((fest: any, i) => (
              <FestivalCard key={fest.id} festival={fest} index={i} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
