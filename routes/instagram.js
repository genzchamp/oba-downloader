const express = require("express");

const router = express.Router();

const { downloadInstagram } = require("../services/instagram");

router.get("/instagram", async (req, res) => {

    const url = req.query.url;

    if (!url) {
        return res.json({
            success: false,
            message: "Please provide an Instagram URL."
        });
    }

    const data = await downloadInstagram(url);

    res.json(data);

});

module.exports = router;
