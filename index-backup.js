const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.send("TikTok Downloader API 🚀");
});

app.get("/download", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "Please provide TikTok URL"
    });
  }

  try {
    const response = await axios.get(
      `https://tikwm.com/api/?url=${url}`
    );

    res.json({
      success: true,
      data: response.data.data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch TikTok video"
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
