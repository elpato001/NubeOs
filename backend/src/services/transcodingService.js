const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * TranscodingService
 * Manages on-the-fly video transcoding using FFmpeg
 */
class TranscodingService {
  constructor() {
    this.activeProcesses = new Map();
  }

  /**
   * Starts a transcode stream
   * @param {string} filePath - Absolute path to video file
   * @param {string} quality - 'original', '1080p', '720p', '480p'
   * @returns {Object} - { stream, contentType }
   */
  transcode(filePath, quality = 'original') {
    // Quality profiles
    const profiles = {
      '1080p': { width: 1920, bitrate: '5000k' },
      '720p': { width: 1280, bitrate: '2500k' },
      '480p': { width: 854, bitrate: '1000k' }
    };

    if (quality === 'original' || !profiles[quality]) {
      // For original, we just return null so the route can handle it as a direct stream
      return null;
    }

    const profile = profiles[quality];
    
    // FFmpeg arguments for fast transcoding
    // We use libx264 for compatibility
    const args = [
      '-i', filePath,
      '-vf', `scale=${profile.width}:-2`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', profile.bitrate,
      '-bufsize', (parseInt(profile.bitrate) * 2) + 'k',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'matroska', 
      '-threads', '0',
      'pipe:1'
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    return {
      stream: ffmpeg.stdout,
      process: ffmpeg,
      contentType: 'video/x-matroska'
    };
  }
}

module.exports = new TranscodingService();
