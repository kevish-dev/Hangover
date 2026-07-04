import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const REASONS = [
  {
    id: 1,
    title: "Cultural Immersion with the Local Tribe",
    description: "Deep dive into local traditions.",
    detail: "Experience the vibrant heritage, rituals, and daily life of indigenous tribes, gaining a profound understanding of their ancient customs.",
    imageUrl: "https://images.unsplash.com/photo-1771766995256-1618791109d5?w=900&h=520&fit=crop&auto=format&q=90",
  },
  {
    id: 2,
    title: "Trekking and Village Trails",
    description: "Explore the untouched paths.",
    detail: "Hike through breathtaking landscapes, hidden valleys, and remote villages that remain untouched by commercial tourism.",
    imageUrl: "https://images.unsplash.com/photo-1621531518034-94ecf4778186?w=900&h=520&fit=crop&auto=format&q=90",
  },
  {
    id: 3,
    title: "Community Led Travel",
    description: "Empowering local hosts.",
    detail: "Our journeys directly support local communities, ensuring sustainable tourism that benefits the people who call these places home.",
    imageUrl: "https://images.unsplash.com/photo-1536607961765-592e80bcc19e?w=900&h=520&fit=crop&auto=format&q=90",
  },
  {
    id: 4,
    title: "Authentic Culinary Experience",
    description: "Taste the true local flavors.",
    detail: "From foraging wild ingredients to cooking alongside local hosts, immerse yourself in the rich and diverse culinary traditions of the region.",
    imageUrl: "https://images.unsplash.com/photo-1576656501005-5c5e7543bfaa?w=900&h=520&fit=crop&auto=format&q=90",
  },
  {
    id: 5,
    title: "Memories by the Fire (BBQ & Bonfire)",
    description: "Unwind under the stars.",
    detail: "End your days sharing stories, enjoying warm BBQ, and building lifelong connections under a starlit sky.",
    imageUrl: "https://images.unsplash.com/photo-1532458605850-e9f7a26d9f80?w=900&h=520&fit=crop&auto=format&q=90",
  },
];

export function WhyHangover() {
  const [active, setActive] = useState(0);

  return (
    <section
      style={{
        background: "#ede8dc",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(3rem, 6vw, 7rem) clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            marginBottom: "clamp(2.5rem, 4vw, 4rem)",
          }}
        >
          <p
            style={{
              color: "#b8943a",
              fontSize: "0.7rem",
              fontWeight: 500,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            / Why Hangover Trails
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              width: "100%",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <h2
              style={{
                color: "#1e1a14",
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                fontWeight: 300,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              More than just
              <br />
              <em style={{ color: "#b8943a", fontStyle: "italic" }}>a trip.</em>
            </h2>

            <p
              style={{
                color: "rgba(30,26,20,0.55)",
                fontSize: "0.88rem",
                fontWeight: 300,
                lineHeight: 1.85,
                maxWidth: "360px",
                margin: 0,
              }}
            >
              Every journey we curate is built around meaning — for the curious, the bold, and the community-driven.
              Hover each experience to discover what sets us apart.
            </p>
          </div>
        </div>

        {/* Accordion — desktop horizontal */}
        <div
          className="hidden md:flex"
          style={{ height: "480px", gap: "6px", overflow: "hidden" }}
        >
          {REASONS.map((item, index) => (
            <AccordionPanel
              key={item.id}
              item={item}
              isActive={active === index}
              onEnter={() => setActive(index)}
            />
          ))}
        </div>

        {/* Accordion — mobile vertical */}
        <div className="flex flex-col md:hidden" style={{ gap: "6px" }}>
          {REASONS.map((item, index) => (
            <MobilePanel
              key={item.id}
              item={item}
              isActive={active === index}
              onToggle={() => setActive(active === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AccordionPanel({
  item,
  isActive,
  onEnter,
}: {
  item: (typeof REASONS)[0];
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
      {/* Photo */}
      <img
        src={item.imageUrl}
        alt={item.title}
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

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isActive
            ? "linear-gradient(to top, rgba(11,11,11,0.82) 0%, rgba(11,11,11,0.25) 55%, rgba(11,11,11,0.1) 100%)"
            : "linear-gradient(to top, rgba(11,11,11,0.75) 0%, rgba(11,11,11,0.45) 100%)",
          transition: "background 0.5s ease",
        }}
      />

      {/* Collapsed: vertical title */}
      <motion.div
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "28px",
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
          }}
        >
          {item.title}
        </span>
      </motion.div>

      {/* Active: full content */}
      <motion.div
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
        transition={{ duration: 0.45, delay: isActive ? 0.2 : 0 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "28px 28px 32px",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            color: "#b8943a",
            fontSize: "0.65rem",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          {item.description}
        </p>
        <h3
          style={{
            color: "#f2ede4",
            fontSize: "1.35rem",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            marginBottom: "10px",
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            color: "rgba(242,237,228,0.72)",
            fontSize: "0.8rem",
            fontWeight: 300,
            lineHeight: 1.75,
          }}
        >
          {item.detail}
        </p>
      </motion.div>

      {/* Gold bottom bar on active */}
      <motion.div
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
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
    </motion.div>
  );
}

function MobilePanel({
  item,
  isActive,
  onToggle,
}: {
  item: (typeof REASONS)[0];
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
        height: isActive ? "280px" : "64px",
        transition: "height 0.55s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
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

      {/* Collapsed row */}
      {!isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
          }}
        >
          <span
            style={{
              color: "#f2ede4",
              fontSize: "0.88rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            {item.title}
          </span>
          <ArrowRight size={14} color="rgba(242,237,228,0.6)" />
        </div>
      )}

      {/* Expanded content */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 20px 24px",
          }}
        >
          <p
            style={{
              color: "#b8943a",
              fontSize: "0.62rem",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            {item.description}
          </p>
          <h3
            style={{
              color: "#f2ede4",
              fontSize: "1.15rem",
              fontWeight: 400,
              marginBottom: "6px",
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              color: "rgba(242,237,228,0.7)",
              fontSize: "0.78rem",
              fontWeight: 300,
              lineHeight: 1.7,
            }}
          >
            {item.detail}
          </p>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: isActive ? "#b8943a" : "transparent",
          transition: "background 0.3s ease",
        }}
      />
    </div>
  );
}
