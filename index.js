require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { download } = require("./src/providers/tiktok");
const { validateUrl } = require("./src/utils/validation");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "OPTIONS"]
}));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("combined"));
app.use(express.static("public"));

const rateWindowMs = 60 * 1000;
const maxRequests = Number(process.env.RATE_LIMIT_MAX) || 30;
const rateStore = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || "unknown";
  const current = rateStore.get(key);

  if (!current || now - current.startedAt >= rateWindowMs) {
    rateStore.set(key, { startedAt: now, count: 1 });
    return next();
  }

  current.count += 1;

  if (current.count > maxRequests) {
    const retryAfter = Math.ceil((rateWindowMs - (now - current.startedAt)) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again shortly."
    });
  }

  return next();
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/api", (req, res) => {
  res.json({
    app: "ØBΛ Downloader",
    version: "2.0.0",
    status: "online",
    supportedPlatforms: ["TikTok"],
    endpoints: {
      download: "/download?url=YOUR_TIKTOK_URL"
    }
  });
});

app.get("/download", rateLimit, async (req, res) => {
  const validation = validateUrl(req.query.url);

  if (!validation.ok) {
    return res.status(400).json({
      success: false,
      message: validation.message
    });
  }

  try {
    const data = await download(validation.url);

    return res.json({
      success: true,
      platform: validation.platform,
      data
    });
  } catch (error) {
    console.error("Download error:", error.message);

    return res.status(502).json({
      success: false,
      platform: validation.platform,
      message: "The video could not be fetched right now. Please try again."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

app.listen(port, () => {
  console.log("ØBΛ Downloader API running on port " + port);
});
