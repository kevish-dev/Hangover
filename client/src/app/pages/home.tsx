import { TrackRecord } from "../components/track-record";
import { HeroCarousel } from "../components/hero-carousel";
import { SignatureDestinations } from "../components/signature-destinations";
import { WhyHangover } from "../components/why-hangover";
import { FestivalVideo } from "../components/festival-video";
import { TripTypes } from "../components/trip-types";
import { OurFootprints } from "../components/our-footprints";
import { Testimonials } from "../components/testimonials";
import { OurJourney } from "../components/our-journey";
import { SiteFooter } from "../components/site-footer";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <SignatureDestinations />
      <WhyHangover />
      <FestivalVideo />
      <TripTypes />
      <TrackRecord />
      <OurFootprints />
      <Testimonials />
      <OurJourney />
      <SiteFooter />
      <Link
        to="/trips"
        aria-label="Book now and browse trips"
        className="mobile-home-booking-cta md:hidden"
        style={{
          position: "fixed",
          left: "auto",
          right: "8px",
          bottom: "max(8px, env(safe-area-inset-bottom))",
          zIndex: 80,
          minHeight: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          padding: "0 16px",
          background: "#781216",
          color: "#ffffff",
          boxShadow: "0 12px 28px rgba(44, 8, 10, 0.32)",
          fontFamily: "'Poppins', sans-serif",
          fontSize: "0.68rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        Book Now <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <style>{`
        @media (min-width: 768px) {
          .mobile-home-booking-cta {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
