import { motion, AnimatePresence } from "motion/react";
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSliderContext,
} from "./animated-slideshow";

const SIGNATURES = [
  {
    id: "maldives",
    name: "Maldives",
    region: "Indian Ocean",
    tagline: "Floating above paradise",
    duration: "7 Nights",
    price: "From ₹1,85,000",
    imageUrl:
      "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=900&h=680&fit=crop&auto=format&q=90",
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    region: "India",
    tagline: "Where royalty never left",
    duration: "10 Nights",
    price: "From ₹68,000",
    imageUrl:
      "https://images.unsplash.com/photo-1772976455832-9d6b078ac401?w=900&h=680&fit=crop&auto=format&q=90",
  },
  {
    id: "iceland",
    name: "Iceland",
    region: "North Atlantic",
    tagline: "Chasing lights at the edge of the world",
    duration: "8 Nights",
    price: "From ₹2,20,000",
    imageUrl:
      "https://images.unsplash.com/photo-1488415032361-b7e238421f1b?w=900&h=680&fit=crop&auto=format&q=90",
  },
  {
    id: "bali",
    name: "Bali",
    region: "Indonesia",
    tagline: "Spirit, stone and sacred silence",
    duration: "6 Nights",
    price: "From ₹72,000",
    imageUrl:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=900&h=680&fit=crop&auto=format&q=90",
  },
  {
    id: "morocco",
    name: "Sahara Morocco",
    region: "North Africa",
    tagline: "A thousand dunes, one horizon",
    duration: "9 Nights",
    price: "From ₹1,10,000",
    imageUrl:
      "https://images.unsplash.com/photo-1508513268030-f8a9af25721c?w=900&h=680&fit=crop&auto=format&q=90",
  },
  {
    id: "newzealand",
    name: "New Zealand",
    region: "South Pacific",
    tagline: "Fjords carved by ancient giants",
    duration: "12 Nights",
    price: "From ₹2,95,000",
    imageUrl:
      "https://images.unsplash.com/photo-1466446105453-d151af699ac7?w=900&h=680&fit=crop&auto=format&q=90",
  },
];

export function SignatureDestinations() {
  return (
    <section
      style={{
        background: "#f5f0e6",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <HoverSlider
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(3rem, 6vw, 8rem) clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(2.5rem, 5vw, 5rem)",
          }}
        >
          <div>
            <p
              style={{
                color: "#b8943a",
                fontSize: "0.7rem",
                fontWeight: 500,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              / Signature Collection
            </p>
            <h2
              style={{
                color: "#1e1a14",
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              You leave but
              <br />
              <em style={{ color: "#b8943a", fontStyle: "italic" }}>the Hangover stays.</em>
            </h2>
          </div>
          <p
            style={{
              color: "rgba(30,26,20,0.55)",
              fontSize: "0.75rem",
              fontWeight: 300,
              letterSpacing: "0.04em",
              maxWidth: "180px",
              textAlign: "right",
              lineHeight: 1.9,
            }}
            className="hidden md:block"
          >
            Hover a destination
            <br />
            to see where it takes you.
          </p>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row items-start" style={{ gap: "0" }}>
          {/* Left: list */}
          <div style={{ flex: 1 }} className="lg:pr-16">
            {SIGNATURES.map((dest, index) => (
              <div
                key={dest.id}
                style={{
                  borderBottom:
                    index < SIGNATURES.length - 1
                      ? "1px solid rgba(0,0,0,0.07)"
                      : "none",
                  padding: "18px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                {/* Index + name */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <span
                    style={{
                      color: "rgba(30,26,20,0.42)",
                      fontSize: "0.62rem",
                      fontWeight: 400,
                      letterSpacing: "0.15em",
                      minWidth: "22px",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <TextStaggerHover
                      text={dest.name}
                      index={index}
                      style={{
                        color: "rgba(30,26,20,0.85)",
                        fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
                        fontWeight: 300,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        display: "block",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    />
                    <span
                      style={{
                        display: "block",
                        color: "rgba(30,26,20,0.55)",
                        fontSize: "0.68rem",
                        fontWeight: 400,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        marginTop: "5px",
                      }}
                    >
                      {dest.region}
                    </span>
                  </div>
                </div>

                {/* Right meta */}
                <div style={{ textAlign: "right" }} className="hidden sm:block">
                  <span
                    style={{
                      display: "block",
                      color: "#b8943a",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                    }}
                  >
                    {dest.price}
                  </span>
                  <span
                    style={{
                      display: "block",
                      color: "rgba(30,26,20,0.55)",
                      fontSize: "0.65rem",
                      fontWeight: 400,
                      letterSpacing: "0.08em",
                      marginTop: "3px",
                    }}
                  >
                    {dest.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: sticky image */}
          <div
            className="w-full lg:w-5/12 sticky top-24 self-start mt-12 lg:mt-0"
            style={{ aspectRatio: "4/3", position: "relative" }}
          >
            <HoverSliderImageWrap style={{ width: "100%", height: "100%" }}>
              {SIGNATURES.map((dest, index) => (
                <HoverSliderImage
                  key={dest.id}
                  index={index}
                  imageUrl={dest.imageUrl}
                  src={dest.imageUrl}
                  alt={dest.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                />
              ))}
            </HoverSliderImageWrap>

            {/* Gold corner accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "40px",
                height: "40px",
                borderTop: "1.5px solid #b8943a",
                borderLeft: "1.5px solid #b8943a",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "40px",
                height: "40px",
                borderBottom: "1.5px solid #b8943a",
                borderRight: "1.5px solid #b8943a",
                pointerEvents: "none",
              }}
            />

            {/* Caption overlay */}
            <ActiveCaption destinations={SIGNATURES} />
          </div>
        </div>
      </HoverSlider>
    </section>
  );
}

function ActiveCaption({ destinations }: { destinations: typeof SIGNATURES }) {
  const { activeSlide } = useHoverSliderContext();
  const active = destinations[activeSlide];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "40px 24px 24px",
        background: "linear-gradient(to top, rgba(235,228,215,0.95) 0%, transparent 100%)",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p
            style={{
              color: "#b8943a",
              fontSize: "0.62rem",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "4px",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {active.region}
          </p>
          <p
            style={{
              color: "rgba(30,26,20,0.82)",
              fontSize: "0.88rem",
              fontWeight: 300,
              fontStyle: "italic",
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            "{active.tagline}"
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
