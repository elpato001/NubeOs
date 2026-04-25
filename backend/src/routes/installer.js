const express = require('express');
const router = express.Router();
const { exec, execSync } = require('child_process');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Helper to check if we are in "Live" mode
const isLiveMode = () => {
  try {
    return fs.existsSync('/run/archiso/bootmnt') || fs.existsSync('/run/live/medium') || process.env.NUBEOS_INSTALLER === 'true';
  } catch (e) {
    return false;
  }
};

// GET: List target disks for installation
router.get('/disks', async (req, res) => {
  if (process.platform !== 'linux') {
    return res.json([
      { name: 'sda', model: 'Virtual Disk (Simulado)', size: 500107862016, type: 'disk' },
      { name: 'nvme0n1', model: 'Samsung SSD 980 (Simulado)', size: 1000204886016, type: 'disk' }
    ]);
  }

  try {
    const raw = execSync('lsblk -bJ -o NAME,MODEL,SIZE,TYPE,TRAN').toString();
    const data = JSON.parse(raw);
    const disks = data.blockdevices.filter(d => d.type === 'disk' && d.tran !== 'usb'); // Only internal disks
    res.json(disks);
  } catch (e) {
    res.status(500).json({ error: 'Error al listar discos' });
  }
});

// POST: Configure Network (WiFi)
router.post('/network/wifi', async (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid) return res.status(400).json({ error: 'SSID requerido' });

  if (process.platform !== 'linux') {
    return res.json({ success: true, message: 'WiFi conectado (Simulado)' });
  }

  try {
    execSync(`sudo nmcli dev wifi connect "${ssid}" password "${password}"`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fallo al conectar al WiFi' });
  }
});

// POST: Trigger Installation
router.post('/start', async (req, res) => {
  const { disk, username, password, hostname } = req.body;

  if (!disk || !username || !password) {
    return res.status(400).json({ error: 'Faltan datos para la instalación' });
  }

  // En un entorno real, aquí dispararíamos un script de shell pesado
  // que particiona, formatea, copia archivos y configura GRUB.
  
  console.log(`[INSTALLER] Iniciando instalación en /dev/${disk} para usuario ${username}`);

  // Simulamos el progreso mediante un archivo de log que el frontend consultará
  const logFile = '/tmp/nubeos_install.log';
  fs.writeFileSync(logFile, '0%|Iniciando particionado...\n');

  // Comando de instalación real (esto es un ejemplo, requeriría nubeos-install.sh)
  // exec(`sudo /opt/nubeos/scripts/install-to-disk.sh /dev/${disk} ${username} ${password} ${hostname}`);

  res.json({ success: true, message: 'Proceso de instalación iniciado' });

  // Simulación de pasos para el frontend (Sustituir por proceso real)
  let progress = 0;
  const steps = [
    'Particionando disco...',
    'Formateando particiones (EXT4)...',
    'Copiando archivos del sistema...',
    'Instalando dependencias (Docker, Node)...',
    'Configurando usuario administrador...',
    'Instalando cargador de arranque (GRUB)...',
    'Finalizando configuración...'
  ];

  let i = 0;
  const interval = setInterval(() => {
    progress += 15;
    if (progress > 100) {
      progress = 100;
      fs.appendFileSync(logFile, `100%|Instalación completada con éxito. Reinicia el equipo.\n`);
      clearInterval(interval);
    } else {
      fs.appendFileSync(logFile, `${progress}%|${steps[i] || 'Procesando...'}\n`);
      i++;
    }
  }, 3000);
});

// GET: Installation Progress
router.get('/progress', (req, res) => {
  const logFile = '/tmp/nubeos_install.log';
  if (!fs.existsSync(logFile)) {
    return res.json({ progress: 0, message: 'Esperando inicio...' });
  }

  const lastLine = fs.readFileSync(logFile, 'utf8').trim().split('\n').pop();
  const [percent, message] = lastLine.split('|');
  res.json({ progress: parseInt(percent), message });
});

module.exports = router;
