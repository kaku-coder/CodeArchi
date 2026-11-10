import { Router } from "express";

const router = Router();

router.use("/auth", async (req, res, next) => {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
    const upstreamUrl = new URL(req.originalUrl, authServiceUrl);
    const headers = {
      accept: req.get("accept") || "application/json"
    };

    if (req.get("content-type")) {
      headers["content-type"] = req.get("content-type");
    }
    if (req.get("cookie")) {
      headers.cookie = req.get("cookie");
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      ...(hasBody ? { body: JSON.stringify(req.body ?? {}) } : {})
    });

    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) res.set("content-type", contentType);

    const cookies = upstreamResponse.headers.getSetCookie();
    if (cookies.length > 0) res.set("set-cookie", cookies);

    res.send(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    next(error);
  }
});

export default router;
