const express = require("express");

const router = express.Router();

const { download } = require("../services/downloader");

const validateUrl = require("../middleware/validateUrl");

router.get("/download", validateUrl, async (req, res) => {

    const url = req.query.url;

    if (!url) {

        return res.json({
            success:false,
            message:"Please provide a TikTok URL."
        });

    }

    try{

        const data = await download(url);

res.json({
    success: true,
    platform: data.platform || "TikTok",
    data
});

    }catch(err){

        res.json({
            success:false,
            message:"Failed to download TikTok."
        });

    }

});

module.exports = router;
