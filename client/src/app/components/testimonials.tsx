import React from "react";
import { motion } from "motion/react";

const TESTIMONIALS = [
  {
    text: "Had an amazing experience on my recent trip to Tawang with the Hangover team. Everything was exceptionally well planned, from the itinerary to the smallest details. The service was excellent and the stay was super comfortable, which made the journey even more enjoyable. Truly a hassle-free and memorable trip.\n\nLooking forward to many more trips with you all! Hope to see Hangover expanding to all-India destinations soon 🤞✨",
    image: "https://lh3.googleusercontent.com/a-/ALV-UjU3LHAljId4ObLAkqcUHcDelDFeOA4CjJfaM8HIY37PL8sTFDjt_w=w130-h130-p-rp-mo-ba12-br100",
    name: "Shilpa Nanda",
    role: "Tawang Trip",
    rating: 5,
  },
  {
    text: "An Unforgettable Journey Through Arunachal Pradesh😃\n\nAmazing trip planned by Hangover Trails through Tawang, Arunachal Pradesh! The scenic drives, wonderful homestays, local food, Bumla Pass breathtaking views, and the incredible Tawang Monastery were all highlights. A special shoutout to our guide Dorjee — his warmth and guidance made the trip truly memorable.\n\nOnly downside was the last day's accommodation and overpriced BBQ arrangements. A little improvement there and this would be a perfect experience.\n\nOverall, a wonderful trip — Hangover Trails is your go-to for exploring Arunachal Pradesh!",
    image: "",
    name: "Sai Anusha",
    role: "Arunachal Pradesh",
    rating: 5,
  },
  {
    text: "We had an awesome time, throughout the trip, we were getting prompt support and itinerary updates. Driver hired was professional and kind.\n\nHotels, Cottages stays were good with home made food provided by the host.",
    image: "",
    name: "Bharat Mhatre",
    role: "Hangover Trails",
    rating: 5,
  },
];

const firstCol  = [TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[2]];
const secondCol = [TESTIMONIALS[1], TESTIMONIALS[2], TESTIMONIALS[0]];
const thirdCol  = [TESTIMONIALS[2], TESTIMONIALS[0], TESTIMONIALS[1]];

/* ── single card ────────────────────────────────────────────────── */
function TestimonialCard({
  text, image, name, role, rating,
}: (typeof TESTIMONIALS)[0]) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(30,26,20,0.08)",
        borderRadius: "16px",
        padding: "28px",
        boxShadow: "0 2px 16px rgba(30,26,20,0.06)",
        fontFamily: "'Poppins', sans-serif",
        maxWidth: "320px",
        width: "100%",
        flexShrink: 0,
      }}
    >
      {/* Stars */}
      <div style={{ display: "flex", gap: "3px", marginBottom: "14px" }}>
        {[...Array(rating)].map((_, i) => (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#b8943a">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Text */}
      <p style={{
        color: "rgba(30,26,20,0.82)",
        fontSize: "0.85rem",
        fontWeight: 300,
        lineHeight: 1.75,
        letterSpacing: "0.01em",
        margin: "0 0 20px",
      }}>
        "{text}"
      </p>

      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {image ? (
          <img
            src={image}
            alt={name}
            width={38}
            height={38}
            style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#b8943a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p style={{ color: "#1e1a14", fontSize: "0.82rem", fontWeight: 500, letterSpacing: "0.02em", margin: 0, lineHeight: 1.3 }}>
            {name}
          </p>
          <p style={{ color: "#b8943a", fontSize: "0.68rem", fontWeight: 400, letterSpacing: "0.08em", margin: 0, lineHeight: 1.4 }}>
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── scrolling column ───────────────────────────────────────────── */
function TestimonialsColumn({
  testimonials,
  duration = 15,
  className = "",
}: {
  testimonials: typeof TESTIMONIALS;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ overflow: "hidden" }}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "20px" }}
      >
        {[0, 1].map((key) => (
          <React.Fragment key={key}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={`${key}-${i}`} {...t} />
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

/* ── main export ────────────────────────────────────────────────── */
export function Testimonials() {
  return (
    <section
      style={{
        background: "#f5f0e6",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "'Poppins', sans-serif",
        padding: "clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,6rem)",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ textAlign: "center", marginBottom: "clamp(2.5rem,5vw,4rem)" }}
        >
          <p style={{
            color: "#b8943a",
            fontSize: "0.7rem",
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}>
            / Travelers Say
          </p>
          <h2 style={{
            color: "#1e1a14",
            fontSize: "clamp(2rem,4vw,3.2rem)",
            fontWeight: 300,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            margin: "0 auto 16px",
            maxWidth: "600px",
          }}>
            Stories from the{" "}
            <em style={{ color: "#b8943a", fontStyle: "italic" }}>road.</em>
          </h2>
          <p style={{
            color: "rgba(30,26,20,0.5)",
            fontSize: "0.88rem",
            fontWeight: 300,
            lineHeight: 1.85,
            maxWidth: "440px",
            margin: "0 auto",
          }}>
            Every review below is from a real traveler who trusted us with their time, money, and memories.
          </p>
        </motion.div>

        {/* ── Columns ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            maxHeight: "720px",
            overflow: "hidden",
            maskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <TestimonialsColumn testimonials={firstCol}  duration={18} />
          <TestimonialsColumn testimonials={secondCol} duration={22} className="hidden md:block" />
          <TestimonialsColumn testimonials={thirdCol}  duration={20} className="hidden lg:block" />
        </div>

      </div>
    </section>
  );
}
