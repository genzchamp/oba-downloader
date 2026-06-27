const express = require("express");

const router = express.Router();

const tiktokRoute = require("./tiktok");
const instagramRoute = require("./instagram");

router.use("/", tiktokRoute);
router.use("/", instagramRoute);

module.exports = router;
