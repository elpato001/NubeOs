const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Resolve DB path: target /opt/nubeos/data/db/nubeos.sqlite or relative for development
let dbPath;
const envDbPath = process.env.DB_PATH || 'data/db/nubeos.sqlite';

if (path.isAbsolute(envDbPath)) {
  dbPath = envDbPath;
} else {
  // Standard project structure: backend/src/config/db.js -> ../../ is backend root
  dbPath = path.resolve(__dirname, '../../', envDbPath);
}

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS eo_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    series_name TEXT,
    season INTEGER,
    episode INTEGER,
    description TEXT,
    type TEXT CHECK(type IN ('movie', 'series', 'music')) NOT NULL,
    genre TEXT,
    year INTEGER,
    rating TEXT,
    poster_path TEXT,
    banner_path TEXT,
    file_path TEXT UNIQUE NOT NULL,
    stars INTEGER DEFAULT 5,
    is_new INTEGER DEFAULT 1,
    tagline TEXT,
    certification TEXT,
    runtime INTEGER,
    trailer_url TEXT,
    imdb_id TEXT,
    tmdb_id INTEGER,
    director TEXT,
    writer TEXT,
    studio TEXT,
    country TEXT,
    nfo_path TEXT,
    set_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eo_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    tmdb_id INTEGER,
    overview TEXT,
    poster_path TEXT,
    banner_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eo_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    seconds INTEGER DEFAULT 0,
    is_finished INTEGER DEFAULT 0,
    last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(media_id) REFERENCES eo_media(id),
    UNIQUE(user_id, media_id)
  );

  CREATE TABLE IF NOT EXISTS eo_libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'movie',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eo_iptv_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS eo_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    media_id INTEGER,
    iptv_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(media_id) REFERENCES eo_media(id),
    UNIQUE(user_id, media_id),
    UNIQUE(user_id, iptv_url)
  );
`);


// Migration: Ensure 'type' column exists in eo_libraries
try {
  db.exec("ALTER TABLE eo_libraries ADD COLUMN type TEXT DEFAULT 'movie'");
} catch (e) {}

// Migration: Add enhanced metadata columns to eo_media
const newColumns = [
  { name: 'tagline', def: 'TEXT' },
  { name: 'certification', def: 'TEXT' },
  { name: 'runtime', def: 'INTEGER' },
  { name: 'trailer_url', def: 'TEXT' },
  { name: 'imdb_id', def: 'TEXT' },
  { name: 'tmdb_id', def: 'INTEGER' },
  { name: 'director', def: 'TEXT' },
  { name: 'writer', def: 'TEXT' },
  { name: 'studio', def: 'TEXT' },
  { name: 'country', def: 'TEXT' },
  { name: 'nfo_path', def: 'TEXT' },
  { name: 'set_name', def: 'TEXT' },
  { name: 'actors', def: 'TEXT' }
];
newColumns.forEach(col => {
  try { db.exec(`ALTER TABLE eo_media ADD COLUMN ${col.name} ${col.def}`); } catch (e) {}
});

// --- Multimedia Structure Initialization ---
const multimediaBase = path.resolve(__dirname, '../../../data/multimedia');
const defaultLibs = [
  { name: 'Películas', folder: 'Peliculas', type: 'movie' },
  { name: 'Series', folder: 'Series', type: 'series' },
  { name: 'Música', folder: 'Musica', type: 'music' }
];

try {
  defaultLibs.forEach(lib => {
    const fullPath = path.join(multimediaBase, lib.folder);
    
    // 1. Create directory if missing
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Carpeta multimedia creada: ${fullPath}`);
    }

    // 2. Register in DB if missing
    const exists = db.prepare('SELECT id FROM eo_libraries WHERE path = ?').get(fullPath);
    if (!exists) {
      db.prepare('INSERT INTO eo_libraries (path, name, type) VALUES (?, ?, ?)').run(fullPath, lib.name, lib.type);
      console.log(`✅ Librería por defecto mapeada en DB: ${lib.name} (${lib.type})`);
    }
  });
} catch (err) {
  console.error('⚠️ Error inicializando estructura multimedia:', err.message);
}

// --- Default IPTV Lists ---
const defaultIptv = { 
  name: 'Canales Abiertos', 
  url: 'https://cdn.jsdelivr.net/gh/Alplox/json-teles@refs/heads/main/canales.m3u' 
};

try {
  const exists = db.prepare('SELECT id FROM eo_iptv_lists WHERE url = ?').get(defaultIptv.url);
  if (!exists) {
    db.prepare('INSERT INTO eo_iptv_lists (name, url) VALUES (?, ?)').run(defaultIptv.name, defaultIptv.url);
    console.log(`✅ Lista IPTV por defecto añadida: ${defaultIptv.name}`);
  }
} catch (err) {
  console.error('⚠️ Error inicializando lista IPTV:', err.message);
}

console.log('Connected to SQLite database at:', dbPath);

module.exports = db;
