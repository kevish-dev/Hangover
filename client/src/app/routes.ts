import { createBrowserRouter } from "react-router";
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
import AdminInquiriesPage from "./pages/admin/inquiries";


export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "trips", Component: TripsPage },
      { path: "trips/:slug", Component: TripDetail },
      { path: "festivals", Component: FestivalsPage },
      { path: "book/:slug", Component: BookingPage },
      { path: "bookings/:bookingId/pay-balance", Component: PayBalancePage },
      { path: "about", Component: AboutPage },
    ],
  },
  {
    path: "/dashboard",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboardRedirect },
      { path: "trips", Component: AdminTripsPage },
      { path: "destinations", Component: AdminDestinationsPage },
      { path: "bookings", Component: AdminBookingsPage },
      { path: "payments", Component: AdminPaymentsPage },
      { path: "inquiries", Component: AdminInquiriesPage },

    ],
  },
]);
