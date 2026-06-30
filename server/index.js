import express from "express";
import env from "./src/core/env/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./src/core/openapi/openapi.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import tripRoutes from "./src/modules/trip/trip.routes.js";
import { errorHandler } from "./src/core/errors/errorHandler.js";

const app = express();

app.use(express.json());
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

app.listen(env.PORT, () => {
  console.log(`Server running on ${env.PORT}`);
});
