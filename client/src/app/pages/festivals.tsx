// @ts-ignore
import logoSrc from "../../imports/final-logo_png_transparent.png";

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  fetchAllFestivals,
  formatPrice,
  priceToNumber,
  ApiFestival,
} from "../../lib/festivalApi";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  ArrowRight,
  Calendar,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { SiteFooter } from "../components/site-footer";

// ── Price ranges ───────────────────────────────────────────────────
const PRICE_RANGES = [
  { label: "Under ₹10,000", min: 0, max: 10000 },
  { label: "₹10k – ₹20k", min: 10000, max: 20000 },
  { label: "₹20k – ₹50k", min: 20000, max: 50000 },
  { label: "Above ₹50k", min: 50000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: "Most Popular", value: "popular" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
];

type FestFilters = {
  locations: string[];
  types: string[];
  priceRange: string | null;
};

const EMPTY_FILTERS: FestFilters = {
  locations: [],
  types: [],
  priceRange: null,
};

// ── Helpers ────────────────────────────────────────────────────────
function getFestivalStatus(festival: ApiFestival): string {
  const slot = festival.slots?.[0];
  if (!slot) return "TBA";
  if ((slot.filledSpots ?? 0) >= (slot.capacity ?? 0)) return "Sold Out";
  if (new Date(slot.startDate) < new Date()) return "Closed";
  return "Bookings Open";
}

function getFestivalDates(festival: ApiFestival): string {
  const slot = festival.slots?.[0];
  if (!slot) return "Dates TBA";
  const s = new Date(slot.startDate);
  const e = new Date(slot.endDate);
  return `${s.getDate()} ${s.toLocaleString("default", { month: "short" })} – ${e.getDate()} ${e.toLocaleString("default", { month: "short" })} ${s.getFullYear()}`;
}

// ── Transparent Hangover badge ─────────────────────────────────────
function HangoverBadge({ large = false }: { large?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: large ? "5px" : "3px",
        pointerEvents: "none",
        filter:
          "drop-shadow(0 1px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 12px rgba(0,0,0,0.7))",
      }}
    >
      <img
        src={logoSrc as string}
        alt="Hangover Trails"
        style={{
          height: large ? "46px" : "20px",
          width: "auto",
          filter: "brightness(10) sepia(0.08)",
          display: "block",
        }}
      />
      <span
        style={{
          color: "#C8A96E",
          fontSize: large ? "0.72rem" : "0.5rem",
          fontWeight: 700,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          fontFamily: "'Poppins', sans-serif",
          lineHeight: 1,
        }}
      >
        Featured
      </span>
    </div>
  );
}

// ── Filter accordion ───────────────────────────────────────────────
function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(30,26,20,0.07)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <span
          style={{
            color: "#1e1a14",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} color="rgba(30,26,20,0.4)" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingBottom: "16px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckPill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "6px",
        background: active ? "rgba(120,18,22,0.08)" : "transparent",
        border: `1.5px solid ${active ? "#781216" : "rgba(30,26,20,0.12)"}`,
        color: active ? "#781216" : "rgba(30,26,20,0.6)",
        fontFamily: "'Poppins', sans-serif",
        fontSize: "0.75rem",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap" as const,
      }}
    >
      {active && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#781216",
            display: "inline-block",
          }}
        />
      )}
      {label}
    </button>
  );
}

// ── Filter sidebar ─────────────────────────────────────────────────
function FilterSidebar({
  filters,
  setFilters,
  availableLocations,
  availableTypes,
  availablePriceRanges,
}: {
  filters: FestFilters;
  setFilters: React.Dispatch<React.SetStateAction<FestFilters>>;
  availableLocations: string[];
  availableTypes: string[];
  availablePriceRanges: { label: string; min: number; max: number }[];
}) {
  const toggle = (key: keyof Omit<FestFilters, "priceRange">, val: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(val)
        ? f[key].filter((v) => v !== val)
        : [...f[key], val],
    }));
  };

  const activeCount = Object.values(filters).flat().filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#1e1a14",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          <SlidersHorizontal size={14} color="#781216" />
          Filters{" "}
          {activeCount > 0 && (
            <span
              style={{
                background: "#781216",
                color: "#fff",
                borderRadius: "999px",
                width: "18px",
                height: "18px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                fontWeight: 700,
              }}
            >
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            style={{
              background: "none",
              border: "none",
              color: "#781216",
              fontSize: "0.7rem",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              textDecoration: "underline",
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {availableLocations.length > 0 && (
        <FilterGroup title="Location">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {availableLocations.map((l) => (
              <CheckPill
                key={l}
                label={l}
                active={filters.locations.includes(l)}
                onToggle={() => toggle("locations", l)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {availableTypes.length > 0 && (
        <FilterGroup title="Type">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {availableTypes.map((t) => (
              <CheckPill
                key={t}
                label={t}
                active={filters.types.includes(t)}
                onToggle={() => toggle("types", t)}
              />
            ))}
          </div>
        </FilterGroup>
      )}


      {availablePriceRanges.length > 0 && (
        <FilterGroup title="Price Range">
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {availablePriceRanges.map((r) => (
              <CheckPill
                key={r.label}
                label={r.label}
                active={filters.priceRange === r.label}
                onToggle={() =>
                  setFilters((f) => ({
                    ...f,
                    priceRange: f.priceRange === r.label ? null : r.label,
                  }))
                }
              />
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

// ── Festival card ──────────────────────────────────────────────────
function FestivalCard({
  festival,
  index,
}: {
  festival: ApiFestival;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  const name = festival.title;
  const location = festival.location;
  const price = formatPrice(festival.price);
  const image = festival.bannerImages?.[0] || "";
  const tagline = festival.overview
    ? festival.overview.substring(0, 90) + "…"
    : "";
  const type = festival.tags?.[0]?.tag || "Festival";
  const status = getFestivalStatus(festival);
  const dates = getFestivalDates(festival);
  const isOpen = status === "Bookings Open";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: Math.min(index * 0.04, 0.3),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(30,26,20,0.07)",
        boxShadow: hovered
          ? "0 8px 32px rgba(30,26,20,0.1)"
          : "0 2px 8px rgba(30,26,20,0.05)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16/10",
          overflow: "hidden",
        }}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.55s ease",
              transform: hovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        ) : (
          <div
            style={{ width: "100%", height: "100%", background: "#ede8dc" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(11,11,11,0.55) 0%, transparent 50%)",
          }}
        />

        <div
          style={{ position: "absolute", top: "12px", left: "13px", zIndex: 2 }}
        >
          <HangoverBadge />
        </div>

        {status !== "Bookings Open" && (
          <span
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 2,
              background: isOpen
                ? "rgba(37,211,102,0.14)"
                : "rgba(200,169,110,0.11)",
              border: `1px solid ${isOpen ? "rgba(37,211,102,0.38)" : "rgba(200,169,110,0.28)"}`,
              borderRadius: "999px",
              padding: "3px 10px",
              backdropFilter: "blur(6px)",
              color: isOpen ? "#25D366" : "#C8A96E",
              fontSize: "0.55rem",
              fontWeight: 600,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {status}
          </span>
        )}

        <span
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            zIndex: 2,
            background: "#781216",
            color: "#fff",
            borderRadius: "4px",
            padding: "3px 9px",
            fontSize: "0.55rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {type}
        </span>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "6px",
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
            {location}
          </span>
        </div>

        <h3
          style={{
            color: "#1e1a14",
            fontSize: "1rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            margin: "0 0 5px",
          }}
        >
          {name}
        </h3>

        <p
          style={{
            color: "rgba(30,26,20,0.52)",
            fontSize: "0.78rem",
            fontWeight: 300,
            lineHeight: 1.6,
            margin: "0 0 12px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {tagline}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: "16px",
          }}
        >
          <Calendar size={10} color="rgba(30,26,20,0.35)" />
          <span
            style={{
              color: "rgba(30,26,20,0.5)",
              fontSize: "0.68rem",
              fontWeight: 300,
            }}
          >
            {dates}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "14px",
            borderTop: "1px solid rgba(30,26,20,0.07)",
          }}
        >
          <div>
            <p
              style={{
                color: "rgba(30,26,20,0.35)",
                fontSize: "0.55rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: "0 0 2px",
              }}
            >
              From
            </p>
            <p
              style={{
                color: "#1e1a14",
                fontSize: "0.9rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {price}
            </p>
          </div>
          <Link
            to={`/festivals/${festival.slug}`}
            style={{
              background: hovered ? "#C8A96E" : "transparent",
              border: `1.5px solid ${hovered ? "#C8A96E" : "rgba(30,26,20,0.14)"}`,
              color: hovered ? "#1e1a14" : "rgba(30,26,20,0.58)",
              borderRadius: "4px",
              padding: "7px 15px",
              fontSize: "0.63rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              transition: "all 0.25s ease",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              textDecoration: "none",
            }}
          >
            View Trip <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(30,26,20,0.07)",
      }}
    >
      <div
        style={{
          aspectRatio: "16/10",
          background: "rgba(30,26,20,0.06)",
          animation: "skPulse 1.5s ease-in-out infinite",
        }}
      />
      <div style={{ padding: "18px 20px 20px" }}>
        <div
          style={{
            width: "80px",
            height: "8px",
            borderRadius: "4px",
            background: "rgba(30,26,20,0.06)",
            marginBottom: "10px",
            animation: "skPulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "70%",
            height: "16px",
            borderRadius: "4px",
            background: "rgba(30,26,20,0.07)",
            marginBottom: "8px",
            animation: "skPulse 1.5s ease-in-out infinite 0.1s",
          }}
        />
        <div
          style={{
            width: "90%",
            height: "10px",
            borderRadius: "4px",
            background: "rgba(30,26,20,0.05)",
            marginBottom: "6px",
            animation: "skPulse 1.5s ease-in-out infinite 0.15s",
          }}
        />
        <div
          style={{
            width: "60%",
            height: "10px",
            borderRadius: "4px",
            background: "rgba(30,26,20,0.04)",
            animation: "skPulse 1.5s ease-in-out infinite 0.2s",
          }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function FestivalsPage() {
  const [allFestivals, setAllFestivals] = useState<ApiFestival[]>([]);
  const [featuredFestival, setFeaturedFestival] = useState<ApiFestival | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [filters, setFilters] = useState<FestFilters>(EMPTY_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAllFestivals()
      .then((all) => {
        const active = all.filter((f) => f.isActive && f.isPublished);
        const hero = active.find((f) => f.isFeatured) ?? null;
        setFeaturedFestival(hero);
        setAllFestivals(active);
      })
      .catch((err) => setError(err?.message || "Something went wrong"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Hero derived values
  const heroSlot = featuredFestival?.slots?.[0];
  const spotsLeft = heroSlot
    ? Math.max(0, heroSlot.capacity - heroSlot.filledSpots)
    : 0;

  const featured = featuredFestival
    ? {
        name: featuredFestival.title,
        location: featuredFestival.location,
        tagline: featuredFestival.overview
          ? featuredFestival.overview.substring(0, 100) + "…"
          : "",
        price: formatPrice(featuredFestival.price),
        spotsLeft,
        dates: heroSlot
          ? (() => {
              const s = new Date(heroSlot.startDate);
              const e = new Date(heroSlot.endDate);
              return `${s.getDate()} ${s.toLocaleString("default", { month: "short" })} – ${e.getDate()} ${e.toLocaleString("default", { month: "short" })} ${s.getFullYear()}`;
            })()
          : "Dates TBA",
        image: featuredFestival.bannerImages?.[0] || "",
        videoUrl: featuredFestival.videoUrl || null,
        tripSlug: featuredFestival.slug,
      }
    : null;

  // Available filter options
  const availableLocations = useMemo(() => {
    const s = new Set<string>();
    allFestivals.forEach((f) => {
      if (f.location) s.add(f.location);
    });
    return Array.from(s).sort();
  }, [allFestivals]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    allFestivals.forEach((f) => {
      const t = f.tags?.[0]?.tag;
      if (t) s.add(t);
    });
    return Array.from(s).sort();
  }, [allFestivals]);

  const availablePriceRanges = useMemo(
    () =>
      PRICE_RANGES.filter((r) =>
        allFestivals.some((f) => {
          const p = priceToNumber(f.price);
          return p >= r.min && p <= r.max;
        }),
      ),
    [allFestivals],
  );

  const activeCount = Object.values(filters).flat().filter(Boolean).length;

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = allFestivals.filter((f) => {
      const q = search.toLowerCase();
      if (
        q &&
        !f.title.toLowerCase().includes(q) &&
        !f.location?.toLowerCase().includes(q)
      )
        return false;
      if (
        filters.locations.length > 0 &&
        !filters.locations.includes(f.location)
      )
        return false;
      if (filters.types.length > 0) {
        const ftype = f.tags?.[0]?.tag || "";
        if (!filters.types.includes(ftype)) return false;
      }
      if (filters.priceRange) {
        const range = PRICE_RANGES.find((r) => r.label === filters.priceRange);
        const price = priceToNumber(f.price);
        if (range && (price < range.min || price > range.max)) return false;
      }
      return true;
    });

    if (sort === "price_asc")
      list = [...list].sort(
        (a, b) => priceToNumber(a.price) - priceToNumber(b.price),
      );
    if (sort === "price_desc")
      list = [...list].sort(
        (a, b) => priceToNumber(b.price) - priceToNumber(a.price),
      );
    return list;
  }, [allFestivals, search, filters, sort]);

  return (
    <div
      style={{
        background: "#f5f0e6",
        minHeight: "100vh",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <style>{`@keyframes skPulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }`}</style>

      {/* ════════════════ FEATURED HERO ════════════════ */}
      <section className="relative w-full h-screen overflow-hidden bg-[#0b0b0b]">
        {featured?.videoUrl ? (
          <motion.video
            key={featured.videoUrl}
            src={featured.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : featured?.image ? (
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
            style={{
              background:
                "linear-gradient(135deg, #0b0b0b 0%, #1a1510 30%, #201a12 50%, #1a1510 70%, #0b0b0b 100%)",
            }}
            animate={{ opacity: loading ? [0.6, 1, 0.6] : 1 }}
            transition={{
              duration: 2.2,
              repeat: loading ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        )}

        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to right, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.60) 50%, rgba(11,11,11,0.20) 100%), linear-gradient(to top, rgba(11,11,11,0.70) 0%, transparent 45%)",
          }}
        />

        <div className="absolute inset-0 z-30 flex items-center">
          <div className="px-6 md:px-10 lg:px-12 max-w-2xl w-full">
            {loading ? (
              <>
                <motion.div
                  className="h-3 w-24 rounded-full mb-6"
                  style={{ background: "rgba(200,169,110,0.15)" }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="rounded mb-4"
                  style={{
                    background: "rgba(242,237,228,0.08)",
                    height: "clamp(3.5rem,8vw,7rem)",
                    width: "80%",
                  }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.15,
                  }}
                />
                <div
                  className="w-12 h-px mb-6"
                  style={{ background: "rgba(200,169,110,0.2)" }}
                />
                <div className="space-y-2 mb-8">
                  {[0.9, 0.75, 0.6].map((w, i) => (
                    <motion.div
                      key={i}
                      className="h-3 rounded-full"
                      style={{
                        background: "rgba(242,237,228,0.06)",
                        width: `${w * 100}%`,
                      }}
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.1 * i,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-8 mb-8">
                  <motion.div
                    className="h-10 w-20 rounded"
                    style={{ background: "rgba(242,237,228,0.06)" }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3,
                    }}
                  />
                  <div
                    className="w-px h-8"
                    style={{ background: "rgba(242,237,228,0.1)" }}
                  />
                  <motion.div
                    className="h-10 w-24 rounded"
                    style={{ background: "rgba(242,237,228,0.06)" }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.4,
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <motion.div
                    className="h-11 w-36 rounded"
                    style={{ background: "rgba(200,169,110,0.12)" }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                  />
                  <motion.div
                    className="h-11 w-32 rounded"
                    style={{ background: "rgba(242,237,228,0.06)" }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.6,
                    }}
                  />
                </div>
              </>
            ) : featured ? (
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={12} color="#c8a96e" />
                  <span
                    style={{
                      color: "#c8a96e",
                      fontSize: "0.72rem",
                      fontWeight: 400,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    {featured.location}
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 300,
                    fontSize: "clamp(3.5rem,8vw,7rem)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: "#f2ede4",
                    margin: "0 0 16px",
                  }}
                >
                  {featured.name}
                </h1>
                <div
                  style={{
                    width: "48px",
                    height: "1px",
                    background: "#c8a96e",
                    marginBottom: "24px",
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.88rem",
                    lineHeight: 1.75,
                    color: "rgba(242,237,228,0.80)",
                    maxWidth: "440px",
                    margin: "0 0 32px",
                  }}
                >
                  {featured.tagline}
                </p>
                <div className="flex items-center gap-8 mb-8">
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(242,237,228,0.65)",
                        marginBottom: "4px",
                      }}
                    >
                      Dates
                    </div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.88rem",
                        color: "#f2ede4",
                      }}
                    >
                      {featured.dates}
                    </div>
                  </div>
                  <div
                    style={{
                      width: "1px",
                      height: "32px",
                      background: "rgba(242,237,228,0.3)",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(242,237,228,0.65)",
                        marginBottom: "4px",
                      }}
                    >
                      Starting
                    </div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.88rem",
                        color: "#c8a96e",
                      }}
                    >
                      {featured.price}
                    </div>
                  </div>
                  <div
                    style={{
                      width: "1px",
                      height: "32px",
                      background: "rgba(242,237,228,0.3)",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(242,237,228,0.65)",
                        marginBottom: "4px",
                      }}
                    >
                      Spots Left
                    </div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.88rem",
                        color: "#f2ede4",
                      }}
                    >
                      {featured.spotsLeft}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    to={`/book/${featured.tripSlug}?type=festival`}
                    style={{
                      background: "#C8A96E",
                      color: "#0b0b0b",
                      padding: "12px 28px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "background 0.25s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background =
                        "#dfc08a")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.background =
                        "#C8A96E")
                    }
                  >
                    Book Your Spot <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/festivals/${featured.tripSlug}`}
                    style={{
                      background: "rgba(242,237,228,0.07)",
                      color: "rgba(242,237,228,0.75)",
                      border: "1px solid rgba(242,237,228,0.16)",
                      padding: "12px 22px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 400,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      backdropFilter: "blur(6px)",
                      transition: "border-color 0.2s, color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "rgba(200,169,110,0.4)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "#C8A96E";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "rgba(242,237,228,0.16)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "rgba(242,237,228,0.75)";
                    }}
                  >
                    Explore the Trip
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <p
                  style={{
                    color: "rgba(242,237,228,0.45)",
                    fontSize: "1rem",
                    fontWeight: 300,
                    fontStyle: "italic",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  No featured festival at this time. Check back soon.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 right-10 z-30 flex flex-col items-center gap-2">
          <div
            className="w-px h-10 relative overflow-hidden"
            style={{ background: "rgba(242,237,228,0.15)" }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full bg-[#c8a96e]"
              animate={{ height: ["0%", "100%"], top: ["0%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              style={{ height: "30%" }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 400,
              fontSize: "0.58rem",
              color: "rgba(242,237,228,0.65)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
            }}
          >
            Scroll
          </span>
        </div>
      </section>

      {/* ════════════════ DARK HEADER BANNER ════════════════ */}
      <div
        style={{
          background: "#1e1a14",
          paddingTop: "clamp(3rem,6vw,5rem)",
          paddingBottom: "clamp(2.5rem,5vw,4rem)",
          paddingLeft: "clamp(1.5rem,5vw,6rem)",
          paddingRight: "clamp(1.5rem,5vw,6rem)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: "clamp(5rem,15vw,14rem)",
              fontWeight: 700,
              color: "rgba(242,237,228,0.03)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              paddingRight: "2rem",
              userSelect: "none",
            }}
          >
            FESTIVALS
          </span>
        </div>
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              color: "#C8A96E",
              fontSize: "0.7rem",
              fontWeight: 500,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            / All Festivals
          </p>
          <h2
            style={{
              color: "#f2ede4",
              fontSize: "clamp(2.2rem,5vw,4rem)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "0 0 16px",
            }}
          >
            Every festival we take you to is{" "}
            <em style={{ color: "#C8A96E", fontStyle: "italic" }}>
              personally curated.
            </em>
          </h2>
          <p
            style={{
              color: "rgba(242,237,228,0.5)",
              fontSize: "0.88rem",
              fontWeight: 300,
              lineHeight: 1.8,
              maxWidth: "480px",
              margin: 0,
            }}
          >
            {loading
              ? "Loading festivals…"
              : `${allFestivals.length} festival trip${allFestivals.length !== 1 ? "s" : ""} — each one built around real cultural experiences.`}
          </p>
        </div>
      </div>

      {/* ════════════════ STICKY SEARCH BAR ════════════════ */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid rgba(30,26,20,0.07)",
          position: "sticky",
          top: "72px",
          zIndex: 50,
          boxShadow: "0 2px 12px rgba(30,26,20,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "12px clamp(1.5rem,5vw,6rem)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 200px",
              maxWidth: "300px",
            }}
          >
            <Search
              size={13}
              color="rgba(30,26,20,0.35)"
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search festivals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 32px 9px 34px",
                background: "#f5f0e6",
                border: "1px solid rgba(30,26,20,0.1)",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 300,
                color: "#1e1a14",
                outline: "none",
                boxSizing: "border-box" as const,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={12} color="rgba(30,26,20,0.4)" />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: "9px 12px",
              background: "#f5f0e6",
              border: "1px solid rgba(30,26,20,0.1)",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontFamily: "'Poppins', sans-serif",
              color: "rgba(30,26,20,0.7)",
              cursor: "pointer",
              outline: "none",
              flexShrink: 0,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              background:
                activeCount > 0 ? "rgba(120,18,22,0.06)" : "transparent",
              border: `1.5px solid ${activeCount > 0 ? "#781216" : "rgba(30,26,20,0.12)"}`,
              borderRadius: "6px",
              color: activeCount > 0 ? "#781216" : "rgba(30,26,20,0.6)",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.78rem",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={13} />
            Filters {activeCount > 0 && `(${activeCount})`}
          </button>

          <span
            style={{
              color: "rgba(30,26,20,0.38)",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              marginLeft: "auto",
            }}
          >
            {loading
              ? "…"
              : `${filtered.length} festival${filtered.length !== 1 ? "s" : ""} found`}
          </span>
        </div>

        {activeCount > 0 && (
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "0 clamp(1.5rem,5vw,6rem) 10px",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {(
              Object.entries(filters) as [
                keyof FestFilters,
                string | string[],
              ][]
            ).map(([key, val]) => {
              if (!val || (Array.isArray(val) && val.length === 0)) return null;
              const vals = Array.isArray(val) ? val : [val];
              return vals.map((v) => (
                <span
                  key={`${key}-${v}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(120,18,22,0.07)",
                    border: "1px solid rgba(120,18,22,0.15)",
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "0.65rem",
                    color: "#781216",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {v}
                  <button
                    onClick={() => {
                      if (key === "priceRange")
                        setFilters((f) => ({ ...f, priceRange: null }));
                      else
                        setFilters((f) => ({
                          ...f,
                          [key]: (f[key] as string[]).filter((x) => x !== v),
                        }));
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    <X size={10} color="#781216" />
                  </button>
                </span>
              ));
            })}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(30,26,20,0.45)",
                fontSize: "0.65rem",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                textDecoration: "underline",
                padding: "3px 6px",
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ════════════════ BODY: SIDEBAR + GRID ════════════════ */}
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,6rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "clamp(1.5rem,3vw,3rem)",
            alignItems: "flex-start",
          }}
        >
          {/* Desktop sidebar */}
          <div
            className="hidden lg:block"
            style={{
              width: "240px",
              flexShrink: 0,
              position: "sticky",
              top: "155px",
              background: "#ffffff",
              border: "1px solid rgba(30,26,20,0.07)",
              borderRadius: "12px",
              padding: "20px 20px 8px",
            }}
          >
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              availableLocations={availableLocations}
              availableTypes={availableTypes}
              availablePriceRanges={availablePriceRanges}
            />
          </div>

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {mobileFiltersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileFiltersOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.4)",
                    zIndex: 90,
                  }}
                  className="lg:hidden"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: "280px",
                    background: "#ffffff",
                    zIndex: 91,
                    overflowY: "auto",
                    padding: "24px 20px",
                  }}
                  className="lg:hidden"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 600,
                        color: "#1e1a14",
                        fontSize: "0.9rem",
                      }}
                    >
                      Filters
                    </span>
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X size={18} color="#1e1a14" />
                    </button>
                  </div>
                  <FilterSidebar
                    filters={filters}
                    setFilters={setFilters}
                    availableLocations={availableLocations}
                    availableTypes={availableTypes}
                    availablePriceRanges={availablePriceRanges}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Festival grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div
                style={{ display: "grid", gap: "20px" }}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "5rem 0",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
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
                  Failed to load festivals
                </p>
                <p
                  style={{
                    color: "rgba(30,26,20,0.5)",
                    fontSize: "0.82rem",
                    fontWeight: 300,
                    marginBottom: "20px",
                  }}
                >
                  {error}
                </p>
                <button
                  onClick={load}
                  style={{
                    background: "#781216",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 24px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 0" }}>
                <p
                  style={{
                    color: "rgba(30,26,20,0.35)",
                    fontSize: "1rem",
                    fontWeight: 300,
                    marginBottom: "16px",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  No festivals match your filters.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilters(EMPTY_FILTERS);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid rgba(30,26,20,0.15)",
                    borderRadius: "999px",
                    padding: "8px 20px",
                    color: "rgba(30,26,20,0.55)",
                    fontSize: "0.72rem",
                    fontFamily: "'Poppins', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div
                  style={{ display: "grid", gap: "20px" }}
                  className="grid-cols-1 sm:grid-cols-2"
                >
                  {filtered.map((fest, i) => (
                    <FestivalCard key={fest.id} festival={fest} index={i} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
        </div>

      <SiteFooter />
    </div>
  );
}
