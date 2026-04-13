const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Helper to run shell commands safely
const runCommand = (cmd) => {
  try {
    return execSync(cmd).toString().trim();
  } catch (e) {
    console.error(`Command failed: ${cmd}`, e.message);
    return null;
  }
};

// GET current storage configuration
router.get('/info', authMiddleware, (req, res) => {
  if (process.platform !== 'linux') {
    return res.json({ 
      error: 'La gestión de almacenamiento solo está disponible en sistemas Linux.',
      disks: [] 
    });
  }

  try {
    // Get disk and partition information using lsblk in JSON format
    // -b: bytes, -J: json, -o: output columns
    const rawLsblk = runCommand('lsblk -bJ -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL,SERIAL,UUID,STATE');
    if (!rawLsblk) throw new Error('No se pudo obtener información de almacenamiento');

    const storageInfo = JSON.parse(rawLsblk);

    // Process and simplify for the frontend
    const disks = storageInfo.blockdevices.filter(d => d.type === 'disk' || d.type === 'raid');

    res.json({ disks });
  } catch (error) {
    res.status(500).json({ error: 'Error al leer configuración de almacenamiento', details: error.message });
  }
});

module.exports = router;
