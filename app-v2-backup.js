const express = require("express");

const tiktokRoute = require("./routes/tiktok");

const app = express();

app.use(express.static("public"));

app.use("/", tiktokRoute);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ØBΛ Downloader running on port ${PORT}`);
});
