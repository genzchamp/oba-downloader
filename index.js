const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

const HOSTS = {
  TikTok: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  Instagram: ["instagram.com", "www.instagram.com"],
  YouTube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"],
  Facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  X: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "t.co"],
  Pinterest: ["pinterest.com", "www.pinterest.com", "pin.it"],
  Reddit: ["reddit.com", "www.reddit.com", "redd.it", "v.redd.it"],
  Snapchat: ["snapchat.com", "www.snapchat.com"],
  Threads: ["threads.net", "www.threads.net"]
};

function identifyPlatform(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { return null; }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  for (const [platform, hosts] of Object.entries(HOSTS)) {
    if (hosts.some(domain => host === domain || host.endsWith("." + domain))) return platform;
  }
  return null;
}

async function resolveTikTokShare(raw) {
  let current = raw;
  for (let i = 0; i < 6; i++) {
    const parsed = new URL(current);
    if (!["tiktok.com"].some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d))) {
      throw new Error("The TikTok share link redirected to an unexpected domain. Please paste the full link copied from TikTok Lite.");
    }
    if (!["vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com"].some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d))) return current;
    const response = await axios.get(current, {
      maxRedirects: 0, timeout: 8000, validateStatus: s => s >= 200 && s < 400,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36" }
    });
    const location = response.headers.location;
    if (!location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

app.get("/api", (_req, res) => res.json({
  app: "ØBΛ Downloader", version: "2.0.0", status: "online",
  supportedPlatforms: ["TikTok (including supported short links)"],
  plannedPlatforms: ["Instagram", "YouTube", "Facebook", "X", "Pinterest", "Reddit", "Snapchat", "Threads"],
  note: "Other platform integrations must be enabled and tested before being advertised as available."
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/download", async (req, res) => {
  const raw = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!raw || raw.length > 2048) return res.status(400).json({ success: false, message: "Paste a valid video link (maximum 2,048 characters)." });

  const platform = identifyPlatform(raw);
  if (!platform) return res.status(400).json({ success: false, message: "That link is not from a supported social platform. Please check the copied URL." });

  try {
    if (platform === "TikTok") {
      const resolved = await resolveTikTokShare(raw);
      const response = await axios.get("https://tikwm.com/api/", {
        params: { url: resolved }, timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const payload = response.data;
      if (!payload || payload.code !== 0 || !payload.data) {
        return res.status(422).json({ success: false, platform, message: "TikTok could not process this link. Try copying the link again from TikTok Lite, or use the original TikTok share link." });
      }
      return res.json({ success: true, platform, data: payload.data });
    }

    const guidance = {
      Instagram: "Instagram downloading is not enabled yet. Only public content that you have permission to save will be supported.",
      YouTube: "YouTube downloading is not enabled yet. Use YouTube's official download/offline options where available, or download content you own through YouTube Studio.",
      Facebook: "Facebook downloading is not enabled yet. Make sure you have permission to save the content.",
      X: "X downloading is not enabled yet. Make sure you have permission to save the content.",
      Pinterest: "Pinterest downloading is not enabled yet.",
      Reddit: "Reddit downloading is not enabled yet.",
      Snapchat: "Snapchat downloading is not enabled yet. Private or disappearing content will not be accessed.",
      Threads: "Threads downloading is not enabled yet."
    };
    return res.status(501).json({ success: false, platform, message: guidance[platform] || "This platform is not enabled yet." });
  } catch (error) {
    console.error("Download request failed:", error.message);
    return res.status(502).json({ success: false, platform, message: error.message.includes("unexpected domain") ? error.message : "The platform or downloader service could not process this link right now. Please try again shortly." });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/download") return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`ØBΛ Downloader listening on port ${PORT}`));
