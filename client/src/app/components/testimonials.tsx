import React from "react";
import { motion } from "motion/react";

const TESTIMONIALS = [
  {
    text: "The Ziro Music Festival trip was beyond anything I imagined. Camping in the valley, music echoing off the hills — Hangover Trails made it feel effortless and deeply personal.",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Priya Mehta",
    role: "Ziro Festival · Oct 2024",
    rating: 5,
  },
  {
    text: "I was a solo traveler a little nervous about joining a group trip. Within a day, these strangers were family. The community Hangover builds is genuinely something special.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Arjun Nair",
    role: "Backpacking Tour · Spiti",
    rating: 5,
  },
  {
    text: "Our college batch of 40 people had an absolutely seamless Rajasthan trip. Every detail — logistics, stays, local guides — was handled with such warmth and professionalism.",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Sneha Kulkarni",
    role: "Institute Trip · Rajasthan",
    rating: 5,
  },
  {
    text: "The Rann Utsav experience hit different. Full moon night, bonfire on the salt flats, strangers singing together — I've traveled a lot, but this one I'll never forget.",
    image: "https://randomuser.me/api/portraits/men/56.jpg",
    name: "Rohan Desai",
    role: "Rann Utsav · Nov 2024",
    rating: 5,
  },
  {
    text: "What I love most is how Hangover Trails doesn't rush you. Every destination had breathing space, local experiences, real food. They travel the right way.",
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Kavya Reddy",
    role: "Heritage Walk · Hampi",
    rating: 5,
  },
  {
    text: "Booked the Himalayan trek as a 28-year-old with zero trekking experience. The team guided us so patiently. I reached the summit crying — that's how good it was.",
    image: "https://randomuser.me/api/portraits/men/14.jpg",
    name: "Vikram Sharma",
    role: "Mountain Trek · Kedarkantha",
    rating: 5,
  },
  {
    text: "The bonfire evenings are what make Hangover Trails different. No screens, no rush — just conversations, laughter, and the kind of connection you don't find on typical tours.",
    image: "https://randomuser.me/api/portraits/women/29.jpg",
    name: "Ananya Iyer",
    role: "Bonfire Retreat · Coorg",
    rating: 5,
  },
  {
    text: "As a photography enthusiast, I was blown away by how thoughtfully they planned shooting spots. Golden hour at Hampi's ruins — I got the best frames of my life.",
    image: "https://randomuser.me/api/portraits/men/76.jpg",
    name: "Nikhil Joshi",
    role: "Photography Tour · Karnataka",
    rating: 5,
  },
  {
    text: "From itinerary to local food recommendations to emergency support — Hangover Trails is thorough like no other. I felt safe, cared for, and completely present throughout.",
    image: "https://randomuser.me/api/portraits/women/55.jpg",
    name: "Meera Patel",
    role: "Beach Escape · Gokarna",
    rating: 5,
  },
];

const firstCol  = TESTIMONIALS.slice(0, 3);
const secondCol = TESTIMONIALS.slice(3, 6);
const thirdCol  = TESTIMONIALS.slice(6, 9);

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
        <img
          src={image}
          alt={name}
          width={38}
          height={38}
          style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
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
