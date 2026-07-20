import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import axios from "axios";
import { mediaImageUrl } from "../../lib/media";
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSliderContext,
} from "./animated-slideshow";

interface SignatureTrip {
  id: string;
  title: string;
  slug: string;
  overview: string;
  location: string;
  duration: number;
  bannerImages: string[];
  packages?: any[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

function formatPrice(price: string | number) {
  const value = Number(price);
  return Number.isFinite(value) ? `From Rs. ${value.toLocaleString("en-IN")}` : "Price on request";
}

export function SignatureDestinations() {
  const [trips, setTrips] = useState<SignatureTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchSignatureTrips = async () => {
      try {
        const response = await axios.get(`${API_URL}/trips/signature-collection`, {
          withCredentials: true,
        });
        const data = response.data?.result?.data;
        if (!cancelled && Array.isArray(data)) setTrips(data);
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSignatureTrips();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && trips.length === 0) return null;

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
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(2.5rem, 5vw, 5rem)",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
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
            className="hidden md:block"
            style={{
              color: "rgba(30,26,20,0.55)",
              fontSize: "0.75rem",
              fontWeight: 300,
              letterSpacing: "0.04em",
              maxWidth: "180px",
              textAlign: "right",
              lineHeight: 1.9,
            }}
          >
            Explore a destination
            <br />
            to see where it takes you.
          </p>
        </div>

        {isLoading ? (
          <div className="h-72 animate-pulse bg-black/5" />
        ) : (
          <div className="flex flex-col lg:flex-row items-start" style={{ gap: "0" }}>
            <div style={{ flex: 1 }} className="lg:pr-16 w-full">
              {trips.map((trip, index) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: index < trips.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
                    padding: "clamp(14px, 4vw, 18px) 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    cursor: "pointer",
                    background: "transparent",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 4vw, 20px)", minWidth: 0 }}>
                    <span style={{ color: "rgba(30,26,20,0.42)", fontSize: "0.62rem", fontWeight: 400, letterSpacing: "0.15em", minWidth: "22px" }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <TextStaggerHover
                        text={trip.title}
                        index={index}
                        style={{
                          color: "rgba(30,26,20,0.85)",
                          fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
                          fontWeight: 300,
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                          display: "block",
                          fontFamily: "'Poppins', sans-serif",
                          overflowWrap: "anywhere",
                        }}
                      />
                      <span style={{ display: "block", color: "rgba(30,26,20,0.55)", fontSize: "0.68rem", fontWeight: 400, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "5px" }}>
                        {trip.location}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }} className="hidden sm:block">
                    <span style={{ display: "block", color: "#b8943a", fontSize: "0.82rem", fontWeight: 500 }}>
                      {formatPrice(trip.packages?.[0]?.price || 0)}
                    </span>
                    <span style={{ display: "block", color: "rgba(30,26,20,0.55)", fontSize: "0.65rem", fontWeight: 400, letterSpacing: "0.08em", marginTop: "3px" }}>
                      {trip.duration} {trip.duration === 1 ? "night" : "nights"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-5/12 lg:sticky lg:top-24 self-start mt-10 lg:mt-0 overflow-hidden" style={{ aspectRatio: "4/3", minHeight: "240px" }}>
              <HoverSliderImageWrap style={{ width: "100%", height: "100%" }}>
                {trips.map((trip, index) => (
                  <HoverSliderImage
                    key={trip.id}
                    index={index}
                    imageUrl={trip.bannerImages?.[0] || ""}
                    src={mediaImageUrl(trip.bannerImages?.[0] || "", { width: 1280, fit: "fit" })}
                    alt={trip.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                ))}
              </HoverSliderImageWrap>
              <div style={{ position: "absolute", top: 0, left: 0, width: "40px", height: "40px", borderTop: "1.5px solid #b8943a", borderLeft: "1.5px solid #b8943a", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "40px", height: "40px", borderBottom: "1.5px solid #b8943a", borderRight: "1.5px solid #b8943a", pointerEvents: "none" }} />
              <ActiveCaption trips={trips} />
            </div>
          </div>
        )}
      </HoverSlider>
    </section>
  );
}

function ActiveCaption({ trips }: { trips: SignatureTrip[] }) {
  const { activeSlide } = useHoverSliderContext();
  const active = trips[activeSlide];
  if (!active) return null;

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 24px", background: "linear-gradient(to top, rgba(235,228,215,0.95) 0%, transparent 100%)", pointerEvents: "none" }}>
      <AnimatePresence mode="wait">
        <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4, ease: "easeOut" }}>
          <p style={{ color: "#b8943a", fontSize: "0.62rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px", fontFamily: "'Poppins', sans-serif" }}>
            {active.location}
          </p>
          {active.overview && (
            <p style={{ color: "rgba(30,26,20,0.82)", fontSize: "0.88rem", fontWeight: 300, fontStyle: "italic", fontFamily: "'Poppins', sans-serif", letterSpacing: "0.01em" }}>
              {active.overview}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
