const express = require("express");

const tiktokRoute = require("./routes/tiktok");

const instagramRoute = require("./routes/instagram");

const app = express();

app.use(express.static("public"));

app.use("/", tiktokRoute);

app.use("/", instagramRoute);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ØBΛ Downloader running on port ${PORT}`);
});
