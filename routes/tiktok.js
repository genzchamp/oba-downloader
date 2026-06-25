const express = require("express");

const router = express.Router();

const { downloadTikTok } = require("../services/tiktok");

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

        const data = await downloadTikTok(url);

        res.json({
            success:true,
            platform:"TikTok",
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
