import express from "express";
import env from "./src/core/env/env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/core/errors/errorHandler.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: env.ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(cookieParser());

import authRoutes from "./src/modules/auth/auth.routes.js";

app.use("/api/v1/auth", authRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on ${env.PORT}`);
});
