import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";


const app = express();

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use("/api", authRoutes);

app.use((err, _req, res, _next) => {
  const status = Number.isInteger(err.status) && err.status < 500 ? err.status : 502;
  if (status === 502) console.error("API Gateway error:", err.message);
  res.status(status).json({
    message: status === 502 ? "Auth service is unavailable." : err.message
  });
});

export default app;
