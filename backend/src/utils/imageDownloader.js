const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// Fallback cache directory (for set posters and other non-media images)
const CACHE_DIR = path.resolve(__dirname, '../../../../data/entertainment/cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Downloads an image from a URL to the SAME directory as the video file,
 * following Kodi/MediaElch naming conventions.
 * 
 * @param {string} urlOrPath - URL to download from, or already-local path
 * @param {string} videoFilePath - Full path to the video file
 * @param {string} imageType - Type of image: 'poster', 'fanart', 'thumb'
 * @param {boolean} skipDownload - If true, return URL instead of downloading if not local
 * @returns {string|null} Local file path or original URL
 */
const downloadImageToMediaDir = async (urlOrPath, videoFilePath, imageType = 'poster', skipDownload = false) => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith('http')) return urlOrPath; // Already local

  try {
    const extension = path.extname(new URL(urlOrPath).pathname) || '.jpg';
    const videoDir = path.dirname(videoFilePath);
    const videoBaseName = path.parse(videoFilePath).name; // filename without extension

    const imageFilename = `${videoBaseName}-${imageType}${extension}`;
    const localPath = path.join(videoDir, imageFilename);

    // Skip download if file already exists and is not empty
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
      return localPath.replace(/\\/g, '/');
    }

    if (skipDownload) return urlOrPath;

    const response = await fetch(urlOrPath);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    const fileStream = fs.createWriteStream(localPath);
    await pipeline(response.body, fileStream);

    console.log(`🖼️  Imagen guardada: ${imageFilename}`);
    return localPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('Error downloading image to media dir:', error.message);
    return skipDownload ? urlOrPath : null;
  }
};

/**
 * Downloads an image to the central cache directory.
 * 
 * @param {string} urlOrPath - URL to download from
 * @param {string} filename - Desired filename
 * @param {boolean} skipDownload - If true, return URL instead of downloading if not local
 * @returns {string|null} Local file path or original URL
 */
const downloadImage = async (urlOrPath, filename, skipDownload = false) => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith('http')) return urlOrPath; // Already local

  try {
    const extension = path.extname(new URL(urlOrPath).pathname) || '.jpg';
    const localFilename = `${filename}${extension}`;
    const localPath = path.join(CACHE_DIR, localFilename);

    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
      return localPath.replace(/\\/g, '/');
    }

    if (skipDownload) return urlOrPath;

    const response = await fetch(urlOrPath);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    const fileStream = fs.createWriteStream(localPath);
    await pipeline(response.body, fileStream);

    return localPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('Error downloading image:', error.message);
    return skipDownload ? urlOrPath : null;
  }
};

module.exports = { downloadImage, downloadImageToMediaDir };
