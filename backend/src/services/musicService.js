const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * MusicBrainz API Service
 * Used for basic music identification when TMDB is not applicable.
 */
const BASE_URL = 'https://musicbrainz.org/ws/2';

const searchArtist = async (name) => {
  try {
    const response = await fetch(`${BASE_URL}/artist/?query=${encodeURIComponent(name)}&fmt=json`, {
      headers: { 'User-Agent': 'EntertainmentOS/1.0.0 ( contact@nubeos.io )' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.artists && data.artists.length > 0) {
      return data.artists[0];
    }
    return null;
  } catch (error) {
    return null;
  }
};

const searchRelease = async (title, artist = '') => {
  try {
    const query = artist ? `release:${title} AND artist:${artist}` : `release:${title}`;
    const response = await fetch(`${BASE_URL}/release/?query=${encodeURIComponent(query)}&fmt=json`, {
      headers: { 'User-Agent': 'EntertainmentOS/1.0.0 ( contact@nubeos.io )' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.releases && data.releases.length > 0) {
      return data.releases[0];
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = { searchArtist, searchRelease };
