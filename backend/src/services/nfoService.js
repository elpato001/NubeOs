/**
 * NFO Service - MediaElch-compatible NFO file generation & parsing
 * Generates Kodi-compatible .nfo XML files alongside media files
 */
const fs = require('fs');
const path = require('path');

// ---- XML HELPERS ----

const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getTag = (xml, tag) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

const getAllTags = (xml, tag) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
  const matches = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
};

const getAttr = (xml, tag, attr) => {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 's');
  const match = xml.match(regex);
  return match ? match[1] : null;
};

// ---- NFO GENERATION ----

/**
 * Generates a Kodi-compatible NFO XML for a movie
 */
const generateMovieNfo = (media) => {
  const genres = (media.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const directors = (media.director || '').split(',').map(d => d.trim()).filter(Boolean);
  const writers = (media.writer || '').split(',').map(w => w.trim()).filter(Boolean);
  const studios = (media.studio || '').split(',').map(s => s.trim()).filter(Boolean);
  const countries = (media.country || '').split(',').map(c => c.trim()).filter(Boolean);

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
  <title>${escapeXml(media.title)}</title>
  <originaltitle>${escapeXml(media.title)}</originaltitle>
  <sorttitle>${escapeXml(media.title)}</sorttitle>
  <rating>${escapeXml(media.rating || '')}</rating>
  <year>${media.year || ''}</year>
  <plot>${escapeXml(media.description || '')}</plot>
  <tagline>${escapeXml(media.tagline || '')}</tagline>
  <runtime>${media.runtime || ''}</runtime>
  <mpaa>${escapeXml(media.certification || '')}</mpaa>
  <tmdbid>${media.tmdb_id || ''}</tmdbid>
  <imdbid>${escapeXml(media.imdb_id || '')}</imdbid>
  <trailer>${escapeXml(media.trailer_url || '')}</trailer>`;

  if (media.set_name) {
    xml += `\n  <set>\n    <name>${escapeXml(media.set_name)}</name>\n  </set>`;
  }

  genres.forEach(g => { xml += `\n  <genre>${escapeXml(g)}</genre>`; });
  directors.forEach(d => { xml += `\n  <director>${escapeXml(d)}</director>`; });
  writers.forEach(w => { xml += `\n  <credits>${escapeXml(w)}</credits>`; });
  studios.forEach(s => { xml += `\n  <studio>${escapeXml(s)}</studio>`; });
  countries.forEach(c => { xml += `\n  <country>${escapeXml(c)}</country>`; });

  xml += `\n</movie>\n`;
  return xml;
};

/**
 * Generates a Kodi-compatible NFO XML for a TV show
 */
const generateTvShowNfo = (media) => {
  const genres = (media.genre || '').split(',').map(g => g.trim()).filter(Boolean);

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<tvshow>
  <title>${escapeXml(media.series_name || media.title)}</title>
  <sorttitle>${escapeXml(media.series_name || media.title)}</sorttitle>
  <rating>${escapeXml(media.rating || '')}</rating>
  <year>${media.year || ''}</year>
  <plot>${escapeXml(media.description || '')}</plot>
  <tmdbid>${media.tmdb_id || ''}</tmdbid>
  <imdbid>${escapeXml(media.imdb_id || '')}</imdbid>
  <mpaa>${escapeXml(media.certification || '')}</mpaa>
  <studio>${escapeXml(media.studio || '')}</studio>`;

  genres.forEach(g => { xml += `\n  <genre>${escapeXml(g)}</genre>`; });

  xml += `\n</tvshow>\n`;
  return xml;
};

/**
 * Generates a Kodi-compatible NFO XML for an episode
 */
const generateEpisodeNfo = (media) => {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<episodedetails>
  <title>${escapeXml(media.title)}</title>
  <showtitle>${escapeXml(media.series_name || '')}</showtitle>
  <season>${media.season || 1}</season>
  <episode>${media.episode || 1}</episode>
  <rating>${escapeXml(media.rating || '')}</rating>
  <year>${media.year || ''}</year>
  <plot>${escapeXml(media.description || '')}</plot>
  <runtime>${media.runtime || ''}</runtime>
  <tmdbid>${media.tmdb_id || ''}</tmdbid>
  <director>${escapeXml(media.director || '')}</director>
</episodedetails>\n`;
  return xml;
};

// ---- NFO PARSING ----

/**
 * Parses a Kodi NFO XML file to a media metadata object
 */
const parseNfo = (nfoContent) => {
  try {
    const isMovie = nfoContent.includes('<movie>');
    const isTvShow = nfoContent.includes('<tvshow>');
    const isEpisode = nfoContent.includes('<episodedetails>');

    const metadata = {
      title: getTag(nfoContent, 'title'),
      description: getTag(nfoContent, 'plot'),
      rating: getTag(nfoContent, 'rating'),
      year: getTag(nfoContent, 'year') ? parseInt(getTag(nfoContent, 'year')) : null,
      tagline: getTag(nfoContent, 'tagline'),
      runtime: getTag(nfoContent, 'runtime') ? parseInt(getTag(nfoContent, 'runtime')) : null,
      certification: getTag(nfoContent, 'mpaa'),
      tmdb_id: getTag(nfoContent, 'tmdbid') ? parseInt(getTag(nfoContent, 'tmdbid')) : null,
      imdb_id: getTag(nfoContent, 'imdbid'),
      trailer_url: getTag(nfoContent, 'trailer'),
      genre: getAllTags(nfoContent, 'genre').join(', '),
      director: getAllTags(nfoContent, 'director').join(', '),
      writer: getAllTags(nfoContent, 'credits').join(', '),
      studio: getAllTags(nfoContent, 'studio').join(', '),
      country: getAllTags(nfoContent, 'country').join(', '),
    };

    if (isMovie) {
      metadata.type = 'movie';
      const setName = getTag(nfoContent, 'name'); // inside <set>
      if (nfoContent.includes('<set>') && setName) {
        metadata.set_name = setName;
      }
    } else if (isTvShow) {
      metadata.type = 'series';
    } else if (isEpisode) {
      metadata.type = 'series';
      metadata.series_name = getTag(nfoContent, 'showtitle');
      metadata.season = getTag(nfoContent, 'season') ? parseInt(getTag(nfoContent, 'season')) : null;
      metadata.episode = getTag(nfoContent, 'episode') ? parseInt(getTag(nfoContent, 'episode')) : null;
    }

    return metadata;
  } catch (error) {
    console.error('Error parsing NFO:', error.message);
    return null;
  }
};

// ---- FILE OPERATIONS ----

/**
 * Writes the NFO file next to the media file.
 * For movies: movie.nfo (same name as video)
 * For episodes: episode.nfo (same name as video)
 * For TV shows: tvshow.nfo (in the show's root folder)
 */
const writeNfoForMedia = (media) => {
  try {
    const filePath = media.file_path;
    if (!filePath || !fs.existsSync(filePath)) return null;

    let nfoContent;
    let nfoPath;

    if (media.type === 'series' && media.season && media.episode) {
      // Episode NFO: same name as video file
      nfoContent = generateEpisodeNfo(media);
      nfoPath = filePath.replace(path.extname(filePath), '.nfo');
    } else if (media.type === 'series') {
      // TV Show NFO: tvshow.nfo in the show's directory
      nfoContent = generateTvShowNfo(media);
      nfoPath = path.join(path.dirname(filePath), 'tvshow.nfo');
    } else {
      // Movie NFO: same name as video file
      nfoContent = generateMovieNfo(media);
      nfoPath = filePath.replace(path.extname(filePath), '.nfo');
    }

    fs.writeFileSync(nfoPath, nfoContent, 'utf-8');
    return nfoPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('Error writing NFO:', error.message);
    return null;
  }
};

/**
 * Reads an NFO file associated with a media file
 */
const readNfoForMedia = (filePath) => {
  try {
    if (!filePath) return null;

    // Try same-name .nfo
    const sameNameNfo = filePath.replace(path.extname(filePath), '.nfo');
    if (fs.existsSync(sameNameNfo)) {
      const content = fs.readFileSync(sameNameNfo, 'utf-8');
      return { path: sameNameNfo, content, parsed: parseNfo(content) };
    }

    // Try tvshow.nfo in same directory
    const tvshowNfo = path.join(path.dirname(filePath), 'tvshow.nfo');
    if (fs.existsSync(tvshowNfo)) {
      const content = fs.readFileSync(tvshowNfo, 'utf-8');
      return { path: tvshowNfo, content, parsed: parseNfo(content) };
    }

    // Try movie.nfo in same directory
    const movieNfo = path.join(path.dirname(filePath), 'movie.nfo');
    if (fs.existsSync(movieNfo)) {
      const content = fs.readFileSync(movieNfo, 'utf-8');
      return { path: movieNfo, content, parsed: parseNfo(content) };
    }

    return null;
  } catch (error) {
    console.error('Error reading NFO:', error.message);
    return null;
  }
};

/**
 * Finds NFO path for a media file (without reading content)
 */
const findNfoPath = (filePath) => {
  if (!filePath) return null;
  const sameNameNfo = filePath.replace(path.extname(filePath), '.nfo');
  if (fs.existsSync(sameNameNfo)) return sameNameNfo.replace(/\\/g, '/');
  
  const tvshowNfo = path.join(path.dirname(filePath), 'tvshow.nfo');
  if (fs.existsSync(tvshowNfo)) return tvshowNfo.replace(/\\/g, '/');
  
  return null;
};

module.exports = {
  generateMovieNfo,
  generateTvShowNfo,
  generateEpisodeNfo,
  parseNfo,
  writeNfoForMedia,
  readNfoForMedia,
  findNfoPath
};
