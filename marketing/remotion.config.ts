import { Config } from "@remotion/cli/config";

// H.264 MP4, 1080x1920 — accepté tel quel par YouTube Shorts, Reels et TikTok.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
