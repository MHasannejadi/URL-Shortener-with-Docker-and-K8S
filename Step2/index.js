require("dotenv").config();
const express = require("express");
const redis = require("redis");
const axios = require("axios");
const multer = require("multer");
const os = require("os");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const localIP = "127.0.0.1";
const port = process.env.PORT || 3000;
const hostname = os.hostname();

const redisClient = redis.createClient(process.env.REDIS_PORT, localIP);
redisClient.on("error", (err) => {
  console.log("Redis error:", err);
});
redisClient.connect();

app.post("/api/shorten", upload.single("file"), async (req, res) => {
  try {
    const longUrl = req.body?.url;
    if (!longUrl) {
      res.status(422).send("Please send a URL.");
    }
    const shortUrl = await redisClient.get(longUrl);
    if (shortUrl) {
      console.log("Using cached URL:", shortUrl);
      res.json({
        longUrl: longUrl,
        shortUrl: shortUrl,
        isCached: true,
        hostname: hostname,
      });
    } else {
      const apiUrl = process.env.API_URL;
      const config = {
        method: "post",
        url: apiUrl,
        headers: {
          apikey: process.env.API_KEY,
        },
        data: longUrl,
      };
      const apiResponse = await axios(config);
      const { short_url: shortUrl } = apiResponse.data;

      // cache for 5 minutes
      redisClient.setEx(longUrl, 300, shortUrl);
      res.json({
        longUrl: longUrl,
        shortUrl: shortUrl,
        isCached: false,
        hostname: hostname,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
