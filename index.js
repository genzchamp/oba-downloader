const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/download", async (req, res) => {

  const url = req.query.url;

  if (!url) {
    return res.json({
      success: false,
      message: "Please provide a URL."
    });
  }

  try {

    // -------------------
    // TikTok
    // -------------------
    if (
      url.includes("tiktok.com") ||
      url.includes("vt.tiktok.com")
    ) {

      const response = await axios.get(
        `https://tikwm.com/api/?url=${encodeURIComponent(url)}`
      );

      return res.json({
        success: true,
        platform: "TikTok",
        data: response.data.data
      });
    }

    // -------------------
    // Instagram (temporary)
    // -------------------
    if (
      url.includes("instagram.com")
    ) {

      return res.json({
        success: false,
        platform: "Instagram",
        message: "Instagram support is coming next..."
      });
    }

    // -------------------
    // Facebook (temporary)
    // -------------------
    if (
      url.includes("facebook.com") ||
      url.includes("fb.watch")
    ) {

      return res.json({
        success: false,
        platform: "Facebook",
        message: "Facebook support is coming soon..."
      });
    }

    // -------------------
    // YouTube (temporary)
    // -------------------
    if (
      url.includes("youtube.com") ||
      url.includes("youtu.be")
    ) {

      return res.json({
        success: false,
        platform: "YouTube",
        message: "YouTube support is coming soon..."
      });
    }

    // -------------------
    // X / Twitter (temporary)
    // -------------------
    if (
      url.includes("twitter.com") ||
      url.includes("x.com")
    ) {

      return res.json({
        success: false,
        platform: "X",
        message: "X support is coming soon..."
      });
    }

    return res.json({
      success: false,
      message: "Unsupported link."
    });

  } catch (err) {

    console.log(err);

    res.json({
      success: false,
      message: "Something went wrong."
    });

  }

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
