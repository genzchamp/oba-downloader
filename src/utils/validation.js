const { URL } = require("url");

const SUPPORTED_HOSTS = {
  TikTok: new Set([
    "tiktok.com",
    "www.tiktok.com",
    "m.tiktok.com",
    "vt.tiktok.com",
    "vm.tiktok.com"
  ])
};

function getPlatform(rawUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return null;

  const hostname = parsed.hostname.toLowerCase();

  for (const [platform, hosts] of Object.entries(SUPPORTED_HOSTS)) {
    if (hosts.has(hostname)) return platform;
  }

  return null;
}

function validateUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { ok: false, message: "Please provide a URL." };
  }

  if (rawUrl.length > 2048) {
    return { ok: false, message: "URL is too long." };
  }

  const platform = getPlatform(rawUrl.trim());

  if (!platform) {
    return {
      ok: false,
      message: "Unsupported link. TikTok links are currently supported."
    };
  }

  return { ok: true, platform, url: rawUrl.trim() };
}

module.exports = { getPlatform, validateUrl };
