import { useEffect, useRef, useState } from "react";
import { ShaderAnimation } from "./shader-animation";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const destinations = [
  {
    id: 1,
    name: "Santorini",
    country: "Greece",
    tagline: "Where the Aegean whispers eternity",
    description: "Drift through whitewashed villages perched on volcanic cliffs, and watch the sun dissolve into the deepest blue on Earth.",
    duration: "8 Days",
    price: "From ₹2,06,000",
    image: "https://images.unsplash.com/photo-1507501336603-6e31db2be093?w=1920&h=1080&fit=crop&auto=format",
  },
  {
    id: 2,
    name: "Kyoto",
    country: "Japan",
    tagline: "Ancient temples, eternal stillness",
    description: "Walk beneath vermilion torii gates and centuries-old cedar forests. Find tranquility in a city where tradition breathes.",
    duration: "10 Days",
    price: "From ₹2,65,000",
    image: "https://images.unsplash.com/photo-1665706896821-319040b81753?w=1920&h=1080&fit=crop&auto=format",
  },
  {
    id: 3,
    name: "Patagonia",
    country: "Chile",
    tagline: "Where the world ends and wonder begins",
    description: "Hike beneath granite spires that pierce low clouds. Feel the raw, untouched silence of the world's last wilderness.",
    duration: "12 Days",
    price: "From ₹3,57,000",
    image: "https://images.unsplash.com/photo-1637580980556-085dee659c7e?w=1920&h=1080&fit=crop&auto=format",
  },
  {
    id: 4,
    name: "Amalfi Coast",
    country: "Italy",
    tagline: "Cliffs, cerulean sea, and la dolce vita",
    description: "Wind along clifftop roads where lemon groves meet the sea. Every cove holds a story of sun, salt, and timeless beauty.",
    duration: "7 Days",
    price: "From ₹2,40,000",
    image: "https://images.unsplash.com/photo-1649792880509-3897bbe2ba83?w=1920&h=1080&fit=crop&auto=format",
  },
  {
    id: 5,
    name: "Swiss Alps",
    country: "Switzerland",
    tagline: "Above the clouds, below the stars",
    description: "Ascend into a world of crystalline peaks and silence so profound it changes you. Winter or summer — always extraordinary.",
    duration: "9 Days",
    price: "From ₹3,07,000",
    image: "https://images.unsplash.com/photo-1626948688703-0136bc0a90da?w=1920&h=1080&fit=crop&auto=format",
  },
];


export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (next: number) => {
    setCurrent((next + destinations.length) % destinations.length);
  };

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % destinations.length);
    }, 6000);
  };

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handlePrev = () => { go(current - 1); resetInterval(); };
  const handleNext = () => { go(current + 1); resetInterval(); };
  const handleDot = (i: number) => { go(i); resetInterval(); };

  const slide = destinations[current];

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#0b0b0b]">
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
            src={slide.image}
            alt={`${slide.name}, ${slide.country}`}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to right, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.60) 50%, rgba(11,11,11,0.20) 100%), linear-gradient(to top, rgba(11,11,11,0.70) 0%, transparent 45%)",
        }}
      />

      {/* Shader animation texture */}
      <div className="absolute inset-0 z-20">
        <ShaderAnimation opacity={0.12} />
      </div>

      {/* NAV is now rendered globally as a fixed sticky bar — see Navbar component */}

      {/* HERO CONTENT */}
      <div className="absolute inset-0 z-30 flex items-center">
        <div className="px-10 md:px-16 lg:px-24 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Location chip */}
              <div
                className="flex items-center gap-2 mb-6"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400 }}
              >
                <MapPin size={12} className="text-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] uppercase tracking-[0.2em]"
                  style={{ fontSize: "0.72rem" }}
                >
                  {slide.country}
                </span>
              </div>

              {/* Destination name */}
              <h1
                className="text-[#f2ede4] mb-4 leading-[1.05]"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 300,
                  fontSize: "clamp(3.5rem, 8vw, 7rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                {slide.name}
              </h1>

              {/* Thin separator */}
              <div className="w-12 h-px bg-[#c8a96e] mb-6" />

              {/* Tagline */}
              <p
                className="text-[#f2ede4]/80 mb-4 italic"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "1.05rem", letterSpacing: "0.01em" }}
              >
                {slide.tagline}
              </p>

              {/* Description */}
              <p
                className="text-[#f2ede4]/80 mb-8 leading-relaxed max-w-md"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "0.88rem" }}
              >
                {slide.description}
              </p>

              {/* Meta — Duration + Starting price */}
              <div className="flex items-center gap-8">
                <div>
                  <div
                    className="text-[#f2ede4]/65 uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.65rem" }}
                  >
                    Duration
                  </div>
                  <div
                    className="text-[#f2ede4]"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "0.88rem" }}
                  >
                    {slide.duration}
                  </div>
                </div>
                <div className="w-px h-8 bg-[#f2ede4]/30" />
                <div>
                  <div
                    className="text-[#f2ede4]/65 uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.65rem" }}
                  >
                    Starting
                  </div>
                  <div
                    className="text-[#c8a96e]"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: "0.88rem" }}
                  >
                    {slide.price}
                  </div>
                </div>
              </div>

              {/* Explore CTA — below pricing & duration */}
              <button
                className="group active:scale-95 transition-all duration-300 mt-8"
                style={{
                  background: "#C8A96E",
                  color: "#0b0b0b",
                  border: "none",
                  padding: "12px 28px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#dfc08a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#C8A96E")}
              >
                EXPLORE
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* NAV ARROWS */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
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

      {/* SLIDE COUNTER + DOTS */}
      <div className="absolute bottom-10 left-10 md:left-16 lg:left-24 z-30 flex items-center gap-6">
        <span
          className="text-[#f2ede4]/65 tabular-nums"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontSize: "0.75rem" }}
        >
          {String(current + 1).padStart(2, "0")} / {String(destinations.length).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-2">
          {destinations.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDot(i)}
              className="transition-all duration-500 rounded-full"
              style={{
                width: i === current ? "24px" : "6px",
                height: "2px",
                borderRadius: "1px",
                background: i === current ? "#c8a96e" : "rgba(242,237,228,0.50)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-10 right-10 z-30 flex flex-col items-center gap-2">
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
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "0.58rem", writingMode: "vertical-rl" }}
        >
          Scroll
        </span>
      </div>
    </section>
  );
}
