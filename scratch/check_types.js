const db = require('./backend/src/config/db');
const types = db.prepare('SELECT DISTINCT type FROM eo_media').all();
console.log('Media Types in DB:', types);
