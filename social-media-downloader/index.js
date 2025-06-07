const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/social/download", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({
      success: false,
      error: "Missing 'url' parameter. Usage: /api/social/download?url=VIDEO_URL",
    });
  }

  try {
    const videoInfo = await getVideoInfo(videoUrl);
    res.json(videoInfo);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process video",
    });
  }
});

app.get("/api/social/health", (req, res) => {
  res.json({
    status: "healthy",
    supported_platforms: ["YouTube", "TikTok", "Instagram", "Facebook"],
    timestamp: new Date().toISOString(),
  });
});

function getVideoInfo(url) {
  return new Promise((resolve) => {
    const ytdlp = spawn("yt-dlp", [
      "-j",
      "--no-playlist",
      "-f",
      "best[ext=mp4]/best",
      url,
    ]);

    let stdout = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const info = JSON.parse(stdout.trim());
          const formats = info.formats || [];

          var mp4 = null;
          for (var i = 0; i < formats.length; i++) {
            var f = formats[i];
            if (
              f.ext === "mp4" &&
              f.acodec !== "none" &&
              f.vcodec !== "none" &&
              f.url
            ) {
              mp4 = f;
              break;
            }
          }

          var best = null;
          if (mp4 && mp4.url) {
            best = mp4.url;
          } else {
            var anyFormat = null;
            for (var j = 0; j < formats.length; j++) {
              if (formats[j].url) {
                anyFormat = formats[j];
                break;
              }
            }
            if (anyFormat) best = anyFormat.url;
          }

          resolve({
            success: true,
            title: info.title || "Unknown Title",
            download_url: best,
            platform: determinePlatform(url, info.extractor_key),
          });
        } catch (e) {
          resolve({ success: false, error: "Failed to parse video information" });
        }
      } else {
        resolve({ success: false, error: stderr.trim() || `yt-dlp failed with code ${code}` });
      }
    });

    ytdlp.on("error", (error) => {
      resolve({ success: false, error: `Failed to execute yt-dlp: ${error.message}` });
    });
  });
}

function determinePlatform(url, extractorKey) {
  if (extractorKey) {
    var key = extractorKey.toLowerCase();
    if (key.indexOf("youtube") !== -1) return "YouTube";
    if (key.indexOf("tiktok") !== -1) return "TikTok";
    if (key.indexOf("instagram") !== -1) return "Instagram";
    if (key.indexOf("facebook") !== -1) return "Facebook";
  }

  var urlLower = url.toLowerCase();
  if (urlLower.indexOf("youtube.com") !== -1 || urlLower.indexOf("youtu.be") !== -1)
    return "YouTube";
  if (urlLower.indexOf("tiktok.com") !== -1) return "TikTok";
  if (urlLower.indexOf("instagram.com") !== -1) return "Instagram";
  if (urlLower.indexOf("facebook.com") !== -1 || urlLower.indexOf("fb.com") !== -1)
    return "Facebook";

  return "Unknown";
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
