const https = require('https');
const http = require('http');

/**
 * Simple M3U Parser for IPTV
 */
class IptvService {
  async fetchM3u(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data); });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  parseM3u(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Extract attributes
        const info = line.substring(8);
        const nameMatch = info.match(/,(.*)$/);
        const groupMatch = info.match(/group-title="(.*?)"/);
        const logoMatch = info.match(/tvg-logo="(.*?)"/);
        const idMatch = info.match(/tvg-id="(.*?)"/);

        currentChannel = {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
          group: groupMatch ? groupMatch[1] : 'General',
          logo: logoMatch ? logoMatch[1] : null,
          tvgId: idMatch ? idMatch[1] : null,
        };
      } else if (line.startsWith('http') && currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }

    return channels;
  }
}

module.exports = new IptvService();
