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

// GET current network configuration
router.get('/', authMiddleware, (req, res) => {
  if (process.platform !== 'linux') {
    return res.json({ 
      error: 'La gestión de red solo está disponible en sistemas Linux.',
      interfaces: [] 
    });
  }

  try {
    // Get active interfaces using nmcli
    // Format: DEVICE:TYPE:STATE:CONNECTION
    const rawDevices = runCommand('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device');
    if (!rawDevices) throw new Error('No se pudo obtener información de red');

    const interfaces = rawDevices.split('\n').map(line => {
      const [name, type, state, conn] = line.split(':');
      
      // Only process ethernet and wifi
      if (type !== 'ethernet' && type !== 'wifi') return null;

      // Get details for the connection
      let ip = '', gateway = '', dns = '', method = 'auto';
      if (conn) {
        const details = runCommand(`nmcli -t -f IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,ipv4.method connection show "${conn}"`);
        if (details) {
          const detailMap = {};
          details.split('\n').forEach(d => {
            const [k, v] = d.split(':');
            detailMap[k] = v;
          });
          ip = detailMap['IP4.ADDRESS'] ? detailMap['IP4.ADDRESS'].split('/')[0] : '';
          gateway = detailMap['IP4.GATEWAY'] || '';
          dns = detailMap['IP4.DNS'] || '';
          method = detailMap['ipv4.method'] || 'auto';
        }
      }

      return { name, type, state, connection: conn, ip, gateway, dns, method };
    }).filter(i => i !== null);

    res.json({ interfaces });
  } catch (error) {
    res.status(500).json({ error: 'Error al leer configuración de red', details: error.message });
  }
});

// SAVE network configuration
router.post('/save', authMiddleware, adminMiddleware, (req, res) => {
  const { connection, method, ip, mask, gateway, dns } = req.body;

  if (process.platform !== 'linux') {
    return res.status(400).json({ error: 'Operación no permitida en este OS' });
  }

  if (!connection) {
    return res.status(400).json({ error: 'No se especificó una conexión válida' });
  }

  try {
    let cmd = `nmcli connection modify "${connection}" ipv4.method ${method}`;
    
    if (method === 'manual') {
      if (!ip || !mask || !gateway) {
        return res.status(400).json({ error: 'IP, Máscara y Puerta de Enlace son obligatorias para modo estático' });
      }
      cmd += ` ipv4.addresses ${ip}/${mask} ipv4.gateway ${gateway}`;
      if (dns) {
        cmd += ` ipv4.dns "${dns.replace(/,/g, ' ')}"`;
      }
    } else {
      // Clear static settings if switching to DHCP
      cmd += ` ipv4.addresses "" ipv4.gateway "" ipv4.dns ""`;
    }

    // Apply changes
    runCommand(cmd);
    
    // Restart connection (in background to avoid blocking response)
    const restartCmd = `nmcli connection down "${connection}" && nmcli connection up "${connection}"`;
    require('child_process').exec(restartCmd);

    res.json({ 
      success: true, 
      message: 'Configuración aplicada. La interfaz se está reiniciando, es posible que pierdas la conexión momentáneamente.' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al aplicar configuración', details: error.message });
  }
});

module.exports = router;
