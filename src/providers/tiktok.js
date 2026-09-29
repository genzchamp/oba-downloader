const axios = require("axios");

const TIKWM_ENDPOINT = "https://tikwm.com/api/";

function normalizeResult(payload) {
  const data = payload && payload.data ? payload.data : null;

  if (!data || typeof data !== "object") {
    throw new Error("TikTok provider returned no usable data");
  }

  const play = data.play || data.hdplay || data.wmplay || null;
  if (!play) {
    throw new Error("TikTok provider returned no video URL");
  }

  return {
    title: data.title || "TikTok video",
    thumbnail: data.cover || data.origin_cover || data.thumbnail || null,
    play,
    hdplay: data.hdplay || null,
    author: {
      nickname: data.author && data.author.nickname ? data.author.nickname : "Unknown creator",
      unique_id: data.author && data.author.unique_id ? data.author.unique_id : null
    },
    music: data.music || null
  };
}

async function download(url) {
  const response = await axios.get(TIKWM_ENDPOINT, {
    params: { url },
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.data || response.data.code !== 0) {
    throw new Error(
      response.data && response.data.msg
        ? response.data.msg
        : "TikTok provider request failed"
    );
  }

  return normalizeResult(response.data);
}

module.exports = { download };
