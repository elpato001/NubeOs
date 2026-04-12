const Docker = require('dockerode');
const isLinux = process.platform === 'linux';

// Initialize Docker with default settings or specific Linux socket
const docker = new Docker(isLinux ? { socketPath: '/var/run/docker.sock' } : {}); 

let isMockMode = false;

const getContainers = async () => {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id,
      name: c.Names[0].replace('/', ''),
      image: c.Image,
      status: c.State,
      state: c.Status
    }));
  } catch (error) {
    console.warn('⚠️ Docker no accesible:', error.message);
    // If permission denied or dev mode, return mock data to keep UI functional
    if (process.env.NODE_ENV === 'development' || error.message.includes('permission denied') || error.code === 'ENOENT') {
      isMockMode = true;
      return [
        { id: '1', name: 'Nextcloud (Modo Demo)', image: 'nextcloud:latest', status: 'running', state: 'Up 2 horas' },
        { id: '2', name: 'Pi-hole (Modo Demo)', image: 'pihole/pihole:latest', status: 'exited', state: 'Exited (0) 5 days ago' },
        { id: '3', name: 'Plex (Modo Demo)', image: 'plexinc/pms-docker', status: 'running', state: 'Up 10 minutos' }
      ];
    }
    return [];
  }
};

const getAvailableApps = () => {
  return [
    // Cloud
    { id: 'nextcloud', name: 'Nextcloud', description: 'Nube personal y colaboración.', image: 'nextcloud', icon: '☁️', category: 'cloud', developer: 'Nextcloud GmbH', ports: { '80/tcp': 8080 } },
    { id: 'syncthing', name: 'Syncthing', description: 'Sincronización de archivos P2P.', image: 'syncthing/syncthing', icon: '🔄', category: 'cloud', developer: 'Syncthing Foundation', ports: { '8384/tcp': 8384 } },
    // Media
    { id: 'plex', name: 'Plex', description: 'Servidor de medios avanzado.', image: 'plexinc/pms-docker', icon: '🎬', category: 'media', developer: 'Plex Inc.', ports: { '32400/tcp': 32400 } },
    { id: 'jellyfin', name: 'Jellyfin', description: 'Medios libres y sin restricciones.', image: 'jellyfin/jellyfin', icon: '📺', category: 'media', developer: 'Jellyfin Project', ports: { '8096/tcp': 8096 } },
    { id: 'photoprism', name: 'PhotoPrism', description: 'Galería de fotos con IA.', image: 'photoprism/photoprism', icon: '📷', category: 'media', developer: 'PhotoPrism UG', ports: { '2342/tcp': 2342 } },
    // Productivity
    { id: 'homeassistant', name: 'Home Assistant', description: 'Domótica inteligente.', image: 'homeassistant/home-assistant', icon: '🏠', category: 'productivity', developer: 'Nabu Casa', ports: { '8123/tcp': 8123 } },
    { id: 'gitea', name: 'Gitea', description: 'Servidor Git ligero.', image: 'gitea/gitea', icon: '🐙', category: 'development', developer: 'Gitea Community', ports: { '3001/tcp': 3001 } },
    { id: 'codeserver', name: 'Code Server', description: 'VS Code en el navegador.', image: 'codercom/code-server', icon: '💻', category: 'development', developer: 'Coder Inc.', ports: { '8443/tcp': 8443 } },
    // Database
    { id: 'mariadb', name: 'MariaDB', description: 'Base de datos SQL.', image: 'mariadb', icon: '🗄️', category: 'database', developer: 'MariaDB Foundation', ports: { '3306/tcp': 3306 } },
    { id: 'postgres', name: 'PostgreSQL', description: 'Base de datos relacional avanzada.', image: 'postgres', icon: '🐘', category: 'database', developer: 'PostgreSQL Global', ports: { '5432/tcp': 5432 } },
    { id: 'redis', name: 'Redis', description: 'Almacén clave-valor en memoria.', image: 'redis', icon: '⚡', category: 'database', developer: 'Redis Ltd.', ports: { '6379/tcp': 6379 } },
    // Security
    { id: 'pihole', name: 'Pi-hole', description: 'Bloqueador de anuncios DNS.', image: 'pihole/pihole', icon: '🛡️', category: 'security', developer: 'Pi-hole LLC', ports: { '80/tcp': 8081 } },
    { id: 'wireguard', name: 'WireGuard', description: 'VPN rápida y moderna.', image: 'linuxserver/wireguard', icon: '🔒', category: 'security', developer: 'LinuxServer.io', ports: { '51820/udp': 51820 } },
    // Utilities
    { id: 'transmission', name: 'Transmission', description: 'Cliente BitTorrent ligero.', image: 'linuxserver/transmission', icon: '⏬', category: 'utilities', developer: 'LinuxServer.io', ports: { '9091/tcp': 9091 } },
    { id: 'portainer', name: 'Portainer', description: 'Gestión visual de contenedores.', image: 'portainer/portainer-ce', icon: '🐳', category: 'utilities', developer: 'Portainer.io', ports: { '9000/tcp': 9000 } },
    { id: 'uptime', name: 'Uptime Kuma', description: 'Monitoreo de servicios.', image: 'louislam/uptime-kuma', icon: '📊', category: 'utilities', developer: 'Louis Lam', ports: { '3001/tcp': 3002 } },
  ];
};

const installApp = async (appId) => {
  if (isMockMode) return true;
  
  const apps = getAvailableApps();
  const app = apps.find(a => a.id === appId);
  if (!app) throw new Error('Aplicación no encontrada en la tienda');

  // Pull image
  await new Promise((resolve, reject) => {
    docker.pull(app.image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  });

  // Prepare Port Bindings
  const portBindings = {};
  const exposedPorts = {};
  for (const [containerPort, hostPort] of Object.entries(app.ports)) {
    portBindings[containerPort] = [{ HostPort: hostPort.toString() }];
    exposedPorts[containerPort] = {};
  }

  // Create Container
  const container = await docker.createContainer({
    Image: app.image,
    name: `nubeos-${app.id}`,
    ExposedPorts: exposedPorts,
    HostConfig: {
      PortBindings: portBindings,
      RestartPolicy: { Name: 'always' }
    }
  });

  return await container.start();
};

const startContainer = async (id) => {
  if (isMockMode) return true;
  const container = docker.getContainer(id);
  return await container.start();
};

const stopContainer = async (id) => {
  if (isMockMode) return true;
  const container = docker.getContainer(id);
  return await container.stop();
};

module.exports = {
  getContainers,
  getAvailableApps,
  startContainer,
  stopContainer,
  installApp,
  isMockMode: () => isMockMode
};
