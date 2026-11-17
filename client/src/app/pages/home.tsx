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
      <section className="bg-[#f5f0e6] px-6 py-12 text-[#1e1a14] sm:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-medium leading-tight text-[#781216]">Northeast India group trips and festival travel</h2>
          <p className="mt-3 max-w-2xl">Explore Arunachal Pradesh, Nagaland, Meghalaya and Assam on a small-group, custom or college trip with Hangover Trails.</p>
          <nav className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#781216]" aria-label="Plan a trip">
            <Link className="underline underline-offset-4" to="/trips">Browse trips</Link>
            <Link className="underline underline-offset-4" to="/festivals">Festival packages</Link>
            <Link className="underline underline-offset-4" to="/custom-trips">Custom trips</Link>
            <Link className="underline underline-offset-4" to="/college-trips">College trips</Link>
            <Link className="underline underline-offset-4" to="/guides">Travel guides</Link>
          </nav>
        </div>
      </section>
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
