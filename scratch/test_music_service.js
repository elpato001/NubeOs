const musicService = require('../backend/src/services/musicService');

async function test() {
  console.log('Testing MusicBrainz Artist Search...');
  const artist = await musicService.searchArtist('The Rolling Stones');
  console.log('Result:', artist ? artist.name : 'Not found');
  
  console.log('\nTesting MusicBrainz Release Search...');
  const release = await musicService.searchRelease('Sticky Fingers', 'The Rolling Stones');
  console.log('Result:', release ? release.title : 'Not found');
}

test();
