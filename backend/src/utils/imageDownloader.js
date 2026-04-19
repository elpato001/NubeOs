const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// Ensure cache directory exists
const CACHE_DIR = path.resolve(__dirname, '../../../../data/entertainment/cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Downloads an image from a URL and returns the local file path.
 * If the input is already a local path, returns it as is.
 */
const downloadImage = async (urlOrPath, filename) => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith('http')) return urlOrPath; // Already local

  try {
    const extension = path.extname(new URL(urlOrPath).pathname) || '.jpg';
    const localFilename = `${filename}${extension}`;
    const localPath = path.join(CACHE_DIR, localFilename);

    // If file already exists, don't download again (simple cache)
    // if (fs.existsSync(localPath)) return localPath;

    const response = await fetch(urlOrPath);
    if (!response.ok) throw new Error(`Fallo al descargar imagen: ${response.statusText}`);

    const fileStream = fs.createWriteStream(localPath);
    await pipeline(response.body, fileStream);

    return localPath.replace(/\\/g, '/'); // Return with forward slashes
  } catch (error) {
    console.error('Error downloading image:', error.message);
    return null;
  }
};

module.exports = { downloadImage };
