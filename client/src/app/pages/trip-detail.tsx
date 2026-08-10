import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Clock,
  Users,
  ChevronDown,
  CheckCircle,
  XCircle,
  Star,
  ArrowLeft,
  Mountain,
  Calendar,
  MessageCircle,
  Shield,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Truck,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import {
  fetchTripBySlug,
  fetchAllTrips,
  formatTripType,
  formatPrice,
  formatDuration,
  formatAltitude,
  spotsLeft,
  safeValue,
  isNotAvailable,
  type ApiTrip,
  type ApiFaq,
} from "../../lib/tripApi";
import { fetchFestivalBySlug } from "../../lib/festivalApi";
import { SiteFooter } from "../components/site-footer";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../lib/axios";
import { toast } from "sonner";
import { mediaImageUrl, mediaVideoUrl } from "../../lib/media";
import { getErrorMessage } from "../../lib/errors";

// ── "Not Available" inline label ──────────────────────────────────
function NA({ text = "Not Available" }: { text?: string }) {
  return (
    <span
      style={{
        color: "#c0392b",
        fontSize: "inherit",
        fontWeight: 500,
        fontStyle: "italic",
      }}
    >
      {text}
    </span>
  );
}

// ── Related Trips ─────────────────────────────────────────────────
function RelatedTrips({
  currentId,
  currentType,
}: {
  currentId: string;
  currentType: string;
}) {
  const [related, setRelated] = useState<ApiTrip[]>([]);

  useEffect(() => {
    if (!currentType) return;
    fetchAllTrips()
      .then((all) => {
        const sameType = all.filter(
          (t) => t.id !== currentId && t.tripType === currentType,
        );
        const others = all.filter(
          (t) => t.id !== currentId && t.tripType !== currentType,
        );
        setRelated([...sameType, ...others].slice(0, 6));
      })
      .catch(() => {});
  }, [currentId, currentType]);

  if (related.length === 0) return null;

  return (
    <section
      style={{
        background: "#f5f0e6",
        borderTop: "1px solid rgba(30,26,20,0.07)",
        padding: "clamp(2.5rem,5vw,4rem) 0",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 clamp(1.5rem,5vw,6rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "clamp(1.5rem,3vw,2rem)",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <p
              style={{
                color: "#781216",
                fontSize: "0.68rem",
                fontWeight: 500,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              / You might also like
            </p>
            <h2
              style={{
                color: "#1e1a14",
                fontSize: "clamp(1.4rem,2.5vw,2rem)",
                fontWeight: 300,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              More trips to{" "}
              <em style={{ color: "#781216", fontStyle: "italic" }}>
                explore.
              </em>
            </h2>
          </div>
          <Link
            to="/trips"
            style={{
              color: "rgba(30,26,20,0.5)",
              fontSize: "0.75rem",
              fontWeight: 400,
              letterSpacing: "0.06em",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#781216")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "rgba(30,26,20,0.5)")
            }
          >
            View all trips →
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "12px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            cursor: "grab",
          }}
        >
          {related.map((t) => (
            <RelatedCard key={t.id} trip={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedCard({ trip }: { trip: ApiTrip }) {
  const [hovered, setHovered] = useState(false);
  const heroImage = trip.bannerImages?.[0] || "";
  const typeLabel = trip.tripType ? formatTripType(trip.tripType) : "Trip";

  return (
    <Link
      to={`/trips/${trip.id}`}
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
      <div
        style={{
          position: "relative",
          aspectRatio: "16/10",
          overflow: "hidden",
        }}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={trip.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.5s ease",
              transform: hovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#ede8dc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NA text="No Image" />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(11,11,11,0.5) 0%, transparent 55%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "#781216",
            color: "#fff",
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "0.55rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {typeLabel}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "5px",
          }}
        >
          <MapPin size={10} color="#781216" />
          <span
            style={{
              color: "#781216",
              fontSize: "0.6rem",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {trip.location || <NA />}
          </span>
        </div>
        <h3
          style={{
            color: "#1e1a14",
            fontSize: "0.9rem",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            margin: "0 0 8px",
          }}
        >
          {trip.title}
        </h3>
        <p
          style={{
            color: "rgba(30,26,20,0.5)",
            fontSize: "0.72rem",
            fontWeight: 300,
            lineHeight: 1.55,
            margin: "0 0 12px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {trip.overview ? (
            trip.overview.substring(0, 100) + "…"
          ) : (
            <NA text="No description" />
          )}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "10px",
            borderTop: "1px solid rgba(30,26,20,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={10} color="rgba(30,26,20,0.4)" />
            <span style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.68rem" }}>
              {formatDuration(trip.duration)}
            </span>
          </div>
          <span
            style={{
              color: "#1e1a14",
              fontSize: "0.82rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {formatPrice(trip.packages?.[0]?.price || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Section Navigator ─────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "highlights", label: "Highlights" },
  { id: "itinerary", label: "Itinerary" },
  { id: "accommodation", label: "Stay & Travel" },
  { id: "included", label: "Included" },
  { id: "faqs", label: "FAQs" },
];

function SectionNav() {
  const [active, setActive] = useState("overview");
  const [visible, setVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-30% 0px -60% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const scroller = navRef.current?.querySelector(
      ".trip-section-nav-scroll",
    ) as HTMLDivElement | null;
    const activeItem = navRef.current?.querySelector(
      `[data-section-id="${active}"]`,
    ) as HTMLButtonElement | null;
    if (!scroller || !activeItem) return;

    scroller.scrollTo({
      left:
        activeItem.offsetLeft -
        scroller.clientWidth / 2 +
        activeItem.clientWidth / 2,
      behavior: "smooth",
    });
  }, [active]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = (window.innerWidth < 768 ? 56 : 72) + 45 + 16;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <motion.div
      className="trip-section-nav"
      ref={navRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: "fixed",
        top: "72px",
        left: 0,
        right: 0,
        zIndex: 80,
        background: "rgba(245,240,230,0.96)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(30,26,20,0.08)",
        boxShadow: "0 2px 12px rgba(30,26,20,0.05)",
      }}
    >
      <div
        className="trip-section-nav-scroll"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 clamp(1.5rem,5vw,6rem)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {NAV_SECTIONS.map(({ id, label }) => (
          <button
            className="trip-section-nav-item"
            data-section-id={id}
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
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Accommodation & Transport (from backend) ──────────────────────
function AccommodationSection({
  items,
}: {
  items: { text: string; imageUrl: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div
        id="accommodation"
        style={{
          background: "rgba(30,26,20,0.03)",
          border: "1px solid rgba(30,26,20,0.08)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <Home size={14} color="#781216" strokeWidth={1.5} />
          <Truck size={14} color="#781216" strokeWidth={1.5} />
        </div>
        <div>
          <p
            style={{
              color: "#1e1a14",
              fontSize: "0.85rem",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Stay & Transport
          </p>
          <p
            style={{
              color: "#c0392b",
              fontSize: "0.7rem",
              fontWeight: 500,
              margin: "2px 0 0",
              fontStyle: "italic",
            }}
          >
            Not Available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="accommodation">
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
            <p
              style={{
                color: "#1e1a14",
                fontSize: "0.85rem",
                fontWeight: 500,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Stay & Transport
            </p>
            <p
              style={{
                color: "rgba(30,26,20,0.42)",
                fontSize: "0.7rem",
                fontWeight: 300,
                margin: "2px 0 0",
              }}
            >
              {open
                ? "Tap to collapse"
                : "See where you'll sleep and how you'll move — tap to explore"}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
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
            <div
              style={{
                border: "1px solid rgba(30,26,20,0.08)",
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                background: "#ffffff",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                }}
                className="grid-cols-2 sm:grid-cols-3"
              >
                {items.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: "8px",
                      overflow: "hidden",
                      position: "relative",
                      aspectRatio: "4/3",
                      background: "#ede8dc",
                    }}
                  >
                    <img
                      src={mediaImageUrl(p.imageUrl, { width: 960, height: 720 })}
                      alt={p.text}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background:
                          "linear-gradient(to top, rgba(11,11,11,0.7) 0%, transparent 100%)",
                        padding: "16px 10px 8px",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(242,237,228,0.88)",
                          fontSize: "0.62rem",
                          fontWeight: 400,
                          fontFamily: "'Poppins', sans-serif",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {p.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p
                style={{
                  color: "rgba(30,26,20,0.42)",
                  fontSize: "0.72rem",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  marginTop: "14px",
                  marginBottom: 0,
                  fontStyle: "italic",
                }}
              >
                The property shown here are subject to availability. The
                pictures shown here are the shots taken from the best part of
                the particular property. Original or other parts of the property
                may differ.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── FAQs (from backend) ───────────────────────────────────────────
function FAQSection({ faqs }: { faqs: ApiFaq[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) {
    return (
      <div id="faqs">
        <SectionTitle>Frequently Asked Questions</SectionTitle>
        <p
          style={{
            color: "#c0392b",
            fontSize: "0.85rem",
            fontWeight: 500,
            fontStyle: "italic",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Not Available
        </p>
      </div>
    );
  }

  const sortedFaqs = [...faqs].sort((a, b) => a.order - b.order);

  return (
    <div id="faqs">
      <SectionTitle>Frequently Asked Questions</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sortedFaqs.map((faq, i) => (
          <div
            key={faq.id}
            style={{
              border: "1px solid rgba(30,26,20,0.08)",
              borderRadius: "10px",
              overflow: "hidden",
              background: open === i ? "#ffffff" : "#faf8f4",
              transition: "background 0.2s ease",
            }}
          >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <HelpCircle
                  size={14}
                  color={open === i ? "#781216" : "rgba(30,26,20,0.28)"}
                  strokeWidth={1.5}
                  style={{ flexShrink: 0, transition: "color 0.2s" }}
                />
                <span
                  style={{
                    color: "#1e1a14",
                    fontSize: "0.88rem",
                    fontWeight: open === i ? 500 : 400,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.4,
                    transition: "font-weight 0.15s",
                  }}
                >
                  {faq.question}
                </span>
              </div>
              <motion.div
                animate={{ rotate: open === i ? 180 : 0 }}
                transition={{ duration: 0.22 }}
                style={{ flexShrink: 0 }}
              >
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
                  <p
                    style={{
                      color: "rgba(30,26,20,0.65)",
                      fontSize: "0.82rem",
                      fontWeight: 300,
                      lineHeight: 1.78,
                      margin: 0,
                      padding: "0 20px 18px 46px",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    {faq.answer}
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

const WHATSAPP_NUMBER = "918415929069";

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          fill={s <= rating ? "#C8A96E" : "none"}
          color={s <= rating ? "#C8A96E" : "rgba(30,26,20,0.2)"}
        />
      ))}
    </div>
  );
}

function ItineraryAccordion({
  days,
}: {
  days: {
    day?: string;
    dayNumber?: number;
    title?: string;
    description?: string | null;
    todos?: string[];
    activities?: string | string[] | { title: string }[];
  }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "'Poppins', sans-serif" }}>
      {days.map((d, index) => {
        const rawDay = d.day || d.dayNumber || (index + 1);
        const numericDay = String(rawDay).replace(/day/i, '').trim();
        const titleText = d.title || "";
        
        let acts: string[] = [];
        if (Array.isArray(d.todos) && d.todos.length > 0) {
          acts = d.todos;
        } else if (Array.isArray(d.activities)) {
          const first = d.activities[0];
          if (typeof first === 'object' && first !== null && 'title' in first) {
            acts = (d.activities as { title: string }[]).map((a) => a.title);
          } else {
            acts = d.activities as string[];
          }
        } else if (typeof d.activities === 'string') {
          acts = d.activities.split('\n');
        } else if (d.description) {
          acts = [d.description];
        }

        acts = acts.map((activity) => activity.trim()).filter((activity) => activity.length > 0);
        const description = d.description?.trim();
        if (description && !acts.includes(description)) acts.unshift(description);
        const isOpen = openIndex === index;

        return (
          <div 
            className="trip-itinerary-card"
            key={index}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "14px 18px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.2s ease"
            }}
            onClick={() => setOpenIndex(isOpen ? null : index)}
          >
            <div className="trip-itinerary-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <div className="trip-itinerary-heading" style={{ display: "flex", gap: "16px", alignItems: "flex-start", minWidth: 0 }}>
                {/* Number Badge */}
                <div style={{
                  width: "30px", height: "30px", borderRadius: "50%",
                  background: isOpen ? "#781216" : "#f2e8e3",
                  color: isOpen ? "#ffffff" : "#781216",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", fontWeight: 700, flexShrink: 0,
                  transition: "all 0.2s ease"
                }}>
                  {numericDay}
                </div>
                {/* Text */}
                <div style={{ paddingTop: "2px", minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.55rem", fontWeight: 600, color: "rgba(30,26,20,0.4)",
                    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px"
                  }}>
                    DAY {numericDay}
                  </div>
                  <div className="trip-itinerary-title" style={{
                    fontSize: "0.95rem", fontWeight: 600, color: "#1e1a14",
                    letterSpacing: "-0.01em"
                  }}>
                    {titleText || `Day ${numericDay} Itinerary`}
                  </div>
                </div>
              </div>
              <div style={{ paddingTop: "8px", color: "rgba(30,26,20,0.3)" }}>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="trip-itinerary-content" style={{
                    paddingTop: "12px", paddingLeft: "46px",
                    color: "rgba(30,26,20,0.65)", fontSize: "0.8rem", lineHeight: 1.5
                  }}>
                    {acts.length > 0 ? (
                      <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                        {acts.map((act, i) => {
                          // Render the first item as a paragraph without a bullet if it seems like a long description, 
                          // or if we just want to follow the screenshot exactly (which has one paragraph, then bullets).
                          // To keep it simple and robust, let's check if the first item doesn't look like a bullet and is reasonably long.
                          // But we can also just render it as a bullet if we aren't sure. 
                          // Let's just make it a bullet for consistency, as per previous instructions.
                          // Or we can just render the first one without a bullet if it's the first item!
                          // Let's do that for the exact match with screenshot.
                          const isDescription = i === 0 && act.length > 40 && acts.length > 1;
                          
                          if (isDescription) {
                            return (
                              <li key={i} style={{ marginBottom: "6px" }}>
                                {act.trim()}
                              </li>
                            );
                          }
                          
                          return (
                            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <div style={{ 
                                width: "5px", height: "5px", borderRadius: "50%", 
                                background: "#C8A96E", marginTop: "6px", flexShrink: 0 
                              }} />
                              <span>{act.trim()}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span style={{ fontStyle: "italic", color: "rgba(30,26,20,0.4)" }}>No activities listed</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────
function DetailLoadingSkeleton() {
  return (
    <div
      style={{
        background: "#f5f0e6",
        minHeight: "100vh",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Hero placeholder */}
      <div
        style={{
          height: "70vh",
          minHeight: "480px",
          background: "#1e1a14",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "3rem",
            left: "clamp(1.5rem,5vw,6rem)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "20px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.1)",
              marginBottom: "16px",
            }}
          />
          <div
            style={{
              width: "400px",
              maxWidth: "80vw",
              height: "48px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.08)",
              marginBottom: "12px",
            }}
          />
          <div
            style={{
              width: "200px",
              height: "16px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "3rem clamp(1.5rem,5vw,6rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "2rem",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: "160px",
                height: "52px",
                borderRadius: "8px",
                background: "rgba(30,26,20,0.05)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: "100%",
            height: "200px",
            borderRadius: "12px",
            background: "rgba(30,26,20,0.04)",
          }}
        />
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

export default function TripDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isFestival = location.pathname.startsWith("/festivals");
  const shareToken = new URLSearchParams(location.search).get("share");
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null); // polymorphic: ApiTrip | ApiFestival
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasBooked, setHasBooked] = useState(false);
  const [reservedBookingId, setReservedBookingId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const loadTrip = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await (isFestival ? fetchFestivalBySlug(slug) : fetchTripBySlug(slug, shareToken));
      setTrip(data);
    } catch (error) {
      const message = getErrorMessage(error, isFestival ? "Festival not found" : "Trip not found");
      setError(message);
      toast.error(message, { id: `trip-detail-load-${slug}` });
    } finally {
      setLoading(false);
    }
  }, [isFestival, shareToken, slug]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    const slots = trip?.slots || [];
    const currentSlot = slots.find((slot: any) => slot.id === selectedSlotId);
    const currentAvailable = currentSlot
      ? currentSlot.capacity - (currentSlot.filledSpots || 0) > 0
      : false;

    if (currentAvailable) return;

    const firstAvailable = slots.find(
      (slot: any) => slot.capacity - (slot.filledSpots || 0) > 0,
    );
    setSelectedSlotId(firstAvailable?.id || null);
  }, [trip, selectedSlotId]);

  useEffect(() => {
    if (user && trip) {
      apiClient
        .get(`/bookings/me?limit=100`)
        .then((res) => {
          const bookings = res.data?.data || [];
          const belongsToCurrentItem = (booking: any) => {
            if (!isFestival && (trip as any).isCrmTrip) {
              return booking.crmTripId === trip.id;
            }
            const itemId = isFestival
              ? booking.festivalId || booking.festival?.id || booking.slot?.festivalId
              : booking.tripId || booking.trip?.id || booking.slot?.tripId;
            return itemId === trip.id;
          };
          const confirmed = bookings.find(
            (b: any) => belongsToCurrentItem(b) && b.status === "CONFIRMED"
          );
          const reserved = bookings.find(
            (b: any) => belongsToCurrentItem(b) && b.status === "RESERVED"
          );
          setHasBooked(!!confirmed);
          setReservedBookingId(reserved?.id || null);
        })
        .catch((error) => toast.error(getErrorMessage(error, "Your booking status could not be checked"), { id: `trip-booking-status-${trip.id}` }));
    }
  }, [user, trip, isFestival]);

  if (loading) return <DetailLoadingSkeleton />;

  if (error || !trip) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Poppins', sans-serif",
          background: "#f5f0e6",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <AlertCircle
            size={40}
            color="#c0392b"
            strokeWidth={1.5}
            style={{ marginBottom: "16px" }}
          />
          <p
            style={{
              color: "#c0392b",
              fontSize: "1rem",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            {error || "Trip not found"}
          </p>
          <button
            type="button"
            onClick={loadTrip}
            style={{
              color: "#781216",
              fontSize: "0.82rem",
              fontWeight: 500,
              textDecoration: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            Try again
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: "18px", color: "rgba(30,26,20,0.6)", fontSize: "0.82rem", background: "none", border: "none", cursor: "pointer" }}>← Go back</button>
        </div>
      </div>
    );
  }

  // Derived values
  const heroImage = trip.bannerImages?.[0] || "";
  const allImages = trip.bannerImages || [];
  const typeLabel = trip.tripType ? formatTripType(trip.tripType) : "Festival";
  const tripPrice = trip.packages?.[0]?.price || 0;
  const priceStr = formatPrice(tripPrice);
  const durationStr = formatDuration(trip.duration);
  const slots = Array.isArray(trip.slots) ? trip.slots : [];
  const spots = slots.length > 0
    ? slots.reduce(
        (total: number, slot: any) =>
          total + Math.max(0, slot.capacity - (slot.filledSpots || 0)),
        0,
      )
    : spotsLeft(trip.capacity, trip.filledSpots);
  const tags = trip.tripTags?.map((t: any) => t.tag) || [];
  const stayItems = (
    Array.isArray(trip.stayTransportImages) ? trip.stayTransportImages : []
  ) as { text: string; imageUrl: string }[];

  // Flatten itinerary days
  const itineraryDays = Array.isArray(trip.itinerary) 
    ? [...trip.itinerary]
        .map((d: any) => ({ ...d, dayNumber: d.dayNumber || d.day }))
        .sort((a: any, b: any) => a.dayNumber - b.dayNumber)
    : [];

  const waMessage = encodeURIComponent(
    `Hi! I'm interested in the "${trip.title}" trip. Can you share more details?`,
  );
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <TripDetailContent
      trip={trip}
      heroImage={heroImage}
      allImages={allImages}
      typeLabel={typeLabel}
      priceStr={priceStr}
      durationStr={durationStr}
      spots={spots}
      tags={tags}
      stayItems={stayItems}
      itineraryDays={itineraryDays}
      waLink={waLink}
      hasBooked={hasBooked}
      reservedBookingId={reservedBookingId}
      selectedSlotId={selectedSlotId}
      setSelectedSlotId={setSelectedSlotId}
      isFestival={isFestival}
    />
  );
}

function HighlightAccordionPanel({
  highlight,
  index,
  isActive,
  onEnter,
}: {
  highlight: { text: string; imageUrl: string };
  index: number;
  isActive: boolean;
  onEnter: () => void;
}) {
  return (
    <motion.div
      onMouseEnter={onEnter}
      animate={{ flex: isActive ? 5 : 1 }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        borderRadius: "4px",
        minWidth: 0,
      }}
    >
      <img
        src={mediaImageUrl(highlight.imageUrl, { width: 960, height: 640 })}
        alt={`Highlight ${index + 1}`}
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          transition: "transform 0.65s ease",
          transform: isActive ? "scale(1.04)" : "scale(1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isActive
            ? "linear-gradient(to top, rgba(11,11,11,0.85) 0%, rgba(11,11,11,0.2) 60%, rgba(11,11,11,0.05) 100%)"
            : "linear-gradient(to top, rgba(11,11,11,0.8) 0%, rgba(11,11,11,0.5) 100%)",
          transition: "background 0.5s ease",
        }}
      />
      <motion.div
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "16px",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            color: "rgba(242,237,228,0.9)",
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxHeight: "90%",
          }}
        >
          {highlight.text}
        </span>
      </motion.div>
      <motion.div
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
        transition={{ duration: 0.45, delay: isActive ? 0.2 : 0 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px 16px",
        }}
      >
        <p style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
          {highlight.text}
        </p>
      </motion.div>
    </motion.div>
  );
}

function HighlightMobilePanel({
  highlight,
  index,
  isActive,
  onToggle,
}: {
  highlight: { text: string; imageUrl: string };
  index: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "4px",
        cursor: "pointer",
        height: isActive ? "220px" : "56px",
        transition: "height 0.55s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    >
      <img
        src={mediaImageUrl(highlight.imageUrl, { width: 720, height: 440 })}
        alt={`Highlight ${index + 1}`}
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(11,11,11,0.85) 0%, rgba(11,11,11,0.4) 100%)",
        }}
      />
      {!isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <span
            style={{
              color: "#f2ede4",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "85%",
            }}
          >
            {highlight.text}
          </span>
          <ChevronRight size={14} color="rgba(242,237,228,0.6)" />
        </div>
      )}
      {isActive && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 16px",
          }}
        >
          <p style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
            {highlight.text}
          </p>
        </div>
      )}
      <motion.div
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "2.5px",
          background: "#b8943a",
          transformOrigin: "left",
        }}
      />
    </div>
  );
}

function TripHighlightsAccordion({ highlights }: { highlights: any[] }) {
  const [active, setActive] = useState(0);

  return (
    <div style={{ width: "100%" }}>
      {/* Desktop */}
      <div
        className="hidden md:flex"
        style={{ height: "320px", gap: "6px", overflow: "hidden" }}
      >
        {highlights.map((h, index) => (
          <HighlightAccordionPanel
            key={index}
            highlight={h}
            index={index}
            isActive={active === index}
            onEnter={() => setActive(index)}
          />
        ))}
      </div>

      {/* Mobile */}
      <div className="flex flex-col md:hidden" style={{ gap: "6px" }}>
        {highlights.map((h, index) => (
          <HighlightMobilePanel
            key={index}
            highlight={h}
            index={index}
            isActive={active === index}
            onToggle={() => setActive(active === index ? -1 : index)}
          />
        ))}
      </div>
    </div>
  );
}

function TripDetailContent({
  trip,
  heroImage,
  allImages,
  typeLabel,
  priceStr,
  durationStr,
  spots,
  tags,
  stayItems,
  itineraryDays,
  waLink,
  hasBooked,
  reservedBookingId,
  isFestival,
  selectedSlotId,
  setSelectedSlotId,
}: {
  trip: ApiTrip;
  heroImage: string;
  allImages: string[];
  typeLabel: string;
  priceStr: string;
  durationStr: string;
  spots: number;
  tags: string[];
  stayItems: { text: string; imageUrl: string }[];
  itineraryDays: {
    dayNumber: number;
    title: string;
    description: string | null;
    activities: { title: string }[];
  }[];
  waLink: string;
  hasBooked: boolean;
  reservedBookingId: string | null;
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  isFestival?: boolean;
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const safeAllImages =
    allImages.length > 0 ? allImages : [heroImage].filter(Boolean);
  const festivalVideoUrl = isFestival ? (trip as any).videoUrl as string | null | undefined : null;
  const showHeroVideo = Boolean(festivalVideoUrl);
  const bookingParams = new URLSearchParams();
  if (isFestival) bookingParams.set("type", "festival");
  if (selectedSlotId) bookingParams.set("slotId", selectedSlotId);
  const shareToken = new URLSearchParams(window.location.search).get("share");
  if (shareToken) bookingParams.set("share", shareToken);
  const bookingPath = `/book/${trip.id}${bookingParams.size ? `?${bookingParams.toString()}` : ""}`;

  const prevHero = () =>
    setHeroIndex((i) => (i - 1 + safeAllImages.length) % safeAllImages.length);
  const nextHero = () => setHeroIndex((i) => (i + 1) % safeAllImages.length);
  const prevLight = useCallback(
    () =>
      setLightbox((i) =>
        i !== null
          ? (i - 1 + safeAllImages.length) % safeAllImages.length
          : null,
      ),
    [safeAllImages.length],
  );
  const nextLight = useCallback(
    () =>
      setLightbox((i) => (i !== null ? (i + 1) % safeAllImages.length : null)),
    [safeAllImages.length],
  );

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
    <div
      className="trip-detail-page"
      style={{
        background: "#f5f0e6",
        minHeight: "100vh",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightbox !== null && safeAllImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 500,
              background: "rgba(0,0,0,0.93)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "24px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              <X size={18} color="#fff" />
            </button>
            <span
              style={{
                position: "absolute",
                top: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {lightbox + 1} / {safeAllImages.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevLight();
              }}
              style={{
                position: "absolute",
                left: "20px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <ChevronLeft size={22} color="#fff" />
            </button>
            <AnimatePresence mode="wait">
              <motion.img
                key={lightbox}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                src={mediaImageUrl(safeAllImages[lightbox], { width: 2560, fit: "limit", quality: "auto:good" })}
                alt={trip.title}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
                }}
              />
            </AnimatePresence>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextLight();
              }}
              style={{
                position: "absolute",
                right: "20px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <ChevronRight size={22} color="#fff" />
            </button>
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "8px",
              }}
            >
              {safeAllImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(i);
                  }}
                  style={{
                    width: "52px",
                    height: "36px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: `2px solid ${i === lightbox ? "#C8A96E" : "transparent"}`,
                    padding: 0,
                    cursor: "pointer",
                    opacity: i === lightbox ? 1 : 0.5,
                    transition: "all 0.2s",
                  }}
                >
                  <img
                    src={mediaImageUrl(img, { width: 160, height: 120 })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Carousel ── */}
      <div
        className="trip-detail-hero"
        style={{
          position: "relative",
          height: "70vh",
          minHeight: "480px",
          overflow: "hidden",
          cursor: showHeroVideo ? "default" : "zoom-in",
        }}
      >
        {showHeroVideo ? (
          <motion.video
            key={festivalVideoUrl}
            src={mediaVideoUrl(festivalVideoUrl!)}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        ) : safeAllImages.length > 0 ? (
          <AnimatePresence mode="sync" initial={false}>
            <motion.img
              key={heroIndex}
              src={mediaImageUrl(safeAllImages[heroIndex], { width: 1920, fit: "fit" })}
              alt={trip.title}
              fetchPriority="high"
              decoding="async"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => setLightbox(heroIndex)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          </AnimatePresence>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1e1a14 0%, #2c1a1d 50%, #1e1a14 100%)",
              color: "#fff",
              textAlign: "center",
              padding: "24px",
            }}
          >
            <MapPin size={48} strokeWidth={1.5} style={{ marginBottom: "16px", color: "#781216", opacity: 0.9 }} />
            <h2 style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "0.02em", color: "#f5f0e6", margin: "0 auto", maxWidth: "600px" }}>
              {trip.title || "Your Itinerary"}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "rgba(245,240,230,0.6)", marginTop: "8px", fontWeight: 400, margin: 0 }}>
              Itinerary details & travel plan
            </p>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(11,11,11,0.88) 0%, rgba(11,11,11,0.35) 55%, rgba(11,11,11,0.15) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            top: "90px",
            left: "clamp(1.5rem,5vw,6rem)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(242,237,228,0.8)",
            fontSize: "0.75rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textDecoration: "none",
            fontFamily: "'Poppins', sans-serif",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0
          }}
        >
          <ArrowLeft size={14} /> Go Back
        </button>

        {/* Prev / Next arrows */}
        {!showHeroVideo && safeAllImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevHero();
              }}
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
              }
            >
              <ChevronLeft size={18} color="#fff" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextHero();
              }}
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
              }
            >
              <ChevronRight size={18} color="#fff" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {!showHeroVideo && safeAllImages.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "clamp(80px,12vw,120px)",
              right: "clamp(1.5rem,5vw,6rem)",
              display: "flex",
              gap: "6px",
            }}
          >
            {safeAllImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                style={{
                  width: i === heroIndex ? "20px" : "6px",
                  height: "3px",
                  borderRadius: "2px",
                  background:
                    i === heroIndex ? "#C8A96E" : "rgba(255,255,255,0.45)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "width 0.35s ease, background 0.25s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* Hero content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 clamp(1.5rem,5vw,6rem) clamp(2rem,4vw,3.5rem)",
            pointerEvents: "none",
          }}
        >
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  background: "#781216",
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "3px 10px",
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {typeLabel}
              </span>
            </div>
            <h1
              style={{
                color: "#f2ede4",
                fontSize: "clamp(2rem,5vw,3.8rem)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                margin: "0 0 10px",
              }}
            >
              {trip.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <MapPin size={13} color="#C8A96E" />
              <span
                style={{
                  color: "rgba(242,237,228,0.75)",
                  fontSize: "0.82rem",
                  fontWeight: 300,
                }}
              >
                {trip.location || <NA />}
                {trip.destination?.state && ` · ${trip.destination.state}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky section navigator ── */}
      <SectionNav />

      {/* ── Main content ── */}
      <div
        className="trip-detail-main"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,6rem)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: "clamp(2rem,4vw,4rem)",
          }}
          className="trip-detail-grid grid-cols-1 lg:grid-cols-[1fr_360px]"
        >
          {/* ── LEFT COLUMN ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(2.5rem,4vw,3.5rem)",
            }}
          >
            {/* Quick stats row */}
            <div className="trip-quick-stats" style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {[
                { icon: Clock, label: "Duration", value: durationStr },
                {
                  icon: Calendar,
                  label: "Dates",
                  value: trip.slots && trip.slots.length > 0
                    ? trip.slots.length === 1 
                      ? `${new Date(trip.slots[0].startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` 
                      : `${trip.slots.length} Slots Available`
                    : null,
                },
                {
                  icon: Calendar,
                  label: "Best Time",
                  value: trip.bestTimeToVisit || null,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  className={`trip-stat-card ${label === "Best Time" ? "trip-stat-card-wide" : ""}`}
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#ffffff",
                    border: "1px solid rgba(30,26,20,0.07)",
                    borderRadius: "8px",
                    padding: "12px 18px",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color="#781216" strokeWidth={1.5} />
                  <div className="trip-stat-content">
                    <p
                      style={{
                        color: "rgba(30,26,20,0.42)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="trip-stat-value"
                      style={{
                        color: "#1e1a14",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        margin: 0,
                      }}
                    >
                      {isNotAvailable(value) ? <NA /> : value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Overview */}
            <div id="overview">
              <SectionTitle>Overview</SectionTitle>
              {trip.overview ? (
                <p
                  style={{
                    color: "rgba(30,26,20,0.68)",
                    fontSize: "0.92rem",
                    fontWeight: 300,
                    lineHeight: 1.85,
                  }}
                >
                  {trip.overview}
                </p>
              ) : (
                <p
                  style={{
                    color: "#c0392b",
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    fontStyle: "italic",
                  }}
                >
                  Not Available
                </p>
              )}
            </div>

            {/* Highlights */}
            <div id="highlights">
              <SectionTitle>Trip Highlights</SectionTitle>
              {(() => {
                let h: any[] = Array.isArray(trip.highlights) ? trip.highlights : [];
                if (typeof trip.highlights === 'string') {
                  try { h = JSON.parse(trip.highlights); } catch(e) { h = []; }
                }
                // Flatten if doubly-nested (e.g. API returned [[{text,imageUrl}]])
                if (h.length > 0 && Array.isArray(h[0])) {
                  h = h.flat();
                }
                // Normalize each item to { text: string; imageUrl: string }
                const normalizedHighlights: { text: string; imageUrl: string }[] = h
                  .map((item: any) => {
                    if (!item) return null;
                    if (typeof item === 'string') return { text: item, imageUrl: '' };
                    if (typeof item !== 'object') return null;

                    let textVal = item.text ?? item.title ?? item.label ?? item.name ?? '';
                    let imageVal = item.imageUrl ?? item.image ?? item.url ?? '';

                    while (textVal && typeof textVal === 'object') {
                      if (textVal.imageUrl && !imageVal) imageVal = textVal.imageUrl;
                      textVal = textVal.text ?? textVal.title ?? textVal.label ?? textVal.name ?? '';
                    }

                    const textStr = typeof textVal === 'string' ? textVal : '';
                    const imageStr = typeof imageVal === 'string' ? imageVal : '';
                    if (!textStr && !imageStr) return null;
                    return { text: textStr, imageUrl: imageStr };
                  })
                  .filter(Boolean) as { text: string; imageUrl: string }[];
                return normalizedHighlights.length > 0 ? (
                  <TripHighlightsAccordion highlights={normalizedHighlights} />
                ) : (
                  <p
                    style={{
                      color: "#c0392b",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      fontStyle: "italic",
                    }}
                  >
                    Not Available
                  </p>
                );
              })()}
            </div>

            {/* Itinerary */}
            <div id="itinerary">
              <SectionTitle>Day-by-Day Itinerary</SectionTitle>
              {itineraryDays.length > 0 ? (
                <ItineraryAccordion days={itineraryDays} />
              ) : (
                <p
                  style={{
                    color: "#c0392b",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    fontStyle: "italic",
                  }}
                >
                  Not Available
                </p>
              )}
            </div>



            {/* Accommodation & Transport */}
            <AccommodationSection items={stayItems} />

            {/* Inclusions + Exclusions */}
            <div id="included">
              <SectionTitle>What's Included</SectionTitle>
              <div
                className="trip-inclusions-grid grid-cols-1 sm:grid-cols-2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#1e1a14",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "14px",
                    }}
                  >
                    Included ✓
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {trip.inclusions && trip.inclusions.length > 0 ? (
                      trip.inclusions.map((item: any, idx: number) => {
                        const label = typeof item === "string" ? item : (item?.text || String(item));
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                            }}
                          >
                            <CheckCircle
                              size={14}
                              color="#781216"
                              strokeWidth={1.5}
                              style={{ flexShrink: 0, marginTop: "2px" }}
                            />
                            <span
                              style={{
                                color: "rgba(30,26,20,0.7)",
                                fontSize: "0.8rem",
                                fontWeight: 300,
                                lineHeight: 1.5,
                              }}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p
                        style={{
                          color: "#c0392b",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          fontStyle: "italic",
                        }}
                      >
                        Not Available
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <p
                    style={{
                      color: "rgba(30,26,20,0.5)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "14px",
                    }}
                  >
                    Not Included ✗
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {trip.exclusions && trip.exclusions.length > 0 ? (
                      trip.exclusions.map((item: any, idx: number) => {
                        const label = typeof item === "string" ? item : (item?.text || String(item));
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                            }}
                          >
                            <XCircle
                              size={14}
                              color="rgba(30,26,20,0.3)"
                              strokeWidth={1.5}
                              style={{ flexShrink: 0, marginTop: "2px" }}
                            />
                            <span
                              style={{
                                color: "rgba(30,26,20,0.52)",
                                fontSize: "0.8rem",
                                fontWeight: 300,
                                lineHeight: 1.5,
                              }}
                            >
                              {label}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p
                        style={{
                          color: "#c0392b",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          fontStyle: "italic",
                        }}
                      >
                        Not Available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <FAQSection faqs={trip.faqs || []} />
          </div>

          {/* ── RIGHT COLUMN: Sticky booking card ── */}
          <div className="hidden lg:block" style={{ alignSelf: "stretch" }}>
            <div
              style={{
                position: "sticky",
                top: "130px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Price card */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.08)",
                  borderRadius: "14px",
                  padding: "28px",
                  boxShadow: "0 4px 24px rgba(30,26,20,0.07)",
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      color: "rgba(30,26,20,0.42)",
                      fontSize: "0.62rem",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      margin: "0 0 4px",
                    }}
                  >
                    Starting from
                  </p>
                  <p
                    style={{
                      color: "#1e1a14",
                      fontSize: "2.2rem",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {isNotAvailable(priceStr) ? <NA /> : priceStr}
                  </p>
                  <p
                    style={{
                      color: "rgba(30,26,20,0.38)",
                      fontSize: "0.7rem",
                      margin: "4px 0 0",
                    }}
                  >
                    per person, all inclusive
                  </p>
                </div>



                {/* Key info */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginBottom: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid rgba(30,26,20,0.06)",
                  }}
                >
                  {[
                    { label: "Duration", val: durationStr },
                    {
                      label: "Availability",
                      val: spots > 0 ? `${spots} spots left` : "Fully booked",
                    },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(30,26,20,0.45)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          color: "#1e1a14",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                        }}
                      >
                        {isNotAvailable(val) ? <NA /> : val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Slot Selection */}


                {/* Book button */}
                {hasBooked ? (
                  <div
                    style={{
                      display: "block",
                      width: "100%",
                      background: "rgba(30,26,20,0.1)",
                      color: "rgba(30,26,20,0.5)",
                      border: "1px solid rgba(30,26,20,0.1)",
                      borderRadius: "8px",
                      padding: "14px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "not-allowed",
                      marginBottom: "10px",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    Already Booked
                  </div>
                ) : reservedBookingId ? (
                  <Link
                    to={`/bookings/${reservedBookingId}/pay-balance`}
                    style={{
                      display: "block",
                      width: "100%",
                      background: "#b8943a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "14px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      marginBottom: "10px",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    Complete Payment
                  </Link>
                ) : (
                  <Link
                    to={bookingPath}
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
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background =
                        "#9a1a1f")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background =
                        "#781216")
                    }
                  >
                    Book This {isFestival ? "Festival" : "Trip"}
                  </Link>
                )}

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
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "#1db954")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "#25D366")
                  }
                >
                  <MessageCircle size={15} />
                  Solve your queries on WhatsApp
                </a>

                {/* Partial payment note */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "rgba(184,148,58,0.06)",
                    borderRadius: "6px",
                    border: "1px solid rgba(184,148,58,0.18)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b8943a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p
                    style={{
                      color: "rgba(30,26,20,0.62)",
                      fontSize: "0.7rem",
                      fontWeight: 300,
                      lineHeight: 1.6,
                      margin: 0,
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    <span style={{ color: "#b8943a", fontWeight: 600 }}>
                      Partial payment available
                    </span>{" "}
                    — pay a booking amount now and settle the rest before
                    departure. Details at the booking page.
                  </p>
                </div>
              </div>

              {/* Trust badges */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.07)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                {[
                  {
                    icon: Shield,
                    text: "Secure booking & instant confirmation",
                  },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(30,26,20,0.05)",
                    }}
                  >
                    <Icon size={14} color="#C8A96E" strokeWidth={1.5} />
                    <span
                      style={{
                        color: "rgba(30,26,20,0.6)",
                        fontSize: "0.75rem",
                        fontWeight: 300,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile booking summary and primary action */}
      <div
        className="mobile-booking-bar lg:hidden"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 170,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px max(10px, env(safe-area-inset-bottom))",
          background: "rgba(255,255,255,0.97)",
          borderTop: "1px solid rgba(30,26,20,0.1)",
          boxShadow: "0 -8px 24px rgba(30,26,20,0.12)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, color: "rgba(30,26,20,0.46)", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Starting from
          </p>
          <p style={{ margin: "2px 0 0", color: "#1e1a14", fontSize: "1rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            {priceStr}
          </p>
          <p style={{ margin: "1px 0 0", color: spots > 0 ? "#4f7a46" : "#c0392b", fontSize: "0.62rem", fontWeight: 500 }}>
            {spots > 0 ? `${spots} spots available` : "Currently sold out"}
          </p>
        </div>

        {hasBooked ? (
          <div className="mobile-booking-action mobile-booking-action-disabled">Already Booked</div>
        ) : reservedBookingId ? (
          <Link className="mobile-booking-action mobile-booking-action-balance" to={`/bookings/${reservedBookingId}/pay-balance`}>
            Pay Balance
          </Link>
        ) : spots > 0 && selectedSlotId ? (
          <Link className="mobile-booking-action" to={bookingPath}>
            Book Now
          </Link>
        ) : (
          <div className="mobile-booking-action mobile-booking-action-disabled">Sold Out</div>
        )}
      </div>

      {/* ── Related Trips ── */}
      {!isFestival && <RelatedTrips currentId={trip.id} currentType={trip.tripType} />}

      {/* ── WhatsApp FAB — always visible ── */}
      <a
        className="trip-whatsapp-fab"
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            "0 6px 28px rgba(37,211,102,0.6)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            "0 4px 20px rgba(37,211,102,0.45)";
        }}
      >
        <MessageCircle size={24} color="#fff" fill="#fff" />
      </a>

      <SiteFooter />
      <style>{`
        .mobile-booking-action {
          min-width: 128px;
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border-radius: 8px;
          background: #781216;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .mobile-booking-action-balance {
          background: #b8943a;
        }
        .mobile-booking-action-disabled {
          background: rgba(30,26,20,0.1);
          color: rgba(30,26,20,0.45);
        }
        @media (min-width: 1024px) {
          .mobile-booking-bar {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .trip-detail-page {
            padding-bottom: calc(78px + env(safe-area-inset-bottom));
          }
          .trip-detail-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .trip-whatsapp-fab {
            display: none !important;
          }
        }
        @media (max-width: 639px) {
          .trip-detail-hero {
            height: 62vh !important;
            min-height: 420px !important;
          }
        }
        @media (max-width: 767px) {
          .trip-section-nav {
            top: 56px !important;
            max-width: 100vw;
          }
          .trip-section-nav-scroll {
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            padding: 0 8px !important;
            overscroll-behavior-x: contain;
          }
          .trip-section-nav-item {
            min-height: 42px;
            padding: 10px 12px !important;
          }
          .trip-detail-main {
            padding: 24px 16px 36px !important;
          }
          .trip-quick-stats {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px !important;
            width: 100%;
          }
          .trip-stat-card {
            min-width: 0;
            padding: 12px !important;
            flex-shrink: 1 !important;
          }
          .trip-stat-card-wide {
            grid-column: 1 / -1;
          }
          .trip-stat-content {
            min-width: 0;
          }
          .trip-stat-value,
          .trip-itinerary-title {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .trip-inclusions-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 24px !important;
          }
          .trip-itinerary-card {
            padding: 12px !important;
          }
          .trip-itinerary-header {
            gap: 8px !important;
          }
          .trip-itinerary-heading {
            gap: 10px !important;
          }
          .trip-itinerary-content {
            padding-left: 40px !important;
          }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2
        style={{
          color: "#1e1a14",
          fontSize: "1.25rem",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}
      >
        {children}
      </h2>
      <div
        style={{
          width: "32px",
          height: "2px",
          background: "#781216",
          borderRadius: "1px",
        }}
      />
    </div>
  );
}
