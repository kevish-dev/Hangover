import { createBrowserRouter } from "react-router";
import Root from "./root";
import Home from "./pages/home";
import TripsPage from "./pages/trips";
import TripDetail from "./pages/trip-detail";
import FestivalsPage from "./pages/festivals";
import BookingPage from "./pages/booking";
import AboutPage from "./pages/about";

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
      { path: "about", Component: AboutPage },
    ],
  },
]);
