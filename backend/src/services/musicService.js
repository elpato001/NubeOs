const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * MusicBrainz API Service + Cover Art Archive
 * Used for music identification and artwork retrieval.
 */
const BASE_URL = 'https://musicbrainz.org/ws/2';
const COVER_URL = 'https://coverartarchive.org/release';

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
      const release = data.releases[0];
      // Try to get cover art URL automatically
      release.coverUrl = await getCoverArt(release.id);
      return release;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getCoverArt = async (releaseMbid) => {
  try {
    const response = await fetch(`${COVER_URL}/${releaseMbid}`, {
      headers: { 'User-Agent': 'EntertainmentOS/1.0.0' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.images && data.images.length > 0) {
      const front = data.images.find(img => img.front) || data.images[0];
      return front.image;
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = { searchArtist, searchRelease, getCoverArt };
