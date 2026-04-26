const path = require('path');
const fs = require('fs');

// Resolve directories relative to the project root (one level above backend/)
const projectRoot = path.resolve(process.cwd(), '..');
const DATA_DIR = path.join(projectRoot, 'data', 'users');
const MULTIMEDIA_DIR = path.join(projectRoot, 'data', 'multimedia');

const getUserRoot = (username) => {
  const userPath = path.join(DATA_DIR, username);
  if (!fs.existsSync(userPath)) {
    fs.mkdirSync(userPath, { recursive: true });
  }
  return userPath;
};

const getSafePath = (username, requestedPath = '') => {
  // Normalize path for consistent slash handling
  const normalizedRequested = requestedPath.replace(/\\/g, '/');

  // Handle Global Multimedia Library
  if (normalizedRequested === 'Multimedia' || normalizedRequested.startsWith('Multimedia/')) {
    const internalPath = normalizedRequested === 'Multimedia' ? '' : normalizedRequested.replace('Multimedia/', '');
    const fullPath = path.resolve(MULTIMEDIA_DIR, internalPath);
    
    // Security check: ensure the path is within the multimedia directory
    if (!fullPath.startsWith(MULTIMEDIA_DIR)) {
      throw new Error('Acceso denegado: Intento de escape de directorio multimedia.');
    }
    return fullPath;
  }

  const root = getUserRoot(username);
  
  // Allow access to /media/nubeos for external drives
  if (requestedPath.startsWith('/media/nubeos')) {
     // Security: Prevent directory traversal even in /media
     const normalized = path.normalize(requestedPath);
     if (!normalized.startsWith('/media/nubeos')) {
       throw new Error('Acceso denegado: Intento de escape en medios externos.');
     }
     return normalized;
  }

  const fullPath = path.resolve(root, requestedPath);
  
  // Security check: ensure the path is within the user's root
  if (!fullPath.startsWith(root)) {
    throw new Error('Acceso denegado: Intento de escape de directorio.');
  }
  
  return fullPath;
};

module.exports = { getUserRoot, getSafePath, DATA_DIR, MULTIMEDIA_DIR };
