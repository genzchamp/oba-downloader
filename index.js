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
  TikTok: ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  Instagram: ["instagram.com"],
  YouTube: ["youtube.com", "youtu.be", "music.youtube.com"],
  Facebook: ["facebook.com", "fb.watch"],
  X: ["x.com", "twitter.com", "t.co"],
  Pinterest: ["pinterest.com", "pin.it"],
  Reddit: ["reddit.com", "redd.it", "v.redd.it"],
  Snapchat: ["snapchat.com"],
  Threads: ["threads.net"]
};

function isHost(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

// Accepts either a bare URL or the full share message copied from a social app.
function extractUrl(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  const candidates = text.match(/https?:\/\/[^\s<>"'\u201c\u201d]+/gi) || [];
  for (const candidate of candidates) {
    const cleaned = candidate.replace(/[)\]}>,.!?;:'"\u2019]+$/g, "");
    try {
      const parsed = new URL(cleaned);
      if (Object.values(HOSTS).flat().some(domain => isHost(parsed.hostname.toLowerCase(), domain))) {
        return parsed.toString();
      }
    } catch {}
  }
  // A user may paste a URL without a scheme.
  const bare = text.match(/(?:www\.|vm\.|vt\.|m\.|lite\.)?(?:tiktok\.com|instagram\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|x\.com|twitter\.com|t\.co|pinterest\.com|pin\.it|reddit\.com|redd\.it|snapchat\.com|threads\.net)\/[^\s<>"']+/i);
  if (bare) {
    const cleaned = bare[0].replace(/[)\]}>,.!?;:'"\u2019]+$/g, "");
    return "https://" + cleaned;
  }
  return "";
}

function identifyPlatform(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { return null; }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  for (const [platform, hosts] of Object.entries(HOSTS)) {
    if (hosts.some(domain => isHost(host, domain))) return platform;
  }
  return null;
}

async function resolveTikTokShare(raw) {
  let current = raw;
  for (let i = 0; i < 6; i++) {
    const parsed = new URL(current);
    if (!isHost(parsed.hostname.toLowerCase(), "tiktok.com")) {
      // TikTok's vm/vt links are subdomains of tiktok.com; reject unexpected redirects.
      throw new Error("The TikTok share link redirected to an unexpected domain. Please paste the full link copied from TikTok Lite.");
    }
    if (!["vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com", "lite.tiktok.com"].some(d => isHost(parsed.hostname.toLowerCase(), d))) return current;
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
  app: "ØBΛ Downloader", version: "2.1.0", status: "online",
  supportedPlatforms: ["TikTok (including supported TikTok Lite share text and links)"],
  plannedPlatforms: ["Instagram", "YouTube", "Facebook", "X", "Pinterest", "Reddit", "Snapchat", "Threads"]
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Stream a resolved TikTok media file as an attachment instead of opening a video tab.
app.get("/file", async (req, res) => {
  const raw = typeof req.query.url === "string" ? req.query.url : "";
  let media;
  try { media = new URL(raw); } catch { return res.status(400).send("Invalid media URL."); }
  const allowedMediaHosts = ["tiktokcdn.com", "tiktokv.com", "byteoversea.com", "ibytedtos.com", "akamaized.net", "tikwm.com"];
  if (media.protocol !== "https:" || !allowedMediaHosts.some(domain => isHost(media.hostname.toLowerCase(), domain))) {
    return res.status(400).send("This media host is not allowed.");
  }
  try {
    const upstream = await axios.get(media.toString(), {
      responseType: "stream", timeout: 25000,
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tiktok.com/" },
      maxRedirects: 3
    });
    const contentType = upstream.headers["content-type"] || "video/mp4";
    if (!contentType.startsWith("video/") && !contentType.includes("octet-stream")) {
      upstream.data.destroy();
      return res.status(502).send("The provider did not return a video file.");
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="oba-tiktok-video.mp4"');
    res.setHeader("Cache-Control", "no-store");
    upstream.data.on("error", () => { if (!res.headersSent) res.status(502); res.end(); });
    upstream.data.pipe(res);
  } catch (error) {
    console.error("Media download failed:", error.message);
    res.status(502).send("Could not start the download. Please try again.");
  }
});

app.get("/download", async (req, res) => {
  const rawInput = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!rawInput || rawInput.length > 4096) return res.status(400).json({ success: false, message: "Paste a video link or the full share message copied from the app." });
  const raw = extractUrl(rawInput);
  if (!raw) return res.status(400).json({ success: false, message: "I couldn't find a social video link in that text. Copy the share message again, or paste the link." });
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
        return res.status(422).json({ success: false, platform, message: "TikTok could not process this link. Try sharing the video again from TikTok Lite." });
      }
      const data = payload.data;
      const mediaUrl = data.play || data.hdplay || data.wmplay || data.url;
      return res.json({
        success: true, platform,
        data: {
          title: data.title || "TikTok video",
          cover: data.cover || data.origin_cover || "",
          videoUrl: mediaUrl || "",
          downloadUrl: mediaUrl ? "/file?url=" + encodeURIComponent(mediaUrl) : ""
        }
      });
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

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/download" || req.path === "/file") return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`ØBΛ Downloader listening on port ${PORT}`));
