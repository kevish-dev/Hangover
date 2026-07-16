import express from "express";
import env from "./src/core/env/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./src/core/openapi/openapi.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import tripRoutes from "./src/modules/trip/trip.routes.js";
import festivalRoutes from "./src/modules/festival/festival.routes.js";
import itineraryRoutes from "./src/modules/itinerary/itinerary.routes.js";
import userRoutes from "./src/modules/user/user.routes.js";
import bookingRoutes from "./src/modules/booking/booking.routes.js";
import tripTagRoutes from "./src/modules/trip-tag/trip-tag.routes.js";
import inquiryRoutes from "./src/modules/inquiry/inquiry.routes.js";
import paymentRoutes from "./src/modules/payment/payment.routes.js";
import destinationRoutes from "./src/modules/destination/destination.routes.js";
import reviewRoutes from "./src/modules/review/review.routes.js";
import landingReasonRoutes from "./src/modules/landing-reason/landing-reason.routes.js";
import landingTripTypeRoutes from "./src/modules/landing-trip-type/landing-trip-type.routes.js";
import landingContentRoutes from "./src/modules/landing-content/landing-content.routes.js";
import crmRoutes from "./src/modules/crm/crm.routes.js";
import operationsRoutes from "./src/modules/operations/operations.routes.js";
import { errorHandler } from "./src/core/errors/errorHandler.js";
import { prisma } from "./src/prisma/client.js";
const app = express();

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


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/festivals", festivalRoutes);
app.use("/api/v1/itineraries", itineraryRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/trip-tags", tripTagRoutes);
app.use("/api/v1/inquiries", inquiryRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/destinations", destinationRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/landing-reasons", landingReasonRoutes);
app.use("/api/v1/landing-trip-types", landingTripTypeRoutes);
app.use("/api/v1/landing-content", landingContentRoutes);
app.use("/api/v1/crm", crmRoutes);
app.use("/api/v1/crm/operations", operationsRoutes);

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
