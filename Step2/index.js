require("dotenv").config();
const bodyParser = require('body-parser');
const express = require("express");
const redis = require("redis");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 3000;

const client = redis.createClient({
  host: "redis",
  port: 6379,
});

client.on("error", (err) => {
  console.log("Redis error:", err);
});

const headers = {
  apikey: process.env.API_KEY,
  "Content-Type": "application/json",
};

app.use(bodyParser.json());

app.post("/api/shorten", async (req, res) => {
  try {
    console.log(req.body);
    const longUrl = req.body.url;

    // Check if the long URL is already cached in Redis
    client.get(longUrl, async (err, shortUrl) => {
      if (err) throw err;

      if (shortUrl) {
        console.log("Using cached URL:", shortUrl);
        res.json({
          longUrl: longUrl,
          shortUrl: shortUrl,
          isCached: true,
          hostname: new URL(shortUrl).hostname,
        });
      } else {
        const apiUrl = process.env.API_URL;
        const headers = {
          apikey: "0b2YvJXUDna0GoZHS7C7ZZzbLkKyHpXf",
          "Content-Type": "application/json",
        };
        const data = JSON.stringify({
          url: longUrl,
        });
        const config = {
          method: "post",
          url: apiUrl,
          headers: headers,
          data: data,
        };
        const apiResponse = await axios(config);
        console.log(apiResponse);
        const { short_url: shortUrl } = apiResponse.data;

        client.setex(longUrl, 300, shortUrl);

        res.json({
          longUrl: longUrl,
          shortUrl: shortUrl,
          isCached: false,
          hostname: new URL(shortUrl).hostname,
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
