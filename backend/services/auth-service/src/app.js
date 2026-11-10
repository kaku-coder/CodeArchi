import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth-service" });
});

app.use("/api/auth", authRoutes);

app.use((err, _req, res, _next) => {
  console.error("Auth service error:", err.message);

  if (err.code === 11000) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status < 500 ? err.message : "An unexpected server error occurred.";
  return res.status(status).json({ message });
});

export default app;