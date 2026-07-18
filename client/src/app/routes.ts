import { createBrowserRouter, redirect } from "react-router";
import Root from "./root";
import Home from "./pages/home";
import TripsPage from "./pages/trips";
import TripDetail from "./pages/trip-detail";
import FestivalsPage from "./pages/festivals";
import BookingPage from "./pages/booking";
import AboutPage from "./pages/about";
import PayBalancePage from "./pages/pay-balance";
import AdminDashboardRedirect from "./pages/admin/dashboard";
import AdminLayout from "./pages/admin/layout";
import AdminTripsPage from "./pages/admin/trips";
import AdminDestinationsPage from "./pages/admin/destinations";
import AdminPaymentsPage from "./pages/admin/payments";
import AdminBookingsPage from "./pages/admin/bookings";
import ProfilePage from "./pages/profile";
import AdminInquiriesPage from "./pages/admin/inquiries";
import AdminFestivalsPage from "./pages/admin/festivals";
import ReviewSubmitPage from "./pages/review-submit";
import AdminReviewsPage from "./pages/admin/reviews";
import AdminLandingPage from "./pages/admin/landing-page";
import AdminCustomTripsPage from "./pages/admin/custom-trips";
import CustomTripOfferPage from "./pages/custom-trip-offer";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "trips", Component: TripsPage },
      { path: "trips/:slug", Component: TripDetail },
      { path: "festivals", Component: FestivalsPage },
      { path: "festivals/:slug", Component: TripDetail },
      { path: "book/:slug", Component: BookingPage },
      { path: "bookings/:bookingId/pay-balance", Component: PayBalancePage },
      { path: "bookings/:bookingId/review", Component: ReviewSubmitPage },
      { path: "about", Component: AboutPage },
      { path: "profile", Component: ProfilePage },
      { path: "custom-trip/:token", Component: CustomTripOfferPage },
    ],
  },
  {
    path: "/dashboard",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboardRedirect },
      { path: "operations", Component: AdminOperationsPage },
      { path: "trips", Component: AdminTripsPage },
      { path: "custom-trips", Component: AdminCustomTripsPage },
      { path: "festivals", Component: AdminFestivalsPage },
      { path: "destinations", Component: AdminDestinationsPage },
      { path: "bookings", Component: AdminBookingsPage },
      { path: "payments", Component: AdminPaymentsPage },
      { path: "inquiries", Component: AdminInquiriesPage },
      { path: "reviews", Component: AdminReviewsPage },
      { path: "landing-page", Component: AdminLandingPage },
    ],
  },
  {
    path: "*",
    loader: () => redirect("/trips"),
  },
]);
