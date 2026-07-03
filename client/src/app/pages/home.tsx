import { HeroCarousel } from "../components/hero-carousel";
import { SignatureDestinations } from "../components/signature-destinations";
import { WhyHangover } from "../components/why-hangover";
import { FestivalVideo } from "../components/festival-video";
import { TripTypes } from "../components/trip-types";
import { OurFootprints } from "../components/our-footprints";
import { Testimonials } from "../components/testimonials";
import { TravelStories } from "../components/travel-stories";
import { OurJourney } from "../components/our-journey";
import { SiteFooter } from "../components/site-footer";

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <SignatureDestinations />
      <WhyHangover />
      <FestivalVideo />
      <TripTypes />
      <OurFootprints />
      <Testimonials />
      {/* <TravelStories /> */}
      <OurJourney />
      <SiteFooter />
    </>
  );
}
