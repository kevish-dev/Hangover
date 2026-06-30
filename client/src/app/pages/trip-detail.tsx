import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, Clock, Users, ChevronDown, CheckCircle,
  XCircle, Star, ArrowLeft, Mountain, Calendar,
  MessageCircle, Shield, Zap, ChevronLeft, ChevronRight, X,
  Home, Truck, HelpCircle, ChevronUp,
} from "lucide-react";

// ── Related Trips ─────────────────────────────────────────────────
function RelatedTrips({ currentId, currentType }: { currentId: number; currentType: string }) {
  // Same type first, then fill with other trips — exclude current
  const sameType = TRIPS_DATA.filter((t) => t.id !== currentId && t.type === currentType);
  const others   = TRIPS_DATA.filter((t) => t.id !== currentId && t.type !== currentType);
  const related  = [...sameType, ...others].slice(0, 6);

  if (related.length === 0) return null;

  return (
    <section style={{
      background: "#f5f0e6",
      borderTop: "1px solid rgba(30,26,20,0.07)",
      padding: "clamp(2.5rem,5vw,4rem) 0",
      fontFamily: "'Poppins', sans-serif",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem,5vw,6rem)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "clamp(1.5rem,3vw,2rem)", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p style={{ color: "#781216", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.24em", textTransform: "uppercase", marginBottom: "6px" }}>
              / You might also like
            </p>
            <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.4rem,2.5vw,2rem)", fontWeight: 300, letterSpacing: "-0.025em", margin: 0 }}>
              More trips to <em style={{ color: "#781216", fontStyle: "italic" }}>explore.</em>
            </h2>
          </div>
          <Link to="/trips" style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.75rem", fontWeight: 400, letterSpacing: "0.06em", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", transition: "color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#781216")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(30,26,20,0.5)")}>
            View all trips →
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "12px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
        }}>
          {related.map((t) => (
            <RelatedCard key={t.id} trip={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedCard({ trip }: { trip: typeof TRIPS_DATA[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/trips/${trip.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: "clamp(240px, 28vw, 290px)",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#ffffff",
        border: `1px solid ${hovered ? "rgba(120,18,22,0.35)" : "rgba(30,26,20,0.07)"}`,
        boxShadow: "0 2px 8px rgba(30,26,20,0.05)",
        transition: "border-color 0.25s ease",
        textDecoration: "none",
        display: "block",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
        <img
          src={trip.image}
          alt={trip.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hovered ? "scale(1.05)" : "scale(1)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,11,0.5) 0%, transparent 55%)" }} />
        <span style={{ position: "absolute", top: "10px", left: "10px", background: "#781216", color: "#fff", borderRadius: "4px", padding: "2px 8px", fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {trip.type}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
          <MapPin size={10} color="#781216" />
          <span style={{ color: "#781216", fontSize: "0.6rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>{trip.destination}</span>
        </div>
        <h3 style={{ color: "#1e1a14", fontSize: "0.9rem", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 8px" }}>{trip.name}</h3>
        <p style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.72rem", fontWeight: 300, lineHeight: 1.55, margin: "0 0 12px" }}>{trip.tagline}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid rgba(30,26,20,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={10} color="rgba(30,26,20,0.4)" />
            <span style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.68rem" }}>{trip.duration}</span>
          </div>
          <span style={{ color: "#1e1a14", fontSize: "0.82rem", fontWeight: 600, letterSpacing: "-0.01em" }}>{trip.price}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Section Navigator ─────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "overview",      label: "Overview" },
  { id: "highlights",    label: "Highlights" },
  { id: "itinerary",     label: "Itinerary" },
  { id: "accommodation", label: "Stay & Travel" },
  { id: "included",      label: "Included" },
  { id: "reviews",       label: "Reviews" },
  { id: "faqs",          label: "FAQs" },
];

function SectionNav() {
  const [active, setActive] = useState("overview");
  const [visible, setVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show nav only after hero is scrolled past
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Offset: 72px navbar + 45px section nav + 16px breathing room
    const offset = 72 + 45 + 16;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <motion.div
      ref={navRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: "sticky",
        top: "72px",
        zIndex: 80,
        background: "rgba(245,240,230,0.96)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(30,26,20,0.08)",
        boxShadow: "0 2px 12px rgba(30,26,20,0.05)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem,5vw,6rem)", display: "flex", alignItems: "center", gap: "4px", overflowX: "auto", scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            style={{
              padding: "12px 16px",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.72rem",
              fontWeight: active === id ? 600 : 400,
              letterSpacing: "0.04em",
              color: active === id ? "#781216" : "rgba(30,26,20,0.5)",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${active === id ? "#781216" : "transparent"}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.2s ease, border-color 0.2s ease",
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Accommodation & Transport ─────────────────────────────────────
const STAY_PHOTOS = [
  { src: "https://images.unsplash.com/photo-1703782498522-f9c2b9c1bc25?w=600&h=400&fit=crop&auto=format&q=85", caption: "Mountain guesthouse room" },
  { src: "https://images.unsplash.com/photo-1761281346927-92edaf0681cb?w=600&h=400&fit=crop&auto=format&q=85", caption: "Campsite nights under the stars" },
  { src: "https://images.unsplash.com/photo-1772717492145-7f2e0693cd9a?w=600&h=400&fit=crop&auto=format&q=85", caption: "Group camping setup" },
  { src: "https://images.unsplash.com/photo-1656828059237-add66db82a2b?w=600&h=400&fit=crop&auto=format&q=85", caption: "Sturdy 4WD transfers" },
  { src: "https://images.unsplash.com/photo-1774015671364-9784d9080a99?w=600&h=400&fit=crop&auto=format&q=85", caption: "Private vehicle through scenic routes" },
];

function AccommodationSection() {
  const [open, setOpen] = useState(false);
  return (
    <div id="accommodation">
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: open ? "#ffffff" : "rgba(30,26,20,0.03)",
          border: "1px solid rgba(30,26,20,0.08)",
          borderRadius: open ? "12px 12px 0 0" : "12px",
          padding: "16px 20px",
          cursor: "pointer",
          fontFamily: "'Poppins', sans-serif",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <Home size={14} color="#781216" strokeWidth={1.5} />
            <Truck size={14} color="#781216" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: "#1e1a14", fontSize: "0.85rem", fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>
              Stay & Transport
            </p>
            <p style={{ color: "rgba(30,26,20,0.42)", fontSize: "0.7rem", fontWeight: 300, margin: "2px 0 0" }}>
              {open ? "Tap to collapse" : "See where you'll sleep and how you'll move — tap to explore"}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} color="rgba(30,26,20,0.38)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              border: "1px solid rgba(30,26,20,0.08)",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              background: "#ffffff",
              padding: "20px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }} className="grid-cols-2 sm:grid-cols-3">
                {STAY_PHOTOS.map((p, i) => (
                  <div key={i} style={{ borderRadius: "8px", overflow: "hidden", position: "relative", aspectRatio: "4/3", background: "#ede8dc" }}>
                    <img src={p.src} alt={p.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(11,11,11,0.7) 0%, transparent 100%)", padding: "16px 10px 8px" }}>
                      <span style={{ color: "rgba(242,237,228,0.88)", fontSize: "0.62rem", fontWeight: 400, fontFamily: "'Poppins', sans-serif", letterSpacing: "0.04em" }}>
                        {p.caption}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ color: "rgba(30,26,20,0.42)", fontSize: "0.72rem", fontWeight: 300, lineHeight: 1.7, marginTop: "14px", marginBottom: 0, fontStyle: "italic" }}>
                The property shown here are subject to availability. The pictures shown here are the shots taken from the best part of the particular property. Original or other parts of the property may differ.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── FAQs ──────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is this trip suitable for first-timers?",
    a: "Yes — most of our trips are designed to be welcoming to first-time group travelers. We always mention difficulty levels clearly. If you're unsure, just WhatsApp us and we'll guide you to the right trip.",
  },
  {
    q: "What happens if I need to cancel?",
    a: "Cancellations 30+ days before departure receive a 70% refund. 15–30 days: 50%. Under 15 days: no refund, but we'll try to move you to another batch. We strongly recommend travel insurance.",
  },
  {
    q: "Are solo travelers welcome?",
    a: "Absolutely — over 40% of our travelers come solo. Our small group format is designed so you naturally connect with fellow travelers. Many of our best friendships started on our trips.",
  },
  {
    q: "What's the food like?",
    a: "We prioritise local and home-cooked food wherever possible. We cater to vegetarian diets on all trips. For other dietary needs (vegan, gluten-free), let us know in advance and we'll do our best.",
  },
  {
    q: "How fit do I need to be?",
    a: "Depends on the trip — each listing mentions a difficulty level (Easy / Moderate / Challenging). Easy trips require no special fitness. Moderate trips benefit from regular walking. Challenging trips recommend prior experience.",
  },
  {
    q: "Can I book for a group or a college batch?",
    a: "Yes — institute and group bookings are one of our specialities. We offer custom itineraries, pricing, and documentation for educational institutions. Reach us on WhatsApp for a quick quote.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div id="faqs">
      <SectionTitle>Frequently Asked Questions</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{
            border: "1px solid rgba(30,26,20,0.08)",
            borderRadius: "10px",
            overflow: "hidden",
            background: open === i ? "#ffffff" : "#faf8f4",
            transition: "background 0.2s ease",
          }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "16px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <HelpCircle size={14} color={open === i ? "#781216" : "rgba(30,26,20,0.28)"} strokeWidth={1.5} style={{ flexShrink: 0, transition: "color 0.2s" }} />
                <span style={{ color: "#1e1a14", fontSize: "0.88rem", fontWeight: open === i ? 500 : 400, letterSpacing: "-0.01em", lineHeight: 1.4, transition: "font-weight 0.15s" }}>
                  {faq.q}
                </span>
              </div>
              <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ flexShrink: 0 }}>
                <ChevronDown size={15} color="rgba(30,26,20,0.35)" />
              </motion.div>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <p style={{
                    color: "rgba(30,26,20,0.65)",
                    fontSize: "0.82rem",
                    fontWeight: 300,
                    lineHeight: 1.78,
                    margin: 0,
                    padding: "0 20px 18px 46px",
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
import { getTripBySlug, TRIPS_DATA } from "../data/trips";
import { SiteFooter } from "../components/site-footer";

const WHATSAPP_NUMBER = "919876543210";

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} fill={s <= rating ? "#C8A96E" : "none"} color={s <= rating ? "#C8A96E" : "rgba(30,26,20,0.2)"} />
      ))}
    </div>
  );
}

function ItineraryAccordion({ days }: { days: { day: number; title: string; description: string; activities: string[] }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {days.map((d) => (
        <div
          key={d.day}
          style={{
            border: "1px solid rgba(30,26,20,0.08)",
            borderRadius: "10px",
            overflow: "hidden",
            background: open === d.day - 1 ? "#ffffff" : "#faf8f4",
            transition: "background 0.2s ease",
          }}
        >
          <button
            onClick={() => setOpen(open === d.day - 1 ? null : d.day - 1)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: open === d.day - 1 ? "#781216" : "rgba(120,18,22,0.08)",
              color: open === d.day - 1 ? "#fff" : "#781216",
              fontSize: "0.7rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.25s ease",
            }}>
              {d.day}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px" }}>Day {d.day}</p>
              <p style={{ color: "#1e1a14", fontSize: "0.9rem", fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>{d.title}</p>
            </div>
            <motion.div animate={{ rotate: open === d.day - 1 ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown size={16} color="rgba(30,26,20,0.4)" />
            </motion.div>
          </button>

          <AnimatePresence>
            {open === d.day - 1 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 20px 20px 68px" }}>
                  <p style={{ color: "rgba(30,26,20,0.62)", fontSize: "0.82rem", fontWeight: 300, lineHeight: 1.7, marginBottom: "12px" }}>{d.description}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {d.activities.map((a) => (
                      <div key={a} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#C8A96E", flexShrink: 0, marginTop: "6px" }} />
                        <span style={{ color: "rgba(30,26,20,0.7)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.5 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function TripDetail() {
  const { slug } = useParams();
  const trip = getTripBySlug(slug || "");

  if (!trip) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Poppins', sans-serif", background: "#f5f0e6" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(30,26,20,0.4)", fontSize: "1rem", marginBottom: "16px" }}>Trip not found.</p>
          <Link to="/trips" style={{ color: "#781216", fontSize: "0.82rem", textDecoration: "none" }}>← Back to all trips</Link>
        </div>
      </div>
    );
  }

  const waMessage = encodeURIComponent(`Hi! I'm interested in the "${trip.name}" trip. Can you share more details?`);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;
  const avgRating = trip.reviews.reduce((s, r) => s + r.rating, 0) / trip.reviews.length;

  // All images for the carousel
  const allImages = [trip.image, ...trip.galleryImages];
  const [heroIndex, setHeroIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prevHero = () => setHeroIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const nextHero = () => setHeroIndex((i) => (i + 1) % allImages.length);
  const prevLight = useCallback(() => setLightbox((i) => i !== null ? (i - 1 + allImages.length) % allImages.length : null), [allImages.length]);
  const nextLight = useCallback(() => setLightbox((i) => i !== null ? (i + 1) % allImages.length : null), [allImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevLight();
      if (e.key === "ArrowRight") nextLight();
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, prevLight, nextLight]);

  return (
    <div style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setLightbox(null)}
            style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Close */}
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: "20px", right: "24px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
              <X size={18} color="#fff" />
            </button>

            {/* Counter */}
            <span style={{ position: "absolute", top: "24px", left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", letterSpacing: "0.14em", fontFamily: "'Poppins', sans-serif" }}>
              {lightbox + 1} / {allImages.length}
            </span>

            {/* Prev */}
            <button onClick={(e) => { e.stopPropagation(); prevLight(); }} style={{ position: "absolute", left: "20px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}>
              <ChevronLeft size={22} color="#fff" />
            </button>

            {/* Image */}
            <AnimatePresence mode="wait">
              <motion.img
                key={lightbox}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                src={allImages[lightbox]}
                alt={trip.name}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
              />
            </AnimatePresence>

            {/* Next */}
            <button onClick={(e) => { e.stopPropagation(); nextLight(); }} style={{ position: "absolute", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}>
              <ChevronRight size={22} color="#fff" />
            </button>

            {/* Thumbnail strip */}
            <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px" }}>
              {allImages.map((img, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightbox(i); }} style={{ width: "52px", height: "36px", borderRadius: "4px", overflow: "hidden", border: `2px solid ${i === lightbox ? "#C8A96E" : "transparent"}`, padding: 0, cursor: "pointer", opacity: i === lightbox ? 1 : 0.5, transition: "all 0.2s" }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Carousel ── */}
      <div style={{ position: "relative", height: "70vh", minHeight: "480px", overflow: "hidden", cursor: "zoom-in" }}>
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={heroIndex}
            src={allImages[heroIndex]}
            alt={trip.name}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => setLightbox(heroIndex)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </AnimatePresence>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,11,0.88) 0%, rgba(11,11,11,0.35) 55%, rgba(11,11,11,0.15) 100%)", pointerEvents: "none" }} />

        {/* Back button */}
        <Link to="/trips" style={{ position: "absolute", top: "90px", left: "clamp(1.5rem,5vw,6rem)", display: "flex", alignItems: "center", gap: "6px", color: "rgba(242,237,228,0.8)", fontSize: "0.75rem", fontWeight: 400, letterSpacing: "0.08em", textDecoration: "none", fontFamily: "'Poppins', sans-serif" }}>
          <ArrowLeft size={14} /> All Trips
        </Link>

        {/* Prev / Next arrows */}
        <button onClick={(e) => { e.stopPropagation(); prevHero(); }} style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(6px)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); nextHero(); }} style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(6px)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
          <ChevronRight size={18} color="#fff" />
        </button>

        {/* Dot indicators */}
        <div style={{ position: "absolute", bottom: "clamp(80px,12vw,120px)", right: "clamp(1.5rem,5vw,6rem)", display: "flex", gap: "6px" }}>
          {allImages.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)} style={{ width: i === heroIndex ? "20px" : "6px", height: "3px", borderRadius: "2px", background: i === heroIndex ? "#C8A96E" : "rgba(255,255,255,0.45)", border: "none", padding: 0, cursor: "pointer", transition: "width 0.35s ease, background 0.25s ease" }} />
          ))}
        </div>

        {/* Hero content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 clamp(1.5rem,5vw,6rem) clamp(2rem,4vw,3.5rem)", pointerEvents: "none" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ background: "#781216", color: "#fff", borderRadius: "4px", padding: "3px 10px", fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>{trip.type}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#C8A96E" }}>
                <StarRating rating={Math.round(avgRating)} />
                <span style={{ fontSize: "0.72rem", fontWeight: 500, marginLeft: "4px" }}>{avgRating.toFixed(1)} ({trip.reviews.length} reviews)</span>
              </span>
            </div>
            <h1 style={{ color: "#f2ede4", fontSize: "clamp(2rem,5vw,3.8rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 10px" }}>{trip.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <MapPin size={13} color="#C8A96E" />
              <span style={{ color: "rgba(242,237,228,0.75)", fontSize: "0.82rem", fontWeight: 300 }}>{trip.destination} · {trip.region}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky section navigator ── */}
      <SectionNav />

      {/* ── Main content ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "clamp(2rem,4vw,4rem)" }} className="grid-cols-1 lg:grid-cols-[1fr_360px]">

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2.5rem,4vw,3.5rem)" }}>

            {/* Quick stats row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {[
                { icon: Clock, label: "Duration", value: trip.duration },
                { icon: Users, label: "Group Size", value: trip.groupSize },
                { icon: Mountain, label: "Difficulty", value: trip.difficulty },
                { icon: Calendar, label: "Best Time", value: trip.bestTime },
                ...(trip.altitude ? [{ icon: Zap, label: "Max Altitude", value: trip.altitude }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ffffff", border: "1px solid rgba(30,26,20,0.07)", borderRadius: "8px", padding: "12px 18px", flexShrink: 0 }}>
                  <Icon size={15} color="#781216" strokeWidth={1.5} />
                  <div>
                    <p style={{ color: "rgba(30,26,20,0.42)", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>{label}</p>
                    <p style={{ color: "#1e1a14", fontSize: "0.82rem", fontWeight: 500, margin: 0 }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Overview */}
            <div id="overview">
              <SectionTitle>Overview</SectionTitle>
              <p style={{ color: "rgba(30,26,20,0.68)", fontSize: "0.92rem", fontWeight: 300, lineHeight: 1.85 }}>{trip.description}</p>
            </div>

            {/* Highlights */}
            <div id="highlights">
              <SectionTitle>Trip Highlights</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {trip.highlights.map((h) => (
                  <div key={h} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(120,18,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#781216" }} />
                    </div>
                    <span style={{ color: "rgba(30,26,20,0.75)", fontSize: "0.88rem", fontWeight: 300, lineHeight: 1.6 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Itinerary */}
            <div id="itinerary">
              <SectionTitle>Day-by-Day Itinerary</SectionTitle>
              <ItineraryAccordion days={trip.itinerary} />
            </div>

            {/* Gallery */}
            {trip.galleryImages.length > 0 && (
              <div>
                <SectionTitle>Gallery</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {trip.galleryImages.map((img, i) => (
                    <div key={i} style={{ borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3" }}>
                      <img src={img} alt={`${trip.name} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accommodation & Transport */}
            <AccommodationSection />

            {/* Inclusions + Exclusions */}
            <div id="included">
              <SectionTitle>What's Included</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="grid-cols-1 sm:grid-cols-2">
                <div>
                  <p style={{ color: "#1e1a14", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>Included ✓</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {trip.inclusions.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <CheckCircle size={14} color="#781216" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ color: "rgba(30,26,20,0.7)", fontSize: "0.8rem", fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px" }}>Not Included ✗</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {trip.exclusions.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <XCircle size={14} color="rgba(30,26,20,0.3)" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ color: "rgba(30,26,20,0.52)", fontSize: "0.8rem", fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div id="reviews">
              <div style={{ display: "flex", alignItems: "baseline", gap: "14px", marginBottom: "24px" }}>
                <h2 style={{ color: "#1e1a14", fontSize: "1.3rem", fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>Traveler Reviews</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StarRating rating={5} />
                  <span style={{ color: "rgba(30,26,20,0.55)", fontSize: "0.78rem" }}>{avgRating.toFixed(1)} / 5 · {trip.reviews.length} reviews</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {trip.reviews.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, delay: i * 0.08 }}
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(30,26,20,0.07)",
                      borderLeft: "3px solid #C8A96E",
                      borderRadius: "10px",
                      padding: "22px 24px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <img src={r.avatar} alt={r.name} style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
                      <div>
                        <p style={{ color: "#1e1a14", fontSize: "0.85rem", fontWeight: 500, margin: "0 0 2px" }}>{r.name}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <StarRating rating={r.rating} />
                          <span style={{ color: "rgba(30,26,20,0.4)", fontSize: "0.62rem", letterSpacing: "0.08em" }}>{r.tripMonth}</span>
                        </div>
                      </div>
                    </div>
                    <p style={{ color: "rgba(30,26,20,0.68)", fontSize: "0.84rem", fontWeight: 300, lineHeight: 1.75, margin: 0 }}>"{r.text}"</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <FAQSection />

          </div>

          {/* ── RIGHT COLUMN: Sticky booking card ── */}
          <div className="hidden lg:block" style={{ alignSelf: "stretch" }}>
            <div style={{ position: "sticky", top: "130px", display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Price card */}
              <div style={{ background: "#ffffff", border: "1px solid rgba(30,26,20,0.08)", borderRadius: "14px", padding: "28px", boxShadow: "0 4px 24px rgba(30,26,20,0.07)" }}>
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ color: "rgba(30,26,20,0.42)", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 4px" }}>Starting from</p>
                  <p style={{ color: "#1e1a14", fontSize: "2.2rem", fontWeight: 600, letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>{trip.price}</p>
                  <p style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.7rem", margin: "4px 0 0" }}>per person, all inclusive</p>
                </div>

                {/* Key info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", paddingTop: "20px", borderTop: "1px solid rgba(30,26,20,0.06)" }}>
                  {[
                    { label: "Duration", val: trip.duration },
                    { label: "Group Size", val: trip.groupSize },
                    { label: "Difficulty", val: trip.difficulty },
                    { label: "Availability", val: `${trip.spots} spots left` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.75rem" }}>{label}</span>
                      <span style={{ color: "#1e1a14", fontSize: "0.78rem", fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Book button */}
                <Link
                  to={`/book/${trip.slug}`}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "#781216",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    marginBottom: "10px",
                    transition: "background 0.25s ease",
                    textDecoration: "none",
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#9a1a1f")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#781216")}
                >
                  Book This Trip
                </Link>

                {/* WhatsApp button */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "100%",
                    background: "#25D366",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "13px",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    textDecoration: "none",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#1db954")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#25D366")}
                >
                  <MessageCircle size={15} />
                  Ask on WhatsApp
                </a>

                {/* Partial payment note */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginTop: "14px",
                  padding: "10px 12px",
                  background: "rgba(184,148,58,0.06)",
                  borderRadius: "6px",
                  border: "1px solid rgba(184,148,58,0.18)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8943a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{
                    color: "rgba(30,26,20,0.62)",
                    fontSize: "0.7rem",
                    fontWeight: 300,
                    lineHeight: 1.6,
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                  }}>
                    <span style={{ color: "#b8943a", fontWeight: 600 }}>Partial payment available</span>
                    {" "}— pay a token amount now and settle the rest before departure. Details at the booking page.
                  </p>
                </div>
              </div>

              {/* Trust badges */}
              <div style={{ background: "#ffffff", border: "1px solid rgba(30,26,20,0.07)", borderRadius: "12px", padding: "20px" }}>
                {[
                  { icon: Shield, text: "Secure booking & instant confirmation" },
                  { icon: Users, text: "Small groups — max 12–16 people" },
                  { icon: Star, text: "4.9/5 average from 100+ travelers" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(30,26,20,0.05)" }}>
                    <Icon size={14} color="#C8A96E" strokeWidth={1.5} />
                    <span style={{ color: "rgba(30,26,20,0.6)", fontSize: "0.75rem", fontWeight: 300 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Related Trips ── */}
      <RelatedTrips currentId={trip.id} currentType={trip.type} />

      {/* ── WhatsApp FAB — always visible ── */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          zIndex: 200,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#25D366",
          boxShadow: "0 4px 20px rgba(37,211,102,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 28px rgba(37,211,102,0.6)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(37,211,102,0.45)"; }}
      >
        <MessageCircle size={24} color="#fff" fill="#fff" />
      </a>

      <SiteFooter />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2 style={{ color: "#1e1a14", fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{children}</h2>
      <div style={{ width: "32px", height: "2px", background: "#781216", borderRadius: "1px" }} />
    </div>
  );
}
