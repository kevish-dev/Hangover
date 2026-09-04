import { createBrowserRouter, redirect } from "react-router";
import type { ComponentType } from "react";
import Root from "./root";
import { RouteErrorBoundary } from "./components/route-error-boundary";

const lazyPage = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/home")) },
      { path: "trips", lazy: lazyPage(() => import("./pages/trips")) },
      { path: "trips/:slug", lazy: lazyPage(() => import("./pages/trip-detail")) },
      { path: "festivals", lazy: lazyPage(() => import("./pages/festivals")) },
      { path: "festivals/:slug", lazy: lazyPage(() => import("./pages/trip-detail")) },
      { path: "book/:slug", lazy: lazyPage(() => import("./pages/booking")) },
      { path: "bookings/:bookingId/pay-balance", lazy: lazyPage(() => import("./pages/pay-balance")) },
      { path: "bookings/:bookingId/review", lazy: lazyPage(() => import("./pages/review-submit")) },
      { path: "about", lazy: lazyPage(() => import("./pages/about")) },
      { path: "profile", lazy: lazyPage(() => import("./pages/profile")) },
    ],
  },
  {
    path: "/dashboard",
    lazy: lazyPage(() => import("./pages/admin/layout")),
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/admin/dashboard")) },
      { path: "analytics", lazy: lazyPage(() => import("./pages/admin/analytics")) },
      { path: "destinations", lazy: lazyPage(() => import("./pages/admin/destinations")) },
      { path: "crm-master-data", lazy: lazyPage(() => import("./pages/admin/crm-master-data")) },
      { path: "users", lazy: lazyPage(() => import("./pages/admin/users")) },
      { path: "crm-trips", lazy: lazyPage(() => import("./pages/admin/crm-trips")) },
      { path: "crm-trips/:tripId/bookings/:bookingId", lazy: lazyPage(() => import("./pages/admin/crm-booking-detail")) },
      { path: "crm-trips/:id", lazy: lazyPage(() => import("./pages/admin/crm-trip-detail")) },
      { path: "crm-festivals", lazy: lazyPage(() => import("./pages/admin/crm-festivals")) },
      { path: "crm-festivals/:festivalId/bookings/:bookingId", lazy: lazyPage(() => import("./pages/admin/crm-booking-detail")) },
      { path: "crm-festivals/:id", lazy: lazyPage(() => import("./pages/admin/crm-festival-detail")) },
      { path: "interest", lazy: lazyPage(() => import("./pages/admin/interest")) },
      { path: "festivals", lazy: lazyPage(() => import("./pages/admin/festivals")) },
      { path: "festivals/:id", lazy: lazyPage(() => import("./pages/admin/festival-detail")) },
      { path: "bookings", lazy: lazyPage(() => import("./pages/admin/bookings")) },
      { path: "bookings/:id", lazy: lazyPage(() => import("./pages/admin/booking-detail")) },
      { path: "operations", lazy: lazyPage(() => import("./pages/admin/operations")) },
      { path: "ledger", lazy: lazyPage(() => import("./pages/admin/ledger")) },
      { path: "payments", lazy: lazyPage(() => import("./pages/admin/payments")) },
      { path: "reviews", lazy: lazyPage(() => import("./pages/admin/reviews")) },
      { path: "invoices", lazy: lazyPage(() => import("./pages/admin/invoices")) },
      { path: "landing", lazy: lazyPage(() => import("./pages/admin/landing-page")) },
    ],
  },
  {
    path: "*",
    loader: () => redirect("/"),
  },
]);
