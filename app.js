const express = require("express");

const routes = require("./routes");

const logger = require("./middleware/logger");

const config = require("./config");

const app = express();

app.use(express.static("public"));

app.use(logger);

app.use("/", routes);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/api", (req, res) => {
    res.json({
        app: config.APP_NAME,
        version: config.VERSION,
        status: "Online",
        developer: "genzchamp",
        supportedPlatforms: [
            "TikTok",
            "Instagram",
            "Facebook",
            "YouTube",
            "X"
        ],
        live: true
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "404 - Page not found"
    });
});

app.listen(config.PORT, () => {
    console.log(
        `${config.APP_NAME} v${config.VERSION} running on port ${config.PORT}`
    );
});
