import express from "express";
import env from "./src/core/env/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./src/core/openapi/openapi.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import festivalRoutes from "./src/modules/festival/festival.routes.js";
import itineraryRoutes from "./src/modules/itinerary/itinerary.routes.js";
import userRoutes from "./src/modules/user/user.routes.js";
import bookingRoutes from "./src/modules/booking/booking.routes.js";
import tripTagRoutes from "./src/modules/trip-tag/trip-tag.routes.js";
import inquiryRoutes from "./src/modules/inquiry/inquiry.routes.js";
import paymentRoutes from "./src/modules/payment/payment.routes.js";
import destinationRoutes from "./src/modules/destination/destination.routes.js";
import placeRoutes from "./src/modules/place/place.routes.js";
import stayLocationRoutes from "./src/modules/stay-location/stay-location.routes.js";
import propertyRoutes from "./src/modules/property/property.routes.js";
import transferLocationRoutes from "./src/modules/transfer-location/transfer-location.routes.js";
import crmTripRoutes from "./src/modules/crm-trip/crm-trip.routes.js";
import crmFestivalRoutes from "./src/modules/crm-festival/crm-festival.routes.js";
import crmDestinationRoutes from "./src/modules/crm-destination/crm-destination.routes.js";
import reviewRoutes from "./src/modules/review/review.routes.js";
import landingReasonRoutes from "./src/modules/landing-reason/landing-reason.routes.js";
import landingTripTypeRoutes from "./src/modules/landing-trip-type/landing-trip-type.routes.js";
import landingContentRoutes from "./src/modules/landing-content/landing-content.routes.js";
import ledgerRoutes from "./src/modules/ledger/ledger.routes.js";
import operationsRoutes from "./src/modules/operations/operations.routes.js";
import invoiceRoutes from "./src/modules/invoice/invoice.routes.js";
import analyticsRoutes from "./src/modules/analytics/analytics.routes.js";
import siteSettingsRoutes from "./src/modules/site-settings/site-settings.routes.js";
import interestRoutes from "./src/modules/interest/interest.routes.js";
import notificationRoutes from "./src/modules/notification/notification.routes.js";
import { errorHandler } from "./src/core/errors/errorHandler.js";
import { prisma } from "./src/prisma/client.js";
import { startOperationsWorker } from "./src/workers/operations.worker.js";
import { optionalAuth } from "./src/core/middlewares/auth.middleware.js";
import { blockCustomerWritesDuringMaintenance } from "./src/core/middlewares/maintenance.middleware.js";
const app = express();

// Unauthenticated health check endpoint
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "healthy",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
    });
  }
});

// Raw body parser for Razorpay webhook (must be before express.json)
app.use((req, res, next) => {
  if (req.path === "/api/v1/payments/webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "50mb" })(req, res, next);
  }
});
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: env.ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(cookieParser());

// Resolve an existing session once so maintenance mode can exempt administrators
// before any customer-facing route handles a write request.
app.use("/api/v1", optionalAuth, blockCustomerWritesDuringMaintenance);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/site-settings", siteSettingsRoutes);
app.use("/api/v1/festivals", festivalRoutes);
app.use("/api/v1/itineraries", itineraryRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/trip-tags", tripTagRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/destinations", destinationRoutes);
app.use("/api/v1/places", placeRoutes);
app.use("/api/v1/stay-locations", stayLocationRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/transfer-locations", transferLocationRoutes);
app.use("/api/v1/crm-trips", crmTripRoutes);
app.use("/api/v1/crm-festivals", crmFestivalRoutes);
app.use("/api/v1/crm-destinations", crmDestinationRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/landing-reasons", landingReasonRoutes);
app.use("/api/v1/landing-trip-types", landingTripTypeRoutes);
app.use("/api/v1/landing-content", landingContentRoutes);
app.use("/api/v1/ledgers", ledgerRoutes);
app.use("/api/v1/operations", operationsRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/interests", interestRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.get("/openapi.json", (req, res) => {
  res.json(generateOpenApiDocument());
});

app.use(
  "/reference",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
  }),
);

app.use(errorHandler);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to database successfully");

    startOperationsWorker();

    app.listen(env.PORT, () => {
      console.log(`Server running on ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();

// Check cd
