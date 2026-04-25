const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { getSafePath } = require('../utils/fileHelper');
const tmdbService = require('../services/tmdbService');
const musicService = require('../services/musicService');
const nfoService = require('../services/nfoService');
const { downloadImage, downloadImageToMediaDir } = require('../utils/imageDownloader');

const NUBEOS_ROOT = path.resolve(__dirname, '../../../..');

// --- HELPERS MOVED UP FOR SCOPE ---
const getAllFiles = (dirPath, arrayOfFiles) => {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
};

/**
 * Sanitize a string for use in file/folder names.
 * Removes characters invalid in Windows/Linux filenames.
 */
const sanitizeFilename = (name) => {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim();
};

/**
 * Organizes a movie file into its own folder: "Title (Year)/Title (Year).ext"
 * Only applies to movies (not series or music).
 * Returns the new file_path if moved, or the original if no move needed.
 */
const organizeMovieIntoFolder = (currentFilePath, title, year) => {
  try {
    if (!currentFilePath || !fs.existsSync(currentFilePath)) return currentFilePath;
    
    const ext = path.extname(currentFilePath);
    const parentDir = path.dirname(currentFilePath);
    const folderName = sanitizeFilename(`${title} (${year || 'Sin Año'})`);
    const fileName = `${folderName}${ext}`;
    
    // Check if already in a properly named folder
    const currentFolderName = path.basename(parentDir);
    if (currentFolderName === folderName) {
      // Already organized, just rename the file if needed
      const currentFileName = path.basename(currentFilePath);
      if (currentFileName !== fileName) {
        const newFilePath = path.join(parentDir, fileName);
        fs.renameSync(currentFilePath, newFilePath);
        console.log(`📝 Archivo renombrado: ${currentFileName} → ${fileName}`);
        return newFilePath.replace(/\\/g, '/');
      }
      return currentFilePath;
    }
    
    // Create the movie folder inside the library directory
    const movieFolder = path.join(parentDir, folderName);
    if (!fs.existsSync(movieFolder)) {
      fs.mkdirSync(movieFolder, { recursive: true });
    }
    
    // Move the video file
    const newFilePath = path.join(movieFolder, fileName);
    fs.renameSync(currentFilePath, newFilePath);
    console.log(`📂 Película organizada: ${path.basename(currentFilePath)} → ${folderName}/${fileName}`);
    
    // Also move any existing artwork/nfo files that accompanied the video
    const baseName = path.parse(currentFilePath).name;
    const siblingFiles = fs.readdirSync(parentDir);
    for (const sibling of siblingFiles) {
      if (sibling.startsWith(baseName + '-') || sibling.startsWith(baseName + '.nfo')) {
        const oldSibPath = path.join(parentDir, sibling);
        // Rename sibling to match new name
        const sibExt = path.extname(sibling);
        const sibSuffix = sibling.substring(baseName.length); // e.g. "-poster.jpg" or ".nfo"
        const newSibName = `${folderName}${sibSuffix}`;
        const newSibPath = path.join(movieFolder, newSibName);
        fs.renameSync(oldSibPath, newSibPath);
      }
    }
    
    return newFilePath.replace(/\\/g, '/');
  } catch (error) {
    console.error('Error organizing movie:', error.message);
    return currentFilePath;
  }
};

const processFile = async (filePath, lib) => {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileNameNoExt = path.parse(fileName).name;

  const isVideo = ['.mp4', '.mkv', '.webm', '.avi'].includes(ext);
  const isAudio = ['.mp3', '.wav', '.flac', '.aac'].includes(ext);
  if (!isVideo && !isAudio) return false;

  let type = lib.type || (isAudio ? 'music' : 'movie');

  const existing = db.prepare('SELECT id, poster_path, description FROM eo_media WHERE file_path = ?').get(filePath);
  if (existing && existing.poster_path && existing.description) return false;

  // Default values
  let title = fileNameNoExt;
  let year = new Date().getFullYear();
  let artist = 'Artista Desconocido';
  let album = 'Álbum Desconocido';
  let season = null, episode = null, seriesName = null;
  let posterPath = null, bannerPath = null, description = null, rating = null;
  let tagline = null, certification = null, runtime = null, trailer_url = null;
  let imdb_id = null, tmdb_id = null, director = null, writer = null;
  let studio = null, country = null, nfo_path = null, set_name = null;

  const isSeries = type === 'series' || type === 'tv';
  const seriesMatch = fileNameNoExt.match(/[Ss](\d+)[Ee](\d+)|(\d+)x(\d+)|[Ss]eason\s*(\d+)\s*[Ee]pisode\s*(\d+)/i);

  if (isSeries) {
    const relPath = path.relative(lib.path, filePath);
    const parts = relPath.split(path.sep);

    // Default parsing from filename first
    if (seriesMatch) {
      const s = seriesMatch[1] || seriesMatch[3] || seriesMatch[5];
      const e = seriesMatch[2] || seriesMatch[4] || seriesMatch[6];
      season = parseInt(s); 
      episode = parseInt(e);
      seriesName = fileNameNoExt.split(seriesMatch[0])[0].replace(/[._-]/g, ' ').trim();
    }

    // Hierarchy Override: Series -> Show -> Season -> Ep
    if (parts.length >= 3) {
      seriesName = parts[0].trim();
      const seasonPart = parts[parts.length - 2].trim();
      const seasonNumMatch = seasonPart.match(/\d+/);
      if (seasonNumMatch) season = parseInt(seasonNumMatch[0]);
    } 
    // Show -> Ep
    else if (parts.length === 2) {
      seriesName = parts[0].trim();
    }

    if (seriesName && episode !== null) {
      title = `${seriesName} - S${(season || 1).toString().padStart(2,'0')}E${episode.toString().padStart(2,'0')}`;
    }
  } else {
    title = fileNameNoExt.replace(/\((19|20)\d{2}\)|(19|20)\d{2}/g, '').replace(/[._-]/g, ' ').trim();
  }

  const yearMatch = fileNameNoExt.match(/\((19|20)\d{2}\)|(19|20)\d{2}/);
  if (yearMatch) year = parseInt(yearMatch[0].replace(/[()]/g, ''));

  // Music logic: Strictly respect folder hierarchy (Librería -> Artista -> Álbum -> Canción)
  if (type === 'music') {
    const relPath = path.relative(lib.path, filePath);
    const parts = relPath.split(path.sep);
    
    // Case 1: Library/Artist/Album/Song.ext (or deeper)
    if (parts.length >= 3) {
      artist = parts[0].trim();
      album = parts[parts.length - 2].trim();
      title = path.parse(parts[parts.length - 1]).name;
    } 
    // Case 2: Library/Artist/Song.ext
    else if (parts.length === 2) {
      artist = parts[0].trim();
      title = path.parse(parts[1]).name;
    }

    // Secondary parsing from filename/folder name if still generic
    if (title.includes(' - ')) {
      const nameParts = title.split(' - ');
      if (artist === 'Artista Desconocido') artist = nameParts[0].trim();
      title = nameParts[1].trim();
    }

    const parentName = path.basename(path.dirname(filePath));
    if (parentName.includes(' - ') && album === 'Álbum Desconocido') {
      const folderParts = parentName.split(' - ');
      if (artist === 'Artista Desconocido') artist = folderParts[0].trim();
      album = folderParts[1].trim();
    }

    // Clean redundant Artist from Album name (e.g. "Artist - Album" -> "Album")
    if (album.includes(' - ') && album.toLowerCase().startsWith(artist.toLowerCase())) {
       const albumParts = album.split(' - ');
       if (albumParts.length > 1) {
         album = albumParts.slice(1).join(' - ').trim();
       }
    }

    // Attempt extra identification via MusicBrainz
    if (artist !== 'Artista Desconocido' || album !== 'Álbum Desconocido') {
      try {
        // Try searching for the release first (Album + Artist)
        const mbRelease = await musicService.searchRelease(album, artist);
        if (mbRelease) {
          album = mbRelease.title;
          if (mbRelease.coverUrl) posterPath = mbRelease.coverUrl;
          if (mbRelease.date) year = parseInt(mbRelease.date.split('-')[0]) || year;
        }

        // Refine Artist name if needed
        const mbArtist = await musicService.searchArtist(artist);
        if (mbArtist) artist = mbArtist.name;
      } catch (err) {}
    }
  }

  // Check for existing NFO file first (MediaElch compatibility)
  const nfoData = nfoService.readNfoForMedia(filePath);

  if (nfoData && nfoData.parsed) {
    // Use NFO data if available
    const p = nfoData.parsed;
    title = p.title || title;
    description = p.description;
    rating = p.rating;
    tagline = p.tagline;
    certification = p.certification;
    runtime = p.runtime;
    trailer_url = p.trailer_url;
    imdb_id = p.imdb_id;
    tmdb_id = p.tmdb_id;
    director = p.director;
    writer = p.writer;
    studio = p.studio;
    country = p.country;
    set_name = p.set_name;
    nfo_path = nfoData.path;
    if (p.genre) title = title; // keep genre from NFO
  }

  // If no NFO or incomplete data, try TMDB
  if (!description) {
    const tmdbData = await tmdbService.searchMedia(title, year, type);
    if (tmdbData) {
      title = tmdbData.title || title; 
      description = tmdbData.description; 
      rating = tmdbData.rating;
      tmdb_id = tmdbData.tmdbId;
      // Download images to the same folder as the video file
      posterPath = await downloadImageToMediaDir(tmdbData.posterPath, filePath, 'poster');
      bannerPath = await downloadImageToMediaDir(tmdbData.bannerPath, filePath, 'fanart');
    }
  }
  
  const genre = lib.name || 'Desconocido';
  // Use artist/album for music, director/studio otherwise
  const d = type === 'music' ? artist : director;
  const s = type === 'music' ? album : studio;

  if (existing) {
    db.prepare(`UPDATE eo_media SET title = ?, description = ?, rating = ?, poster_path = ?, banner_path = ?, genre = ?,
      tagline = ?, certification = ?, runtime = ?, trailer_url = ?, imdb_id = ?, tmdb_id = ?,
      director = ?, writer = ?, studio = ?, country = ?, nfo_path = ?, set_name = ?, actors = ?
      WHERE id = ?`)
      .run(title, description, rating, posterPath || existing.poster_path, bannerPath, genre,
        tagline, certification, runtime, trailer_url, imdb_id, tmdb_id,
        d, writer, s, country, nfo_path, set_name, null, existing.id);
    return false;
  } else {
    db.prepare(`INSERT INTO eo_media (title, series_name, season, episode, type, file_path, genre, year, poster_path, banner_path, description, rating, is_new,
      tagline, certification, runtime, trailer_url, imdb_id, tmdb_id, director, writer, studio, country, nfo_path, set_name, actors) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(title, seriesName, season, episode, type, filePath, genre, year, posterPath, bannerPath, description, rating,
        tagline, certification, runtime, trailer_url, imdb_id, tmdb_id, d, writer, s, country, nfo_path, set_name, null);
    return true;
  }
};

// 1. Get Catalog (Media + User Progress)
router.get('/catalog', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT m.*, p.seconds as progress, p.is_finished, p.last_watched
      FROM eo_media m
      LEFT JOIN eo_progress p ON m.id = p.media_id AND p.user_id = ?
    `;
    const catalog = db.prepare(query).all(userId);
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Stream Media (Support for Dynamic Transcoding)
const transcodingService = require('../services/transcodingService');

router.get('/stream/:id', authMiddleware, (req, res) => {
  try {
    const mediaId = req.params.id;
    const quality = req.query.quality || 'original';
    const media = db.prepare('SELECT * FROM eo_media WHERE id = ?').get(mediaId);
    
    if (!media) return res.status(404).json({ error: 'Media no encontrada' });

    const filePath = media.file_path;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo de video no encontrado en el servidor' });

    // Handle Transcoding
    if (quality !== 'original') {
      console.log(`🎬 Transcodificando ${media.title} a ${quality}...`);
      const transcodeTask = transcodingService.transcode(filePath, quality);
      
      if (transcodeTask) {
        res.setHeader('Content-Type', transcodeTask.contentType);
        transcodeTask.stream.pipe(res);
        
        // Clean up FFmpeg when client disconnects
        req.on('close', () => {
          transcodeTask.process.kill();
        });
        return;
      }
    }

    // Default: Direct File Streaming (with Range support)
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac'
    };
    const contentType = mimeTypes[ext] || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Get Poster Image
router.get('/poster/:id', authMiddleware, (req, res) => {
  try {
    const mediaId = req.params.id;
    const media = db.prepare('SELECT poster_path FROM eo_media WHERE id = ?').get(mediaId);
    
    if (!media || !media.poster_path || !fs.existsSync(media.poster_path)) {
      return res.redirect('/entertainment/posters/stellar_horizon.png');
    }

    const ext = path.extname(media.poster_path).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    
    fs.createReadStream(media.poster_path).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2c. Get Banner Image
router.get('/banner/:id', authMiddleware, (req, res) => {
  try {
    const mediaId = req.params.id;
    const media = db.prepare('SELECT banner_path FROM eo_media WHERE id = ?').get(mediaId);
    
    if (!media || !media.banner_path || !fs.existsSync(media.banner_path)) {
      return res.redirect('/entertainment/posters/hero_banner.png');
    }

    const ext = path.extname(media.banner_path).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    
    fs.createReadStream(media.banner_path).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update Progress
router.post('/progress', authMiddleware, (req, res) => {
  try {
    const { mediaId, seconds, isFinished } = req.body;
    const userId = req.user.id;

    const query = `
      INSERT INTO eo_progress (user_id, media_id, seconds, is_finished, last_watched)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, media_id) DO UPDATE SET
        seconds = excluded.seconds,
        is_finished = excluded.is_finished,
        last_watched = CURRENT_TIMESTAMP
    `;
    db.prepare(query).run(userId, mediaId, seconds, isFinished ? 1 : 0);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Admin - Add Library
router.post('/admin/libraries', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { path: libPath, name, type } = req.body;
    const result = db.prepare('INSERT INTO eo_libraries (path, name, type) VALUES (?, ?, ?)').run(libPath, name, type || 'movie');
    
    // Auto-scan after adding
    const libId = result.lastInsertRowid;
    const lib = db.prepare('SELECT * FROM eo_libraries WHERE id = ?').get(libId);
    
    if (fs.existsSync(libPath)) {
       const files = getAllFiles(libPath);
       for (const f of files) {
          await processFile(f, lib);
       }
    }

    res.json({ success: true, libId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Admin - List Libraries
router.get('/admin/libraries', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const libs = db.prepare('SELECT * FROM eo_libraries').all();
    res.json(libs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Admin - Remove Library
router.delete('/admin/libraries/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    db.prepare('DELETE FROM eo_libraries WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Admin - Scan Libraries
router.post('/admin/scan', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const libraries = db.prepare('SELECT * FROM eo_libraries').all();
    let newItems = 0;

    for (const lib of libraries) {
      if (!fs.existsSync(lib.path)) continue;
      const allFiles = getAllFiles(lib.path);
      for (const filePath of allFiles) {
        const isNew = await processFile(filePath, lib);
        if (isNew) newItems++;
      }
    }
    res.json({ success: true, newItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7b. Admin - Scan Specific Library
router.post('/admin/scan/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const lib = db.prepare('SELECT * FROM eo_libraries WHERE id = ?').get(req.params.id);
    if (!lib || !fs.existsSync(lib.path)) return res.status(404).json({ error: 'Librería no encontrada' });

    let newItems = 0;
    const allFiles = getAllFiles(lib.path);
    for (const filePath of allFiles) {
      const isNew = await processFile(filePath, lib);
      if (isNew) newItems++;
    }
    res.json({ success: true, newItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Admin - Get Stats
router.get('/admin/stats', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const stats = {
      movies: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE type = 'movie'").get().count,
      series: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE type = 'series'").get().count,
      music: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE type = 'music'").get().count,
      noPoster: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE poster_path IS NULL").get().count,
      noNfo: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE nfo_path IS NULL AND type != 'music'").get().count,
      identified: db.prepare("SELECT COUNT(*) as count FROM eo_media WHERE tmdb_id IS NOT NULL").get().count,
      lastAdded: db.prepare("SELECT title FROM eo_media ORDER BY created_at DESC LIMIT 5").all()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Admin - List All Media for Management
router.get('/admin/media', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const libPath = req.query.libPath;
    let media;
    if (libPath) {
      // Use explicit concatenation for the LIKE pattern
      media = db.prepare('SELECT * FROM eo_media WHERE file_path LIKE ? ORDER BY title ASC').all(libPath + '%');
    } else {
      media = db.prepare('SELECT * FROM eo_media ORDER BY title ASC').all();
    }
    res.json(media);
  } catch (error) {
    console.error('API Error /admin/media:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Admin - Update Media Metadata
router.put('/admin/media/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { title, description, genre, year, stars } = req.body;
    db.prepare(`
      UPDATE eo_media 
      SET title = ?, description = ?, genre = ?, year = ?, stars = ?, poster_path = ?, banner_path = ?, rating = ?,
          tagline = ?, certification = ?, runtime = ?, trailer_url = ?, imdb_id = ?, tmdb_id = ?,
          director = ?, writer = ?, studio = ?, country = ?, set_name = ?
      WHERE id = ?
    `).run(title, description, genre, year, stars, req.body.poster_path, req.body.banner_path, req.body.rating,
      req.body.tagline || null, req.body.certification || null, req.body.runtime || null, req.body.trailer_url || null,
      req.body.imdb_id || null, req.body.tmdb_id || null, req.body.director || null, req.body.writer || null,
      req.body.studio || null, req.body.country || null, req.body.set_name || null, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Admin - Delete Media
router.delete('/admin/media/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    db.prepare('DELETE FROM eo_media WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Admin - Browse System Files (Folders Only)
router.get('/admin/browse-fs', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    let requestedPath = req.query.path || NUBEOS_ROOT;
    let currentPath = path.resolve(requestedPath);
    
    if (!currentPath.startsWith(NUBEOS_ROOT)) {
      currentPath = NUBEOS_ROOT;
    }

    if (!fs.existsSync(currentPath)) {
      currentPath = NUBEOS_ROOT;
    }

    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(currentPath, item.name).replace(/\\/g, '/')
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentPath: currentPath.replace(/\\/g, '/'),
      parentPath: currentPath === NUBEOS_ROOT ? null : path.dirname(currentPath).replace(/\\/g, '/'),
      folders,
      isRoot: currentPath === NUBEOS_ROOT
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Admin - Get Configuration
router.get('/admin/config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const apiKey = db.prepare("SELECT value FROM system_config WHERE key = 'tmdb_api_key'").get();
    res.json({
      tmdb_api_key: apiKey ? '********' + apiKey.value.slice(-4) : '',
      has_key: !!apiKey
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Admin - Update Configuration
router.post('/admin/config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { tmdb_api_key } = req.body;
    db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES ('tmdb_api_key', ?)").run(tmdb_api_key);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14b. Admin - Search TMDB & MusicBrainz
router.get('/admin/tmdb/search', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { query, type } = req.query;
    if (!query) return res.status(400).json({ error: 'Query es requerido' });
    
    if (type === 'music') {
      const mbArtist = await musicService.searchArtist(query);
      if (mbArtist) {
        return res.json([{
          id: -1, // MB artists don't use numeric IDs in the same way, we use -1 to trigger the code
          mbid: mbArtist.id,
          title: mbArtist.name,
          year: mbArtist['life-span']?.begin?.split('-')[0] || '',
          poster: null,
          description: mbArtist.disambiguation || 'Artista de MusicBrainz',
          rating: 'N/A',
          type: 'music'
        }]);
      }
      return res.json([]);
    }

    // Use multi-search if no type specified, otherwise type-specific search
    let results;
    if (!type || type === 'all') {
      results = await tmdbService.searchMulti(query);
    } else {
      results = await tmdbService.searchTmdbRaw(query, type);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14c. Admin - Identify Media (Apply TMDB ID) - ENHANCED
router.post('/admin/media/identify', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { mediaId, tmdbId, type, title: manualTitle } = req.body;
    if (!mediaId || (tmdbId === undefined && type !== 'music')) return res.status(400).json({ error: 'Faltan parámetros' });

    let metadata = null;
    if (type === 'music') {
      const mbArtist = await musicService.searchArtist(manualTitle || '');
      if (mbArtist) {
        metadata = {
          title: mbArtist.name,
          description: mbArtist.disambiguation || 'Artista identificado',
          genres: '',
          year: mbArtist['life-span']?.begin?.split('-')[0] || '',
          rating: 'N/A',
          posterPath: null,
          bannerPath: null,
          tagline: mbArtist.country,
          certification: null,
          runtime: null,
          trailerUrl: null,
          imdbId: null,
          tmdbId: -1,
          director: mbArtist.name,
          writer: null,
          studio: '',
          country: mbArtist.country,
          setName: null
        };
      }
    } else {
      metadata = await tmdbService.getMediaDetails(tmdbId, type || 'movie');
    }

    if (!metadata) return res.status(404).json({ error: 'No se encontraron datos' });

    const media = db.prepare('SELECT * FROM eo_media WHERE id = ?').get(mediaId);
    if (!media) return res.status(404).json({ error: 'Media no encontrada' });
    
    let videoFilePath = media.file_path;

    // For movies: organize into folder "Title (Year)/Title (Year).ext"
    if ((type || media.type) === 'movie' && metadata.title && metadata.year) {
      const newFilePath = organizeMovieIntoFolder(videoFilePath, metadata.title, metadata.year);
      if (newFilePath !== videoFilePath) {
        // Update the file_path in DB before downloading images
        db.prepare('UPDATE eo_media SET file_path = ? WHERE id = ?').run(newFilePath, mediaId);
        videoFilePath = newFilePath;
      }
    }

    // Download images to the movie folder
    let posterPath = null;
    let bannerPath = null;
    if (videoFilePath) {
      posterPath = await downloadImageToMediaDir(metadata.posterPath, videoFilePath, 'poster');
      bannerPath = await downloadImageToMediaDir(metadata.bannerPath, videoFilePath, 'fanart');
    }

    // Update with ALL enhanced metadata
    db.prepare(`
      UPDATE eo_media 
      SET title = ?, description = ?, genre = ?, year = ?, rating = ?, poster_path = ?, banner_path = ?,
          tagline = ?, certification = ?, runtime = ?, trailer_url = ?, imdb_id = ?, tmdb_id = ?,
          director = ?, writer = ?, studio = ?, country = ?, set_name = ?, actors = ?
      WHERE id = ?
    `).run(
      metadata.title, 
      metadata.description, 
      metadata.genres || metadata.genre || media.genre, 
      metadata.year, 
      metadata.rating, 
      posterPath || media.poster_path, 
      bannerPath || media.banner_path,
      metadata.tagline,
      metadata.certification,
      metadata.runtime,
      metadata.trailerUrl || metadata.trailer_url,
      metadata.imdbId || metadata.imdb_id,
      metadata.tmdbId || metadata.tmdb_id,
      metadata.director,
      metadata.writer,
      metadata.studio || media.studio,
      metadata.country,
      metadata.setName || metadata.set_name,
      metadata.cast ? JSON.stringify(metadata.cast) : null,
      mediaId
    );

    // Auto-generate NFO after successful identification
    const updatedMedia = db.prepare('SELECT * FROM eo_media WHERE id = ?').get(mediaId);
    if (updatedMedia) {
      const nfoPath = nfoService.writeNfoForMedia(updatedMedia);
      if (nfoPath) {
        db.prepare('UPDATE eo_media SET nfo_path = ? WHERE id = ?').run(nfoPath, mediaId);
      }
    }

    // If this movie belongs to a collection, upsert the set
    if (tmdbData.collection && tmdbData.setName) {
      try {
        const existingSet = db.prepare('SELECT id FROM eo_sets WHERE name = ?').get(tmdbData.setName);
        if (!existingSet) {
          const setPosters = await downloadImage(tmdbData.collection.posterPath, `set_poster_${tmdbData.collection.id}`);
          const setBanner = await downloadImage(tmdbData.collection.backdropPath, `set_banner_${tmdbData.collection.id}`);
          db.prepare('INSERT OR IGNORE INTO eo_sets (name, tmdb_id, poster_path, banner_path) VALUES (?, ?, ?, ?)')
            .run(tmdbData.setName, tmdbData.collection.id, setPosters, setBanner);
        }
      } catch (setErr) {
        console.warn('Set creation warning:', setErr.message);
      }
    }

    res.json({ success: true, metadata: tmdbData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14d. Admin - Bulk Identify (auto-scrape all unidentified media)
router.post('/admin/media/bulk-identify', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const unidentified = db.prepare("SELECT * FROM eo_media WHERE tmdb_id IS NULL").all();
    let identified = 0;
    let failed = 0;

    for (const media of unidentified) {
      try {
        let currentFilePath = media.file_path;
        let updateData = null;

        if (media.type === 'music') {
          // Music Identification (MusicBrainz)
          const searchTitle = media.director || media.title;
          const mbArtist = await musicService.searchArtist(searchTitle);
          if (mbArtist) {
            updateData = {
              title: media.title,
              description: mbArtist.disambiguation || 'Artista identificado vía MusicBrainz',
              genre: media.genre,
              year: media.year,
              rating: 'N/A',
              poster_path: media.poster_path,
              banner_path: media.banner_path,
              tagline: mbArtist.country || null,
              certification: null,
              runtime: null,
              trailer_url: null,
              imdb_id: null,
              tmdb_id: -1, // Mark as identified for music
              director: mbArtist.name,
              writer: null,
              studio: media.studio,
              country: mbArtist.country,
              set_name: null
            };
          } else {
            failed++; continue;
          }
        } else {
          // TMDB Logic (Movies/Series)
          const searchTitle = media.series_name || media.title;
          const searchResult = await tmdbService.searchMedia(searchTitle, media.year, media.type);
          if (!searchResult) { failed++; continue; }

          const fullData = await tmdbService.getMediaDetails(searchResult.tmdbId, media.type);
          if (!fullData) { failed++; continue; }

          // For movies: organize into folder
          if (media.type === 'movie' && fullData.title && fullData.year) {
            const newFilePath = organizeMovieIntoFolder(currentFilePath, fullData.title, fullData.year);
            if (newFilePath !== currentFilePath) {
              db.prepare('UPDATE eo_media SET file_path = ? WHERE id = ?').run(newFilePath, media.id);
              currentFilePath = newFilePath;
            }
          }

          // Download images
          const posterPath = await downloadImageToMediaDir(fullData.posterPath, currentFilePath, 'poster');
          const bannerPath = await downloadImageToMediaDir(fullData.bannerPath, currentFilePath, 'fanart');

          updateData = {
            title: fullData.title,
            description: fullData.description,
            genre: fullData.genres,
            year: fullData.year,
            rating: fullData.rating,
            poster_path: posterPath || media.poster_path,
            banner_path: bannerPath || media.banner_path,
            tagline: fullData.tagline,
            certification: fullData.certification,
            runtime: fullData.runtime,
            trailer_url: fullData.trailerUrl,
            imdb_id: fullData.imdbId,
            tmdb_id: fullData.tmdbId,
            director: fullData.director,
            writer: fullData.writer,
            studio: fullData.studio,
            country: fullData.country,
            set_name: fullData.setName
          };
        }

        if (updateData) {
          db.prepare(`
            UPDATE eo_media 
            SET title = ?, description = ?, genre = ?, year = ?, rating = ?, poster_path = ?, banner_path = ?,
                tagline = ?, certification = ?, runtime = ?, trailer_url = ?, imdb_id = ?, tmdb_id = ?,
                director = ?, writer = ?, studio = ?, country = ?, nfo_path = ?, set_name = ?
            WHERE id = ?
          `).run(
            updateData.title, updateData.description, updateData.genre, updateData.year, updateData.rating,
            updateData.poster_path, updateData.banner_path,
            updateData.tagline, updateData.certification, updateData.runtime, updateData.trailer_url,
            updateData.imdb_id, updateData.tmdb_id, updateData.director, updateData.writer,
            updateData.studio, updateData.country, media.nfo_path, updateData.set_name, media.id
          );

          // Write NFO
          const updatedMedia = db.prepare('SELECT * FROM eo_media WHERE id = ?').get(media.id);
          if (updatedMedia) {
            const nfoPath = nfoService.writeNfoForMedia(updatedMedia);
            if (nfoPath) {
              db.prepare('UPDATE eo_media SET nfo_path = ? WHERE id = ?').run(nfoPath, media.id);
            }
          }
          identified++;
        }
      } catch (itemErr) {
        console.warn(`Bulk identify failed for ${media.title}:`, itemErr.message);
        failed++;
      }
    }

    res.json({ success: true, total: unidentified.length, identified, failed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== NFO ROUTES ======

// 15. Admin - Write NFO for a specific media
router.post('/admin/nfo/write/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const media = db.prepare('SELECT * FROM eo_media WHERE id = ?').get(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media no encontrada' });

    const nfoPath = nfoService.writeNfoForMedia(media);
    if (nfoPath) {
      db.prepare('UPDATE eo_media SET nfo_path = ? WHERE id = ?').run(nfoPath, media.id);
      res.json({ success: true, nfoPath });
    } else {
      res.status(500).json({ error: 'No se pudo escribir el archivo NFO' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15b. Admin - Bulk Write NFO for all media that has metadata but no NFO
router.post('/admin/nfo/write-bulk', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const media = db.prepare("SELECT * FROM eo_media WHERE nfo_path IS NULL AND description IS NOT NULL AND type != 'music'").all();
    let written = 0;

    for (const m of media) {
      const nfoPath = nfoService.writeNfoForMedia(m);
      if (nfoPath) {
        db.prepare('UPDATE eo_media SET nfo_path = ? WHERE id = ?').run(nfoPath, m.id);
        written++;
      }
    }

    res.json({ success: true, total: media.length, written });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15c. Admin - Read NFO for a specific media
router.get('/admin/nfo/read/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const media = db.prepare('SELECT file_path, nfo_path FROM eo_media WHERE id = ?').get(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media no encontrada' });

    const nfoData = nfoService.readNfoForMedia(media.file_path);
    if (nfoData) {
      res.json({ success: true, ...nfoData });
    } else {
      res.json({ success: false, message: 'No se encontró archivo NFO' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15d. Admin - Get TMDB images for manual selection
router.get('/admin/tmdb/images/:tmdbId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const type = req.query.type || 'movie';
    const images = await tmdbService.getMediaImages(req.params.tmdbId, type);
    if (images) {
      res.json(images);
    } else {
      res.json({ posters: [], backdrops: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- IPTV ROUTES ---

// 16. Get IPTV Lists
router.get('/iptv/lists', authMiddleware, (req, res) => {
  try {
    const lists = db.prepare('SELECT * FROM eo_iptv_lists ORDER BY created_at DESC').all();
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 17. Add IPTV List
router.post('/iptv/lists', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Nombre y URL son requeridos' });
    
    db.prepare('INSERT INTO eo_iptv_lists (name, url) VALUES (?, ?)').run(name, url);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 18. Delete IPTV List
router.delete('/iptv/lists/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    db.prepare('DELETE FROM eo_iptv_lists WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 19. Parse IPTV List
const iptvService = require('../services/iptvService');
router.get('/iptv/parse/:id', authMiddleware, async (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM eo_iptv_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Lista no encontrada' });

    const content = await iptvService.fetchM3u(list.url);
    const channels = iptvService.parseM3u(content);
    
    // Group by category
    const categories = {};
    channels.forEach(ch => {
      if (!categories[ch.group]) categories[ch.group] = [];
      categories[ch.group].push(ch);
    });

    res.json({
      name: list.name,
      categories: Object.keys(categories).sort().map(name => ({
        name,
        channels: categories[name]
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FAVORITES ROUTES ---

// 20. Get Favorites
router.get('/favorites', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = db.prepare(`
      SELECT f.*, m.title, m.poster_path, m.type, m.year
      FROM eo_favorites f
      LEFT JOIN eo_media m ON f.media_id = m.id
      WHERE f.user_id = ?
    `).all(userId);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 21. Add to Favorites
router.post('/favorites', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { mediaId, iptvUrl } = req.body;
    db.prepare(`
      INSERT OR IGNORE INTO eo_favorites (user_id, media_id, iptv_url)
      VALUES (?, ?, ?)
    `).run(userId, mediaId, iptvUrl);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 22. Remove from Favorites
router.delete('/favorites', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { mediaId, iptvUrl } = req.body;
    if (mediaId) {
      db.prepare('DELETE FROM eo_favorites WHERE user_id = ? AND media_id = ?').run(userId, mediaId);
    } else {
      db.prepare('DELETE FROM eo_favorites WHERE user_id = ? AND iptv_url = ?').run(userId, iptvUrl);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Subtitles Support ---
router.get('/media/:id/subtitles', authMiddleware, async (req, res) => {
  try {
    const media = db.prepare('SELECT file_path FROM eo_media WHERE id = ?').get(req.params.id);
    if (!media) return res.status(404).send('Media not found');

    const videoDir = path.dirname(media.file_path);
    const videoName = path.basename(media.file_path, path.extname(media.file_path));
    
    if (!fs.existsSync(videoDir)) return res.json([]);

    const files = fs.readdirSync(videoDir);
    const subs = [];

    // Look for files with same name or common sub patterns
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.srt' || ext === '.vtt') {
        // Basic language detection from filename (e.g. Movie.en.srt)
        let lang = 'es';
        let label = 'Español';
        
        if (file.toLowerCase().includes('.en.') || file.toLowerCase().includes('english')) {
          lang = 'en'; label = 'English';
        } else if (file.toLowerCase().includes('.fr.')) {
          lang = 'fr'; label = 'Français';
        }

        subs.push({
          label: label + (subs.length > 0 ? ` (${subs.length + 1})` : ''),
          lang: lang,
          src: `/api/entertainment/subtitles/${req.params.id}/${encodeURIComponent(file)}?token=${req.query.token || req.headers.authorization?.split(' ')[1]}`
        });
      }
    });

    res.json(subs);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/subtitles/:id/:filename', (req, res) => {
  try {
    // Basic security: check token (optional here but good practice)
    const media = db.prepare('SELECT file_path FROM eo_media WHERE id = ?').get(req.params.id);
    if (!media) return res.status(404).send('Not found');

    const videoDir = path.dirname(media.file_path);
    const subPath = path.join(videoDir, decodeURIComponent(req.params.filename));

    if (!fs.existsSync(subPath)) return res.status(404).send('Sub not found');

    // If it's SRT, we should ideally convert to VTT, but modern browsers/players often handle it or we can do it on the fly
    res.setHeader('Content-Type', 'text/vtt');
    
    let content = fs.readFileSync(subPath, 'utf8');
    if (path.extname(subPath).toLowerCase() === '.srt') {
      // Very basic SRT to VTT conversion
      content = 'WEBVTT\n\n' + content.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
    }
    
    res.send(content);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
