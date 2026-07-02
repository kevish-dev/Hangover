import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { MapPin, Clock, Search, X, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, AlertCircle } from "lucide-react";
import { SiteFooter } from "../components/site-footer";
import {
  fetchAllTrips,
  formatTripType,
  formatPrice,
  priceToNumber,
  formatDuration,
  spotsLeft,
  safeValue,
  isNotAvailable,
  type ApiTrip,
} from "../../lib/tripApi";

// ── "Not Available" inline label ──────────────────────────────────
function NA({ text = "Not Available" }: { text?: string }) {
  return <span style={{ color: "#c0392b", fontSize: "inherit", fontWeight: 500, fontStyle: "italic" }}>{text}</span>;
}

// ── Filter option definitions ─────────────────────────────────────
const DURATIONS    = ["Weekend", "5 Days", "6 Days", "7 Days", "8 Days"];
const MONTHS       = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DIFFICULTIES = ["Easy", "Moderate", "Challenging"];
const PRICE_RANGES = [
  { label: "Under ₹10,000",  min: 0,     max: 10000 },
  { label: "₹10k – ₹20k",   min: 10000, max: 20000 },
  { label: "₹20k – ₹50k",   min: 20000, max: 50000 },
  { label: "Above ₹50k",     min: 50000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: "Most Popular",     value: "popular" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Duration: Shortest", value: "duration_asc" },
];

type Filters = {
  destinations: string[];
  categories: string[];
  durations: string[];
  months: string[];
  difficulties: string[];
  priceRange: string | null;
};

const EMPTY_FILTERS: Filters = {
  destinations: [], categories: [], durations: [],
  months: [], difficulties: [], priceRange: null,
};

// ── Helper: extract month abbreviations from bestTimeToVisit ──────
function parseMonths(bestTime: string | null | undefined): string[] {
  if (!bestTime) return [];
  const result: string[] = [];
  for (const m of MONTHS) {
    if (bestTime.toLowerCase().includes(m.toLowerCase())) {
      result.push(m);
    }
  }
  // If "year round" or "all year", return all months
  if (/year\s*round|all\s*year/i.test(bestTime)) return [...MONTHS];
  return result;
}

// ── Filter group accordion ─────────────────────────────────────────
function FilterGroup({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(30,26,20,0.07)", paddingBottom: open ? "0" : "0" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 0", background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <span style={{ color: "#1e1a14", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em" }}>
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
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

function CheckPill({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "6px 12px", borderRadius: "6px",
        background: active ? "rgba(120,18,22,0.08)" : "transparent",
        border: `1.5px solid ${active ? "#781216" : "rgba(30,26,20,0.12)"}`,
        color: active ? "#781216" : "rgba(30,26,20,0.6)",
        fontFamily: "'Poppins', sans-serif", fontSize: "0.75rem",
        fontWeight: active ? 600 : 400, cursor: "pointer",
        transition: "all 0.2s ease", whiteSpace: "nowrap",
      }}
    >
      {active && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#781216", display: "inline-block" }} />}
      {label}
    </button>
  );
}

// ── Calendar date picker ──────────────────────────────────────────
const MONTH_NAMES  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function MonthCalendar({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (m: string) => void;
}) {
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const [viewYear,  setViewYear]  = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM);
  // "month" = pick-a-month overview, "day" = day grid
  const [mode, setMode] = useState<"day" | "month">("day");

  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const monthKey     = MONTH_NAMES[viewMonth];
  const isPastMonth  = viewYear < todayY || (viewYear === todayY && viewMonth < todayM);
  const isSelected   = selected.includes(monthKey);

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", userSelect: "none" }}>

      {/* ── Header: always visible ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button
          onClick={() => {
            if (mode === "day") { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
            else setViewYear(y => y - 1);
          }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,26,20,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronLeft size={13} color="rgba(30,26,20,0.5)" />
        </button>

        {/* Clicking header toggles between day-view and month-picker */}
        <button
          onClick={() => setMode(m => m === "day" ? "month" : "day")}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "2px 8px", borderRadius: "4px" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,26,20,0.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <p style={{ color: "#1e1a14", fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>
            {mode === "day" ? MONTH_FULL[viewMonth] : viewYear}
            <span style={{ color: "#781216", fontSize: "0.55rem", marginLeft: "5px", letterSpacing: "0.06em" }}>
              {mode === "day" ? "▾ pick month" : "▾ pick year"}
            </span>
          </p>
          {mode === "day" && <p style={{ color: "rgba(30,26,20,0.4)", fontSize: "0.62rem", margin: 0 }}>{viewYear}</p>}
        </button>

        <button
          onClick={() => {
            if (mode === "day") { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }
            else setViewYear(y => y + 1);
          }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,26,20,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronRight size={13} color="rgba(30,26,20,0.5)" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "month" ? (
          /* ── Month overview grid: tap any month to jump to it ── */
          <motion.div key="month-grid"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px" }}>
              {MONTH_NAMES.map((m, i) => {
                const pastM = viewYear < todayY || (viewYear === todayY && i < todayM);
                const isSel = selected.includes(m);
                const isCur = viewYear === todayY && i === todayM;
                return (
                  <button key={m}
                    onClick={() => { if (!pastM) { setViewMonth(i); setMode("day"); } }}
                    style={{
                      padding: "9px 4px", borderRadius: "8px", textAlign: "center",
                      cursor: pastM ? "not-allowed" : "pointer",
                      fontFamily: "'Poppins', sans-serif", fontSize: "0.72rem",
                      fontWeight: isSel ? 700 : i === viewMonth ? 600 : 400,
                      background: isSel ? "#781216" : i === viewMonth ? "rgba(120,18,22,0.06)" : "transparent",
                      border: `1.5px solid ${isSel ? "#781216" : isCur ? "rgba(120,18,22,0.3)" : "rgba(30,26,20,0.08)"}`,
                      color: isSel ? "#fff" : pastM ? "rgba(30,26,20,0.2)" : i === viewMonth ? "#781216" : "#1e1a14",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.62rem", textAlign: "center", marginTop: "8px", marginBottom: 0 }}>
              Tap a month to view its calendar
            </p>
          </motion.div>
        ) : (
          /* ── Day grid ── */
          <motion.div key="day-grid"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {/* Select whole month */}
            <button
              onClick={() => !isPastMonth && onToggle(monthKey)}
              style={{
                width: "100%", marginBottom: "10px", padding: "7px",
                background: isSelected ? "#781216" : "rgba(120,18,22,0.04)",
                border: `1.5px solid ${isSelected ? "#781216" : "rgba(120,18,22,0.15)"}`,
                borderRadius: "6px", cursor: isPastMonth ? "not-allowed" : "pointer",
                color: isSelected ? "#fff" : isPastMonth ? "rgba(30,26,20,0.25)" : "#781216",
                fontFamily: "'Poppins', sans-serif", fontSize: "0.68rem", fontWeight: 600,
                letterSpacing: "0.06em", transition: "all 0.2s ease",
              }}
            >
              {isSelected ? `✓ ${MONTH_FULL[viewMonth]} selected` : `Select ${MONTH_FULL[viewMonth]}`}
            </button>

            {/* Day-of-week headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "3px" }}>
              {DAY_LABELS.map((d) => (
                <div key={d} style={{ textAlign: "center", color: "rgba(30,26,20,0.35)", fontSize: "0.56rem", fontWeight: 600, padding: "2px 0" }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const isPastDay = isPastMonth || (viewYear === todayY && viewMonth === todayM && day < todayD);
                const isToday   = viewYear === todayY && viewMonth === todayM && day === todayD;
                return (
                  <button key={idx}
                    onClick={() => !isPastMonth && onToggle(monthKey)}
                    style={{
                      aspectRatio: "1", borderRadius: "5px",
                      border: isToday ? "1.5px solid #781216" : "1.5px solid transparent",
                      background: isSelected ? "rgba(120,18,22,0.1)" : isToday ? "rgba(120,18,22,0.06)" : "transparent",
                      color: isPastDay ? "rgba(30,26,20,0.2)" : isSelected ? "#781216" : "#1e1a14",
                      fontSize: "0.66rem", fontWeight: isToday ? 700 : 400,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: isPastMonth ? "not-allowed" : "pointer",
                      transition: "background 0.12s ease",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected.length > 0 && (
        <button onClick={() => selected.forEach((m) => onToggle(m))}
          style={{ marginTop: "10px", background: "none", border: "none", color: "rgba(30,26,20,0.42)", fontSize: "0.65rem", cursor: "pointer", fontFamily: "'Poppins', sans-serif", textDecoration: "underline", padding: 0 }}>
          Clear selection
        </button>
      )}
    </div>
  );
}

// ── Filter sidebar ─────────────────────────────────────────────────
function FilterSidebar({ filters, setFilters, availableDestinations, availableCategories }: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  availableDestinations: string[];
  availableCategories: string[];
}) {
  const toggle = (key: keyof Omit<Filters, "priceRange">, val: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val],
    }));
  };

  const activeCount = Object.values(filters).flat().filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1e1a14", fontSize: "0.82rem", fontWeight: 600 }}>
          <SlidersHorizontal size={14} color="#781216" />
          Filters {activeCount > 0 && <span style={{ background: "#781216", color: "#fff", borderRadius: "999px", width: "18px", height: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700 }}>{activeCount}</span>}
        </span>
        {activeCount > 0 && (
          <button onClick={() => setFilters(EMPTY_FILTERS)} style={{ background: "none", border: "none", color: "#781216", fontSize: "0.7rem", cursor: "pointer", fontFamily: "'Poppins', sans-serif", textDecoration: "underline" }}>
            Clear all
          </button>
        )}
      </div>

      {/* Destination */}
      {availableDestinations.length > 0 && (
        <FilterGroup title="Destination">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {availableDestinations.map((d) => (
              <CheckPill key={d} label={d} active={filters.destinations.includes(d)} onToggle={() => toggle("destinations", d)} />
            ))}
          </div>
        </FilterGroup>
      )}

      {/* Category */}
      {availableCategories.length > 0 && (
        <FilterGroup title="Category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {availableCategories.map((c) => (
              <CheckPill key={c} label={c} active={filters.categories.includes(c)} onToggle={() => toggle("categories", c)} />
            ))}
          </div>
        </FilterGroup>
      )}

      {/* Duration */}
      <FilterGroup title="Duration">
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {DURATIONS.map((d) => (
            <CheckPill key={d} label={d} active={filters.durations.includes(d)} onToggle={() => toggle("durations", d)} />
          ))}
        </div>
      </FilterGroup>

      {/* Price Range */}
      <FilterGroup title="Price Range">
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {PRICE_RANGES.map((r) => (
            <CheckPill key={r.label} label={r.label}
              active={filters.priceRange === r.label}
              onToggle={() => setFilters((f) => ({ ...f, priceRange: f.priceRange === r.label ? null : r.label }))}
            />
          ))}
        </div>
      </FilterGroup>

      {/* Month — calendar picker */}
      <FilterGroup title="Travel Month">
        <MonthCalendar
          selected={filters.months}
          onToggle={(m) => toggle("months", m)}
        />
      </FilterGroup>

      {/* Difficulty */}
      <FilterGroup title="Difficulty" defaultOpen={false}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
          {DIFFICULTIES.map((d) => (
            <CheckPill key={d} label={d} active={filters.difficulties.includes(d)} onToggle={() => toggle("difficulties", d)} />
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

// ── Trip Card ──────────────────────────────────────────────────────
function TripCard({ trip, index }: { trip: ApiTrip; index: number }) {
  const [hovered, setHovered] = useState(false);
  const heroImage = trip.bannerImages?.[0] || trip.galleryImages?.[0] || "";
  const priceNum = priceToNumber(trip.price);
  const spots = spotsLeft(trip.capacity, trip.filledSpots);
  const tags = trip.tripTags?.map((t) => t.tag) || [];
  const typeLabel = formatTripType(trip.tripType);
  const durationStr = formatDuration(trip.duration);
  const priceStr = formatPrice(trip.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: Math.min(index * 0.04, 0.3) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff", borderRadius: "12px", overflow: "hidden",
        border: "1px solid rgba(30,26,20,0.07)",
        boxShadow: hovered ? "0 8px 32px rgba(30,26,20,0.1)" : "0 2px 8px rgba(30,26,20,0.05)",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        cursor: "pointer", fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
        {heroImage ? (
          <img src={heroImage} alt={trip.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.55s ease", transform: hovered ? "scale(1.05)" : "scale(1)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#ede8dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <NA text="No Image" />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,11,0.55) 0%, transparent 50%)" }} />
        <div style={{ position: "absolute", top: "12px", left: "12px", background: "#781216", color: "#fff", borderRadius: "4px", padding: "3px 10px", fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {typeLabel}
        </div>
        {spots <= 8 && spots > 0 && (
          <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(11,11,11,0.7)", backdropFilter: "blur(6px)", color: "#C8A96E", borderRadius: "4px", padding: "3px 10px", fontSize: "0.58rem", fontWeight: 500 }}>
            {spots} spots left
          </div>
        )}
      </div>
      <div style={{ padding: "20px 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "7px" }}>
          <MapPin size={11} color="#781216" />
          <span style={{ color: "#781216", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {safeValue(trip.location) === "Not Available" ? <NA /> : trip.location}
          </span>
        </div>
        <h3 style={{ color: "#1e1a14", fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 6px" }}>
          {trip.title || <NA />}
        </h3>
        <p style={{ color: "rgba(30,26,20,0.52)", fontSize: "0.78rem", fontWeight: 300, lineHeight: 1.6, margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {trip.overview ? trip.overview.substring(0, 120) + (trip.overview.length > 120 ? "…" : "") : <NA text="No description available" />}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "18px" }}>
          {tags.length > 0 ? tags.map((tag) => (
            <span key={tag} style={{ background: "rgba(120,18,22,0.06)", border: "1px solid rgba(120,18,22,0.1)", color: "rgba(30,26,20,0.6)", borderRadius: "999px", padding: "2px 9px", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
              {tag}
            </span>
          )) : (
            <span style={{ color: "rgba(30,26,20,0.3)", fontSize: "0.6rem", fontStyle: "italic" }}>No tags</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid rgba(30,26,20,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(30,26,20,0.5)", fontSize: "0.72rem" }}>
              <Clock size={11} />{isNotAvailable(durationStr) ? <NA /> : durationStr}
            </span>
            <span style={{ color: "#1e1a14", fontSize: "0.88rem", fontWeight: 600 }}>
              {isNotAvailable(priceStr) ? <NA /> : priceStr}
            </span>
          </div>
          <Link to={`/trips/${trip.slug}`} style={{ background: hovered ? "#C8A96E" : "transparent", border: `1.5px solid ${hovered ? "#C8A96E" : "rgba(30,26,20,0.15)"}`, color: hovered ? "#1e1a14" : "rgba(30,26,20,0.6)", borderRadius: "4px", padding: "7px 16px", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.25s ease", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}>
            View Trip <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Destination config ────────────────────────────────────────────
const DEST_CONFIG = [
  { key: "Tawang",  label: "Tawang",               region: "Arunachal Pradesh", tagline: "Monasteries, frozen passes, and the roof of the Northeast." },
  { key: "Mechuka", label: "Mechuka",               region: "Arunachal Pradesh", tagline: "India's best-kept secret — a valley untouched by mass tourism." },
  { key: "Ziro",    label: "Ziro",                  region: "Arunachal Pradesh", tagline: "UNESCO rice terraces, Apatani culture and India's finest music festival." },
  { key: "Dirang",  label: "Dirang",                region: "Arunachal Pradesh", tagline: "Hot springs, black-necked cranes, orchids and the gentlest valley." },
  { key: "Other",   label: "Beyond the Northeast",  region: "India & International", tagline: "Beaches, deserts, jungles and mountains across India and abroad." },
];

function getDestGroup(trip: ApiTrip): string {
  // Use the destination relation name if available, otherwise fall back to location
  const destName = trip.destination?.name || trip.location || "";
  // Check if it matches any known DEST_CONFIG key
  for (const cfg of DEST_CONFIG) {
    if (cfg.key !== "Other" && destName.toLowerCase().includes(cfg.key.toLowerCase())) {
      return cfg.key;
    }
  }
  return "Other";
}

function DestinationAccordion({ destKey, label, region, tagline, trips, defaultOpen }: {
  destKey: string; label: string; region: string; tagline: string;
  trips: ApiTrip[]; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        border: "1px solid rgba(30,26,20,0.09)",
        borderRadius: "14px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: open ? "0 4px 24px rgba(30,26,20,0.06)" : "0 1px 4px rgba(30,26,20,0.04)",
        transition: "box-shadow 0.3s ease",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── Accordion header ── */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "clamp(18px,3vw,26px) clamp(20px,3vw,32px)",
          background: open
            ? "linear-gradient(to right, rgba(120,18,22,0.03) 0%, transparent 60%)"
            : hovered ? "rgba(30,26,20,0.015)" : "transparent",
          border: "none",
          cursor: "pointer",
          gap: "16px",
          textAlign: "left",
          transition: "background 0.25s ease",
        }}
      >
        {/* Left accent bar */}
        <div style={{
          width: "3px",
          height: "clamp(36px,5vw,52px)",
          borderRadius: "2px",
          background: open ? "#781216" : "rgba(30,26,20,0.12)",
          flexShrink: 0,
          transition: "background 0.3s ease",
        }} />

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <h2 style={{
              color: open ? "#781216" : "#1e1a14",
              fontSize: "clamp(1.1rem,2.2vw,1.5rem)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: 0,
              transition: "color 0.25s ease",
            }}>
              {label}
            </h2>
            <span style={{
              color: "rgba(30,26,20,0.38)",
              fontSize: "0.68rem",
              fontWeight: 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              {region}
            </span>
          </div>
          <p style={{
            color: "rgba(30,26,20,0.48)",
            fontSize: "0.78rem",
            fontWeight: 300,
            lineHeight: 1.55,
            margin: 0,
          }}>
            {tagline}
          </p>
        </div>

        {/* Right: trip count + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: open ? "#781216" : "rgba(30,26,20,0.55)", fontSize: "clamp(1.2rem,2.5vw,1.7rem)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, transition: "color 0.25s ease" }}>
              {trips.length}
            </p>
            <p style={{ color: "rgba(30,26,20,0.32)", fontSize: "0.6rem", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", margin: "2px 0 0" }}>
              trip{trips.length !== 1 ? "s" : ""}
            </p>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: `1.5px solid ${open ? "rgba(120,18,22,0.25)" : "rgba(30,26,20,0.12)"}`,
              background: open ? "rgba(120,18,22,0.05)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.25s ease, background 0.25s ease",
              flexShrink: 0,
            }}
          >
            <ChevronDown size={15} color={open ? "#781216" : "rgba(30,26,20,0.4)"} />
          </motion.div>
        </div>
      </button>

      {/* ── Expandable cards section ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            {/* Gold separator */}
            <div style={{ height: "1px", background: "linear-gradient(to right, rgba(120,18,22,0.15) 0%, rgba(120,18,22,0.05) 100%)", margin: "0 clamp(20px,3vw,32px)" }} />

            <div style={{ padding: "clamp(20px,3vw,28px) clamp(20px,3vw,32px)" }}>
              <div style={{ display: "grid", gap: "16px" }} className="grid-cols-1 sm:grid-cols-2">
                {trips.map((trip, i) => (
                  <TripCard key={trip.id} trip={trip} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DestinationSections({ trips }: { trips: ApiTrip[] }) {
  const groups: Record<string, ApiTrip[]> = {};
  trips.forEach((t) => {
    const key = getDestGroup(t);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const visible = DEST_CONFIG.filter(({ key }) => groups[key]?.length > 0);

  // If no trips match any DEST_CONFIG key, show them under dynamic groups
  if (visible.length === 0 && trips.length > 0) {
    // Group by destination name or location
    const dynamicGroups: Record<string, ApiTrip[]> = {};
    trips.forEach((t) => {
      const key = t.destination?.name || t.location || "Other";
      if (!dynamicGroups[key]) dynamicGroups[key] = [];
      dynamicGroups[key].push(t);
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.entries(dynamicGroups).map(([key, groupTrips], idx) => (
          <DestinationAccordion
            key={key}
            destKey={key}
            label={key}
            region=""
            tagline={`${groupTrips.length} trip${groupTrips.length !== 1 ? "s" : ""} available`}
            trips={groupTrips}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {visible.map(({ key, label, region, tagline }, idx) => (
        <DestinationAccordion
          key={key}
          destKey={key}
          label={label}
          region={region}
          tagline={tagline}
          trips={groups[key]}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "2rem 0" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid rgba(30,26,20,0.07)",
          overflow: "hidden",
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          <div style={{ padding: "clamp(18px,3vw,26px) clamp(20px,3vw,32px)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "3px", height: "52px", borderRadius: "2px", background: "rgba(30,26,20,0.08)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: "200px", height: "20px", borderRadius: "4px", background: "rgba(30,26,20,0.06)", marginBottom: "8px" }} />
              <div style={{ width: "300px", height: "14px", borderRadius: "4px", background: "rgba(30,26,20,0.04)" }} />
            </div>
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "5rem 0", fontFamily: "'Poppins', sans-serif" }}>
      <AlertCircle size={40} color="#c0392b" strokeWidth={1.5} style={{ marginBottom: "16px" }} />
      <p style={{ color: "#c0392b", fontSize: "1rem", fontWeight: 500, marginBottom: "8px" }}>Failed to load trips</p>
      <p style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.82rem", fontWeight: 300, marginBottom: "20px" }}>{message}</p>
      <button onClick={onRetry}
        style={{ background: "#781216", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "0.78rem", fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: "pointer", letterSpacing: "0.06em" }}>
        Try Again
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips] = useState<ApiTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState("popular");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllTrips();
      setTrips(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // Derive available filter options from actual data
  const availableDestinations = useMemo(() => {
    const destSet = new Set<string>();
    trips.forEach((t) => {
      const group = getDestGroup(t);
      destSet.add(group);
    });
    // Return only DEST_CONFIG keys that appear, in order
    return DEST_CONFIG.map((c) => c.key).filter((k) => destSet.has(k));
  }, [trips]);

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    trips.forEach((t) => {
      catSet.add(formatTripType(t.tripType));
    });
    return Array.from(catSet).sort();
  }, [trips]);

  const activeCount = Object.values(filters).flat().filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = trips.filter((t) => {
      // Search
      const q = search.toLowerCase();
      const tags = t.tripTags?.map((tg) => tg.tag) || [];
      if (q && !t.title.toLowerCase().includes(q) && !t.location.toLowerCase().includes(q) && !tags.some((tag) => tag.toLowerCase().includes(q)) && !formatTripType(t.tripType).toLowerCase().includes(q)) return false;

      // Destination
      if (filters.destinations.length > 0) {
        const tripDest = getDestGroup(t);
        if (!filters.destinations.includes(tripDest)) return false;
      }

      // Category (trip type)
      if (filters.categories.length > 0) {
        const typeLabel = formatTripType(t.tripType);
        if (!filters.categories.includes(typeLabel)) return false;
      }

      // Duration
      if (filters.durations.length > 0) {
        const days = t.duration;
        const match = filters.durations.some((d) => {
          if (d === "Weekend") return days <= 3;
          return d === formatDuration(days);
        });
        if (!match) return false;
      }

      // Price
      if (filters.priceRange) {
        const range = PRICE_RANGES.find((r) => r.label === filters.priceRange);
        const price = priceToNumber(t.price);
        if (range && (price < range.min || price > range.max)) return false;
      }

      // Month
      if (filters.months.length > 0) {
        const tripMonths = parseMonths(t.bestTimeToVisit);
        if (!filters.months.some((m) => tripMonths.includes(m))) return false;
      }

      // Difficulty
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(t.difficultyLevel)) return false;

      return true;
    });

    const pn = priceToNumber;
    if (sort === "price_asc")    list = [...list].sort((a, b) => pn(a.price) - pn(b.price));
    if (sort === "price_desc")   list = [...list].sort((a, b) => pn(b.price) - pn(a.price));
    if (sort === "duration_asc") list = [...list].sort((a, b) => a.duration - b.duration);

    return list;
  }, [trips, search, filters, sort]);

  return (
    <div style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Hero banner ── */}
      <div style={{ background: "#1e1a14", paddingTop: "110px", paddingBottom: "clamp(2.5rem,5vw,4rem)", paddingLeft: "clamp(1.5rem,5vw,6rem)", paddingRight: "clamp(1.5rem,5vw,6rem)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", pointerEvents: "none", overflow: "hidden" }}>
          <span style={{ fontSize: "clamp(5rem,15vw,14rem)", fontWeight: 700, color: "rgba(242,237,228,0.03)", letterSpacing: "-0.04em", lineHeight: 1, paddingRight: "2rem", userSelect: "none" }}>TRIPS</span>
        </div>
        <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{ color: "#C8A96E", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "12px" }}>/ Our Trips</p>
          <h1 style={{ color: "#f2ede4", fontSize: "clamp(2.2rem,5vw,4rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 16px" }}>
            Find your kind of <em style={{ color: "#C8A96E", fontStyle: "italic" }}>adventure.</em>
          </h1>
          <p style={{ color: "rgba(242,237,228,0.5)", fontSize: "0.88rem", fontWeight: 300, lineHeight: 1.8, maxWidth: "480px", margin: 0 }}>
            {loading ? "Loading trips…" : `${trips.length} handcrafted trips across India and beyond — each one built around real experiences.`}
          </p>
        </div>
      </div>

      {/* ── Top bar: search + sort + mobile filter toggle ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid rgba(30,26,20,0.07)", position: "sticky", top: "72px", zIndex: 50, boxShadow: "0 2px 12px rgba(30,26,20,0.05)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "12px clamp(1.5rem,5vw,6rem)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>

          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "300px" }}>
            <Search size={13} color="rgba(30,26,20,0.35)" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input type="text" placeholder="Search trips…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 32px 9px 34px", background: "#f5f0e6", border: "1px solid rgba(30,26,20,0.1)", borderRadius: "6px", fontSize: "0.8rem", fontFamily: "'Poppins', sans-serif", fontWeight: 300, color: "#1e1a14", outline: "none", boxSizing: "border-box" as const }} />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={12} color="rgba(30,26,20,0.4)" /></button>}
          </div>

          {/* Sort */}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{ padding: "9px 12px", background: "#f5f0e6", border: "1px solid rgba(30,26,20,0.1)", borderRadius: "6px", fontSize: "0.78rem", fontFamily: "'Poppins', sans-serif", color: "rgba(30,26,20,0.7)", cursor: "pointer", outline: "none", flexShrink: 0 }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Mobile filter toggle */}
          <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", background: activeCount > 0 ? "rgba(120,18,22,0.06)" : "transparent", border: `1.5px solid ${activeCount > 0 ? "#781216" : "rgba(30,26,20,0.12)"}`, borderRadius: "6px", color: activeCount > 0 ? "#781216" : "rgba(30,26,20,0.6)", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}>
            <SlidersHorizontal size={13} />
            Filters {activeCount > 0 && `(${activeCount})`}
          </button>

          {/* Results count */}
          <span style={{ color: "rgba(30,26,20,0.38)", fontSize: "0.72rem", letterSpacing: "0.06em", marginLeft: "auto" }}>
            {loading ? "…" : `${filtered.length} trip${filtered.length !== 1 ? "s" : ""} found`}
          </span>
        </div>

        {/* Active filter pills */}
        {activeCount > 0 && (
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 clamp(1.5rem,5vw,6rem) 10px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            {(Object.entries(filters) as [keyof Filters, string | string[]][]).map(([key, val]) => {
              if (!val || (Array.isArray(val) && val.length === 0)) return null;
              const vals = Array.isArray(val) ? val : [val];
              return vals.map((v) => (
                <span key={`${key}-${v}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(120,18,22,0.07)", border: "1px solid rgba(120,18,22,0.15)", borderRadius: "999px", padding: "3px 10px", fontSize: "0.65rem", color: "#781216", fontFamily: "'Poppins', sans-serif" }}>
                  {v}
                  <button onClick={() => {
                    if (key === "priceRange") setFilters((f) => ({ ...f, priceRange: null }));
                    else setFilters((f) => ({ ...f, [key]: (f[key] as string[]).filter((x) => x !== v) }));
                  }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, lineHeight: 1 }}>
                    <X size={10} color="#781216" />
                  </button>
                </span>
              ));
            })}
            <button onClick={() => setFilters(EMPTY_FILTERS)} style={{ background: "none", border: "none", color: "rgba(30,26,20,0.45)", fontSize: "0.65rem", cursor: "pointer", fontFamily: "'Poppins', sans-serif", textDecoration: "underline", padding: "3px 6px" }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,6rem)" }}>
        <div style={{ display: "flex", gap: "clamp(1.5rem,3vw,3rem)", alignItems: "flex-start" }}>

          {/* Sidebar — desktop */}
          <div className="hidden lg:block" style={{ width: "240px", flexShrink: 0, position: "sticky", top: "155px", background: "#ffffff", border: "1px solid rgba(30,26,20,0.07)", borderRadius: "12px", padding: "20px 20px 8px" }}>
            <FilterSidebar filters={filters} setFilters={setFilters} availableDestinations={availableDestinations} availableCategories={availableCategories} />
          </div>

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {mobileFiltersOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setMobileFiltersOpen(false)}
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 90 }}
                  className="lg:hidden"
                />
                <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "280px", background: "#ffffff", zIndex: 91, overflowY: "auto", padding: "24px 20px" }}
                  className="lg:hidden"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: "#1e1a14", fontSize: "0.9rem" }}>Filters</span>
                    <button onClick={() => setMobileFiltersOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#1e1a14" /></button>
                  </div>
                  <FilterSidebar filters={filters} setFilters={setFilters} availableDestinations={availableDestinations} availableCategories={availableCategories} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Destination sections */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={loadTrips} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 0" }}>
                <p style={{ color: "rgba(30,26,20,0.35)", fontSize: "1rem", fontWeight: 300, marginBottom: "16px" }}>No trips match your filters.</p>
                <button onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS); }}
                  style={{ background: "none", border: "1px solid rgba(30,26,20,0.15)", borderRadius: "999px", padding: "8px 20px", color: "rgba(30,26,20,0.55)", fontSize: "0.72rem", fontFamily: "'Poppins', sans-serif", cursor: "pointer" }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <DestinationSections trips={filtered} />
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
