// @ts-ignore
import logoSrc from "../../imports/final-logo_png_transparent.png";
// @ts-ignore
import heroVideo from "../../imports/compressed-hero.mp4";

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { fetchAllFestivals, formatPrice, ApiFestival } from "../../lib/festivalApi";
import { motion } from "motion/react";
import { MapPin, Calendar, Clock, Users, ArrowRight, ChevronRight } from "lucide-react";
import { SiteFooter } from "../components/site-footer";

// ── Data ──────────────────────────────────────────────────────────

const FEATURED = {
  name: "Ziro Music Festival",
  year: "2025",
  dates: "25 – 28 Sep 2025",
  location: "Ziro Valley, Arunachal Pradesh",
  tagline: "Where indie music meets the mountains, and strangers become a tribe.",
  description: "Four days in one of India's most beautiful valleys — surrounded by Apatani rice terraces, pine forests, and 40+ artists performing under open skies. Ziro Music Festival isn't just a concert. It's a full-bodied experience of Northeast India at its most alive.",
  extraText: "Our 6-day curated trip puts you inside the festival — not just as an audience member but as part of the community. You'll stay in the valley, wake up to rice terraces, share meals with Apatani families, and spend three full days watching artists perform in settings no stage designer could improve on.",
  price: "₹18,500",
  spotsLeft: 8,
  duration: "6 Days",
  image: "https://images.unsplash.com/photo-1756370256926-e48ca54c5efe?w=1920&h=1080&fit=crop&auto=format&q=92",
  tripSlug: "ziro-valley-music-festival",
  stats: [
    { num: "40+", label: "Artists",    detail: "Indie, folk and tribal — curated, never commercial" },
    { num: "3",   label: "Stage Days", detail: "Full festival passes included in the trip price" },
    { num: "6",   label: "Day Trip",   detail: "Valley camping, village walk and homestay dinner" },
    { num: "12",  label: "People Max", detail: "Small group — you'll actually know everyone" },
  ],
};

const OTHER_FESTIVALS = [
  {
    id: 1,
    name: "Hornbill Festival",
    location: "Nagaland",
    dates: "1 – 10 Dec 2025",
    price: "₹16,000",
    status: "Bookings Open",
    image: "https://images.unsplash.com/photo-1508519829430-40f7d3d161b4?w=900&h=560&fit=crop&auto=format&q=90",
    slug: "hornbill-festival-experience",
    tagline: "17 Naga tribes, one valley, the greatest cultural show on earth.",
    type: "Cultural Festivals",
  },
  {
    id: 2,
    name: "Rann Utsav",
    location: "Kutch, Gujarat",
    dates: "Nov 2025 – Feb 2026",
    price: "₹11,500",
    status: "Bookings Open",
    image: "https://images.unsplash.com/photo-1486314030120-d5ab85fe58cd?w=900&h=560&fit=crop&auto=format&q=90",
    slug: "rann-of-kutch-desert-odyssey",
    tagline: "Full moon, white salt desert, and a sky that has no ceiling.",
    type: "Desert Expeditions",
  },
  {
    id: 3,
    name: "Hampi Utsav",
    location: "Karnataka",
    dates: "3 – 5 Jan 2026",
    price: "₹8,500",
    status: "Opening Soon",
    image: "https://images.unsplash.com/photo-1773680690692-8e94e1794f9f?w=900&h=560&fit=crop&auto=format&q=90",
    slug: "hampi-heritage-walk",
    tagline: "Ancient ruins lit by a thousand lamps on the longest night.",
    type: "Heritage Walks",
  },
  {
    id: 4,
    name: "Tawang Winter Carnival",
    location: "Tawang, Arunachal Pradesh",
    dates: "Jan 2026",
    price: "₹18,000",
    status: "Opening Soon",
    image: "https://images.unsplash.com/photo-1665706896821-319040b81753?w=900&h=560&fit=crop&auto=format&q=90",
    slug: "tawang-winter-wonderland",
    tagline: "Monastic ceremonies, snow-capped peaks and a carnival above the clouds.",
    type: "Mountain Treks",
  },
];

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
  
  // Determine if it's an ApiFestival or static
  const isApi = !!festival.slug;
  const slug = isApi ? festival.slug : festival.slug;
  const name = isApi ? festival.title : festival.name;
  const location = isApi ? festival.location : festival.location;
  const price = isApi ? formatPrice(festival.price) : festival.price;
  const image = isApi ? (festival.bannerImages?.[0] || OTHER_FESTIVALS[0].image) : festival.image;
  const tagline = isApi ? (festival.overview?.substring(0, 60) + "...") : festival.tagline;
  const type = isApi ? (festival.tags?.[0]?.tag || "Festival") : festival.type;
  
  let status = festival.status;
  if (isApi) {
    if (festival.filledSpots >= festival.capacity) status = "Sold Out";
    else if (new Date(festival.startDate) < new Date()) status = "Closed";
    else status = "Bookings Open";
  }
  const isOpen = status === "Bookings Open";

  const dates = isApi ? `${new Date(festival.startDate).getDate()} ${new Date(festival.startDate).toLocaleString('default', { month: 'short' })} - ${new Date(festival.endDate).getDate()} ${new Date(festival.endDate).toLocaleString('default', { month: 'short' })} ${new Date(festival.startDate).getFullYear()}` : festival.dates;

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
  const [festivals, setFestivals] = useState<ApiFestival[]>([]);

  useEffect(() => {
    fetchAllFestivals()
      .then(data => setFestivals(data.filter(f => f.isActive && f.isPublished)))
      .catch(console.error);
  }, []);

  const dbFeatured = festivals.find(f => f.isFeatured);
  const others = dbFeatured ? festivals.filter(f => f.id !== dbFeatured.id) : festivals;

  const featured = dbFeatured ? {
    name: dbFeatured.title,
    year: new Date(dbFeatured.startDate).getFullYear().toString(),
    dates: `${new Date(dbFeatured.startDate).getDate()} ${new Date(dbFeatured.startDate).toLocaleString('default', { month: 'short' })} - ${new Date(dbFeatured.endDate).getDate()} ${new Date(dbFeatured.endDate).toLocaleString('default', { month: 'short' })} ${new Date(dbFeatured.startDate).getFullYear()}`,
    location: dbFeatured.location,
    tagline: dbFeatured.overview?.substring(0, 100) + "...",
    description: dbFeatured.overview || FEATURED.description,
    extraText: FEATURED.extraText, // Fallback for extra text
    price: formatPrice(dbFeatured.price),
    spotsLeft: Math.max(0, dbFeatured.capacity - dbFeatured.filledSpots),
    duration: `${dbFeatured.duration} Days`,
    image: dbFeatured.bannerImages?.[0] || FEATURED.image,
    tripSlug: dbFeatured.slug,
    stats: [
      { num: `${dbFeatured.numberOfArtists || "10+"}`, label: "Artists", detail: "Curated lineup" },
      { num: `${dbFeatured.stageDays || "3"}`, label: "Stage Days", detail: "Full festival passes included" },
      { num: `${dbFeatured.duration || "6"}`, label: "Day Trip", detail: "Camping and homestay" },
      { num: `${dbFeatured.capacity || "12"}`, label: "People Max", detail: "Small group experience" },
    ]
  } : FEATURED;

  const displayOthers = others.length > 0 ? others : OTHER_FESTIVALS;

  return (
    <div style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>

      {/* ════════════════════
          FEATURED HERO
      ════════════════════ */}
      <section style={{ position: "relative", height: "100vh", minHeight: "640px", overflow: "hidden" }}>
        {dbFeatured?.bannerImages?.[0] ? (
          <img 
            src={dbFeatured.bannerImages[0]} 
            alt={featured.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          >
            <source src={heroVideo as string} type="video/mp4" />
          </video>
        )}

        {/* Rich crimson-to-dark diagonal — ties into brand color */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(55,7,9,0.96) 0%, rgba(44,5,8,0.84) 32%, rgba(20,14,10,0.52) 62%, rgba(11,11,11,0.06) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,11,0.62) 0%, transparent 42%)", pointerEvents: "none" }} />

        {/* Content */}
        <div style={{ position: "absolute", inset: 0, maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem,5vw,6rem)", display: "flex", alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ maxWidth: "640px", paddingTop: "72px" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
              <div style={{ width: "24px", height: "1.5px", background: "#C8A96E" }} />
              <span style={{ color: "#C8A96E", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                Featured Festival {featured.year}
              </span>
            </div>

            <h1 style={{ color: "#f9f4ec", fontSize: "clamp(2.6rem,7vw,5.5rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.06, margin: "0 0 14px" }}>
              {featured.name}
            </h1>

            <p style={{ color: "rgba(242,237,228,0.65)", fontSize: "clamp(0.88rem,1.5vw,1.05rem)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.75, margin: "0 0 28px", maxWidth: "500px" }}>
              "{featured.tagline}"
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", marginBottom: "30px" }}>
              {[
                { icon: Calendar, text: featured.dates },
                { icon: MapPin,   text: featured.location },
                { icon: Clock,    text: featured.duration },
                { icon: Users,    text: `${featured.spotsLeft} spots left` },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Icon size={12} color="rgba(200,169,110,0.8)" strokeWidth={1.5} />
                  <span style={{ color: "rgba(242,237,228,0.65)", fontSize: "0.76rem", fontWeight: 300 }}>{text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <div>
                <p style={{ color: "rgba(242,237,228,0.32)", fontSize: "0.57rem", letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 3px" }}>Starting from</p>
                <p style={{ color: "#f9f4ec", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 600, letterSpacing: "-0.04em", margin: 0, lineHeight: 1 }}>{featured.price}</p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link to={`/book/${featured.tripSlug}?type=festival`} style={{ background: "#C8A96E", color: "#1a1612", padding: "12px 26px", fontFamily: "'Poppins', sans-serif", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "7px", transition: "background 0.25s ease" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#dfc080")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#C8A96E")}>
                  Book Your Spot <ArrowRight size={13} />
                </Link>
                <Link to={`/festivals/${featured.tripSlug}`} style={{ background: "rgba(242,237,228,0.07)", color: "rgba(242,237,228,0.75)", border: "1px solid rgba(242,237,228,0.16)", padding: "12px 22px", fontFamily: "'Poppins', sans-serif", fontSize: "0.76rem", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", backdropFilter: "blur(6px)", transition: "border-color 0.2s, color 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(200,169,110,0.4)"; (e.currentTarget as HTMLAnchorElement).style.color = "#C8A96E"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(242,237,228,0.16)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(242,237,228,0.75)"; }}>
                  Explore the Trip
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Hangover badge — bottom-right of hero, large */}
        <div style={{ position: "absolute", bottom: "clamp(24px,4vh,40px)", right: "clamp(1.5rem,5vw,6rem)", zIndex: 10 }}>
          <HangoverBadge large />
        </div>

        {/* Scroll pulse */}
        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", width: "1px", height: "44px", background: "linear-gradient(to bottom, rgba(200,169,110,0.65), transparent)" }} />
      </section>

      {/* ════════════════════
          MORE ABOUT
      ════════════════════ */}
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
              <p style={{ color: "rgba(30,26,20,0.68)", fontSize: "clamp(0.88rem,1.3vw,0.98rem)", fontWeight: 300, lineHeight: 1.9, marginBottom: "28px" }}>
                {featured.extraText}
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

            {/* Right: stat cards + valley photo */}
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
              <div style={{ borderRadius: "10px", overflow: "hidden", aspectRatio: "16/9" }}>
                <img src="https://images.unsplash.com/photo-1568644577260-0568ed0217e0?w=900&h=520&fit=crop&auto=format&q=90"
                  alt="Ziro Valley" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

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
