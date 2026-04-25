const db = require('../config/db');

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const getApiKey = () => {
  const config = db.prepare("SELECT value FROM system_config WHERE key = 'tmdb_api_key'").get();
  return config ? config.value : null;
};

/**
 * Quick search - returns first result (used for auto-scraping during library scan)
 */
const searchMedia = async (title, year, type = 'movie') => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const endpoint = type === 'series' ? '/search/tv' : '/search/movie';
    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      year: (year || '').toString(),
      language: 'es-ES'
    });

    const response = await fetch(`${BASE_URL}${endpoint}?${params.toString()}`);
    if (!response.ok) return null;
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        tmdbId: result.id,
        title: result.title || result.name,
        description: result.overview,
        rating: (result.vote_average || 0).toFixed(1),
        year: (result.release_date || result.first_air_date || '').split('-')[0],
        posterPath: result.poster_path ? `${IMAGE_BASE_URL}${result.poster_path}` : null,
        bannerPath: result.backdrop_path ? `${BACKDROP_BASE_URL}${result.backdrop_path}` : null
      };
    }
    return null;
  } catch (error) {
    console.error('TMDB Search Error:', error.message);
    return null;
  }
};

/**
 * Search results list - returns multiple results for manual identification
 */
const searchTmdbRaw = async (query, type = 'movie') => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const endpoint = type === 'series' ? '/search/tv' : '/search/movie';
    const params = new URLSearchParams({
      api_key: apiKey,
      query: query,
      language: 'es-ES'
    });

    const response = await fetch(`${BASE_URL}${endpoint}?${params.toString()}`);
    const data = await response.json();
    
    return (data.results || []).map(entry => ({
      id: entry.id,
      title: entry.title || entry.name,
      year: (entry.release_date || entry.first_air_date || '').split('-')[0],
      poster: entry.poster_path ? `${IMAGE_BASE_URL}${entry.poster_path}` : null,
      description: entry.overview,
      rating: (entry.vote_average || 0).toFixed(1),
      type: type
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Multi-search - searches both movies and TV shows at once
 */
const searchMulti = async (query) => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: query,
      language: 'es-ES'
    });

    const response = await fetch(`${BASE_URL}/search/multi?${params.toString()}`);
    const data = await response.json();

    return (data.results || [])
      .filter(entry => entry.media_type === 'movie' || entry.media_type === 'tv')
      .map(entry => ({
        id: entry.id,
        title: entry.title || entry.name,
        year: (entry.release_date || entry.first_air_date || '').split('-')[0],
        poster: entry.poster_path ? `${IMAGE_BASE_URL}${entry.poster_path}` : null,
        description: entry.overview,
        rating: (entry.vote_average || 0).toFixed(1),
        type: entry.media_type === 'tv' ? 'series' : 'movie'
      }));
  } catch (error) {
    return [];
  }
};

/**
 * ENHANCED: Get full media details with all MediaElch-style metadata
 * Includes credits (director, writer), certifications, trailers, collection/set info
 */
const getMediaDetails = async (tmdbId, type = 'movie') => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const endpoint = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    // append_to_response gets credits, videos, release_dates in a single API call
    const appendExtra = type === 'series' 
      ? 'credits,videos,content_ratings,external_ids'
      : 'credits,videos,release_dates,external_ids';
    
    const response = await fetch(
      `${BASE_URL}${endpoint}?api_key=${apiKey}&language=es-ES&append_to_response=${appendExtra}`
    );
    const data = await response.json();

    if (!data.id) return null;

    // Extract director(s) and writer(s) from credits
    let directors = [];
    let writers = [];
    if (data.credits?.crew) {
      directors = data.credits.crew
        .filter(c => c.job === 'Director')
        .map(c => c.name);
      writers = data.credits.crew
        .filter(c => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story')
        .map(c => c.name);
    }

    // Extract trailer URL (prefer YouTube)
    let trailerUrl = null;
    if (data.videos?.results) {
      const trailer = data.videos.results.find(v => 
        v.type === 'Trailer' && v.site === 'YouTube'
      ) || data.videos.results.find(v => v.site === 'YouTube');
      if (trailer) {
        trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }
    }

    // Extract certification/rating (MPAA for movies, content_rating for TV)
    let certification = null;
    if (type === 'movie' && data.release_dates?.results) {
      // Try US first, then any available
      const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
      const anyRelease = data.release_dates.results[0];
      const releaseInfo = usRelease || anyRelease;
      if (releaseInfo?.release_dates?.length > 0) {
        certification = releaseInfo.release_dates[0].certification || null;
      }
    } else if (type === 'series' && data.content_ratings?.results) {
      const usRating = data.content_ratings.results.find(r => r.iso_3166_1 === 'US');
      const anyRating = data.content_ratings.results[0];
      certification = (usRating || anyRating)?.rating || null;
    }

    // Extract IMDb ID
    let imdbId = data.imdb_id || (data.external_ids?.imdb_id) || null;

    // Extract set/collection info (movies only)
    let setName = null;
    if (type === 'movie' && data.belongs_to_collection) {
      setName = data.belongs_to_collection.name;
    }

    // Extract Cast (top 10 actors)
    let cast = [];
    if (data.credits?.cast) {
      cast = data.credits.cast.slice(0, 10).map(actor => ({
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `${IMAGE_BASE_URL}${actor.profile_path}` : null
      }));
    }

    return {
      tmdbId: data.id,
      title: data.title || data.name,
      description: data.overview,
      rating: (data.vote_average || 0).toFixed(1),
      year: (data.release_date || data.first_air_date || '').split('-')[0],
      posterPath: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
      bannerPath: data.backdrop_path ? `${BACKDROP_BASE_URL}${data.backdrop_path}` : null,
      genres: (data.genres || []).map(g => g.name).join(', '),
      // Enhanced fields
      tagline: data.tagline || null,
      runtime: data.runtime || (data.episode_run_time?.[0]) || null,
      certification: certification,
      trailerUrl: trailerUrl,
      imdbId: imdbId,
      director: directors.join(', ') || null,
      writer: writers.join(', ') || null,
      studio: (data.production_companies || []).map(c => c.name).join(', ') || null,
      country: (data.production_countries || []).map(c => c.name).join(', ') || null,
      setName: setName,
      cast: cast, // Added Cast
      // Collection details for set poster
      collection: data.belongs_to_collection ? {
        id: data.belongs_to_collection.id,
        name: data.belongs_to_collection.name,
        posterPath: data.belongs_to_collection.poster_path 
          ? `${IMAGE_BASE_URL}${data.belongs_to_collection.poster_path}` : null,
        backdropPath: data.belongs_to_collection.backdrop_path
          ? `${BACKDROP_BASE_URL}${data.belongs_to_collection.backdrop_path}` : null
      } : null,
      // Number of seasons for TV shows
      seasons: data.number_of_seasons || null,
      episodes: data.number_of_episodes || null
    };
  } catch (error) {
    console.error('TMDB Details Error:', error.message);
    return null;
  }
};

/**
 * Get available images for a media item (posters and backdrops)
 * Used to allow user to choose between multiple images
 */
const getMediaImages = async (tmdbId, type = 'movie') => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const endpoint = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const response = await fetch(
      `${BASE_URL}${endpoint}/images?api_key=${apiKey}&include_image_language=es,en,null`
    );
    const data = await response.json();

    return {
      posters: (data.posters || []).slice(0, 12).map(p => ({
        path: `${IMAGE_BASE_URL}${p.file_path}`,
        width: p.width,
        height: p.height,
        rating: p.vote_average,
        language: p.iso_639_1
      })),
      backdrops: (data.backdrops || []).slice(0, 12).map(b => ({
        path: `${BACKDROP_BASE_URL}${b.file_path}`,
        width: b.width,
        height: b.height,
        rating: b.vote_average
      }))
    };
  } catch (error) {
    return null;
  }
};

/**
 * Get details for a specific episode of a TV show
 */
const getEpisodeDetails = async (tvShowId, seasonNumber, episodeNumber) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${apiKey}&language=es-ES`
    );
    const data = await response.json();

    if (!data.id) return null;

    return {
      title: data.name,
      description: data.overview,
      rating: (data.vote_average || 0).toFixed(1),
      stillPath: data.still_path ? `${BACKDROP_BASE_URL}${data.still_path}` : null,
      airDate: data.air_date,
      runtime: data.runtime
    };
  } catch (error) {
    console.error('TMDB Episode Details Error:', error.message);
    return null;
  }
};

module.exports = { searchMedia, searchTmdbRaw, searchMulti, getMediaDetails, getMediaImages, getEpisodeDetails };
