import { useEffect, useRef, useState } from "react";
import { ShaderAnimation } from "./shader-animation";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import axios from "axios";
import { mediaImageUrl } from "../../lib/media";

interface FeaturedTrip {
  id: string;
  title: string;
  slug: string;
  overview?: string;
  location: string;
  duration: number;
  price?: number;
  packages?: Array<{ price: string | number }>;
  bannerImages: string; // first banner image URL
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

// Hardcoded fallback in case no featured trips exist
const FALLBACK_TRIPS: FeaturedTrip[] = [
  {
    id: "fallback-1",
    title: "Santorini",
    slug: "santorini",
    location: "Greece",
    duration: 8,
    price: 206000,
    bannerImages:
      "https://images.unsplash.com/photo-1507501336603-6e31db2be093?w=1920&h=1080&fit=crop&auto=format",
  },
];

function withStartingPrice(trip: FeaturedTrip): FeaturedTrip {
  const packagePrices = (trip.packages || [])
    .map((pkg) => Number(pkg.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  return {
    ...trip,
    price:
      typeof trip.price === "number" && Number.isFinite(trip.price)
        ? trip.price
        : packagePrices.length > 0
          ? Math.min(...packagePrices)
          : undefined,
  };
}

export function HeroCarousel() {
  const [trips, setTrips] = useState<FeaturedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Fetch featured trips from v2 API
  useEffect(() => {
    let cancelled = false;
    const fetchFeatured = async () => {
      try {
        const [standardResult, itineraryResult] = await Promise.allSettled([
          axios.get(`${API_URL}/trips/featured`, { withCredentials: true }),
          axios.get(`${API_URL}/crm-trips/public/featured`, { withCredentials: true }),
        ]);
        const standardTrips = standardResult.status === "fulfilled" ? standardResult.value.data?.result?.data : [];
        const itineraryTrips = itineraryResult.status === "fulfilled" ? itineraryResult.value.data?.data : [];
        const data = [...(Array.isArray(standardTrips) ? standardTrips : []), ...(Array.isArray(itineraryTrips) ? itineraryTrips : [])]
          .map((trip) => ({ ...trip, bannerImages: Array.isArray(trip.bannerImages) ? trip.bannerImages[0] : trip.bannerImages }));
        if (!cancelled && data.length > 0) {
          setTrips(data.map(withStartingPrice));
        } else if (!cancelled) {
          setTrips(FALLBACK_TRIPS);
        }
      } catch {
        if (!cancelled) setTrips(FALLBACK_TRIPS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (next: number) => {
    if (trips.length === 0) return;
    setCurrent((next + trips.length) % trips.length);
  };

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (trips.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % trips.length);
    }, 6000);
  };

  useEffect(() => {
    if (trips.length > 0) {
      resetInterval();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trips]);

  const handlePrev = () => {
    go(current - 1);
    resetInterval();
  };
  const handleNext = () => {
    go(current + 1);
    resetInterval();
  };
  const handleDot = (i: number) => {
    go(i);
    resetInterval();
  };

  // ──── LOADING STATE ────
  if (isLoading) {
    return (
      <section className="relative w-full min-h-[100svh] overflow-hidden bg-[#0b0b0b]">
        {/* Animated solid color pulse */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #0b0b0b 0%, #1a1510 30%, #201a12 50%, #1a1510 70%, #0b0b0b 100%)",
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Overlay gradient */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to right, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.60) 50%, rgba(11,11,11,0.20) 100%), linear-gradient(to top, rgba(11,11,11,0.70) 0%, transparent 45%)",
          }}
        />

        {/* Shader texture overlay */}
        <div className="absolute inset-0 z-20">
          <ShaderAnimation opacity={0.12} />
        </div>

        {/* Skeleton content */}
        <div className="absolute inset-0 z-30 flex items-center">
          <div className="px-6 md:px-16 lg:px-24 max-w-2xl w-full">
            {/* Location chip skeleton */}
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

            {/* Title skeleton */}
            <motion.div
              className="rounded mb-4"
              style={{
                background: "rgba(242,237,228,0.08)",
                height: "clamp(3.5rem, 8vw, 7rem)",
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

            {/* Separator skeleton */}
            <div
              className="w-12 h-px mb-6"
              style={{ background: "rgba(200,169,110,0.2)" }}
            />

            {/* Description skeleton lines */}
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

            {/* Meta skeleton */}
            <div className="flex items-center gap-5 sm:gap-8 mb-8">
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

            {/* Button skeleton */}
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
          </div>
        </div>
      </section>
    );
  }

  // ──── LOADED STATE ────
  const slide = trips[current];
  if (!slide) return null;

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden bg-[#0b0b0b]">
      {/* Background image crossfade */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <img
            src={mediaImageUrl(slide.bannerImages, { width: 1920, fit: "fit" })}
            alt={slide.title}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to right, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.60) 50%, rgba(11,11,11,0.20) 100%), linear-gradient(to top, rgba(11,11,11,0.78) 0%, transparent 48%)",
        }}
      />

      {/* Shader animation texture */}
      <div className="absolute inset-0 z-20">
        <ShaderAnimation opacity={0.12} />
      </div>

      {/* HERO CONTENT */}
      <div className="absolute inset-0 z-30 flex items-center pb-24 pt-24 md:py-0">
        <div className="px-5 sm:px-6 md:px-10 lg:px-12 max-w-4xl w-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
              {/* Location chip */}
              <div
                className="flex items-center gap-2 mb-4 md:mb-6"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 400,
                }}
              >
                <MapPin size={12} className="text-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] uppercase tracking-[0.16em] md:tracking-[0.2em]"
                  style={{ fontSize: "clamp(0.64rem, 2.5vw, 0.72rem)" }}
                >
                  {slide.location}
                </span>
              </div>

              {/* Destination name */}
              <h1
                className="text-[#f2ede4] mb-4 leading-[1.05]"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 300,
                  fontSize: "clamp(2.45rem, 15vw, 7rem)",
                  letterSpacing: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {slide.title}
              </h1>

              {/* Thin separator */}
              <div className="w-12 h-px bg-[#c8a96e] mb-6" />

              {/* Overview / Description */}
              {slide.overview && (
                <p
                  className="text-[#f2ede4]/80 mb-7 md:mb-8 leading-relaxed max-w-md"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "clamp(0.8rem, 3vw, 0.88rem)" }}
                >
                  {slide.overview.length > 160
                    ? slide.overview.slice(0, 160).trimEnd() + "…"
                    : slide.overview}
                </p>
              )}

              {/* Meta — Duration + Starting price */}
              <div className="flex items-center gap-4 sm:gap-8">
                <div>
                  <div
                    className="text-[#f2ede4]/65 uppercase tracking-widest mb-1"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 400,
                      fontSize: "0.65rem",
                    }}
                  >
                    Duration
                  </div>
                  <div
                    className="text-[#f2ede4]"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      fontSize: "0.88rem",
                    }}
                  >
                    {slide.duration}{" "}
                    {slide.duration === 1 ? "Day" : "Days"}
                  </div>
                </div>
                <div className="w-px h-8 bg-[#f2ede4]/30" />
                <div>
                  <div
                    className="text-[#f2ede4]/65 uppercase tracking-widest mb-1"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 400,
                      fontSize: "0.65rem",
                    }}
                  >
                    Starting
                  </div>
                  <div
                    className="text-[#c8a96e]"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      fontSize: "0.88rem",
                    }}
                  >
                    From ₹{slide.price?.toLocaleString("en-IN") ?? "N/A"}
                  </div>
                </div>
              </div>

              {/* Explore CTA */}
              <button
                onClick={() => navigate(`/trips/${slide.id}`)}
                className="group active:scale-95 transition-all duration-300 mt-8"
                style={{
                  background: "#C8A96E",
                  color: "#0b0b0b",
                  border: "none",
                  padding: "12px clamp(20px, 6vw, 28px)",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.76rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#dfc08a")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#C8A96E")
                }
              >
                EXPLORE
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform duration-300"
                />
              </button>
          </motion.div>
        </div>
      </div>

      {/* NAV ARROWS (only show if more than 1 trip) */}
      {trips.length > 1 && (
        <div className="absolute right-4 sm:right-6 md:right-10 bottom-9 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-30 flex flex-row md:flex-col gap-3">
          <button
            onClick={handlePrev}
            className="w-11 h-11 bg-[#f2ede4]/15 border border-[#f2ede4]/55 text-[#f2ede4] hover:bg-[#c8a96e] hover:border-[#c8a96e] hover:text-[#0b0b0b] active:scale-95 flex items-center justify-center transition-all duration-300"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="w-11 h-11 bg-[#f2ede4]/15 border border-[#f2ede4]/55 text-[#f2ede4] hover:bg-[#c8a96e] hover:border-[#c8a96e] hover:text-[#0b0b0b] active:scale-95 flex items-center justify-center transition-all duration-300"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* SLIDE INDICATORS */}
      {trips.length > 1 && (
        <div className="absolute bottom-10 left-5 sm:left-6 md:left-16 lg:left-24 z-30">
          <div className="flex items-center gap-2">
            {trips.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDot(i)}
                className="transition-all duration-500 rounded-full"
                style={{
                  width: i === current ? "24px" : "6px",
                  height: "2px",
                  borderRadius: "1px",
                  background:
                    i === current ? "#c8a96e" : "rgba(242,237,228,0.50)",
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scroll hint */}
      <div className="hidden md:flex absolute bottom-10 right-10 z-30 flex-col items-center gap-2">
        <div className="w-px h-10 bg-[#f2ede4]/15 relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 w-full bg-[#c8a96e]"
            animate={{ height: ["0%", "100%"], top: ["0%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            style={{ height: "30%" }}
          />
        </div>
        <span
          className="text-[#f2ede4]/65 uppercase tracking-widest"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 400,
            fontSize: "0.58rem",
            writingMode: "vertical-rl",
          }}
        >
          Scroll
        </span>
      </div>
    </section>
  );
}
