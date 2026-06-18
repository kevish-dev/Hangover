import express from "express";
import env from "./src/core/env/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiReference } from "@scalar/express-api-reference";

import { router as authRouter } from "./src/modules/auth/auth.routes.js";
import { errorHandler } from "./src/core/errors/errorHandler.js";
import { generateOpenApiSpec } from "./src/core/docs/openApi.js";
import { startEmailWorker } from "./src/core/queue/workers/emailWorker.js";

const app = express();

// Start background workers
startEmailWorker();

app.use(express.json());

app.use(
  cors({
    origin: env.ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(cookieParser());

// API Routes
app.use("/api/v1/auth", authRouter);

// OpenAPI Documentation
app.get('/docs/openapi.json', (req, res) => {
  res.json(generateOpenApiSpec());
});

app.use(
  '/docs',
  apiReference({
    spec: {
      url: '/docs/openapi.json',
    },
  })
);

// Global Error Handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`API Documentation available at http://localhost:${env.PORT}/docs`);
});
