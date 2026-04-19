<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useDesktopStore, type WindowApp } from '../stores/desktop';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { 
  Folder, 
  Settings, 
  Activity, 
  User, 
  Search,
  Grid,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  Power,
  Terminal,
  CheckCircle2,
  Database
} from 'lucide-vue-next';
import Window from '../components/Window.vue';
import DesktopIcon from '../components/DesktopIcon.vue';
import Files from './Files.vue';
import Apps from './Apps.vue';
import Home from './Home.vue';
import ControlPanel from './ControlPanel.vue';
import TerminalView from './Terminal.vue';

const auth = useAuthStore();
const desktop = useDesktopStore();
const router = useRouter();

const stats = ref<any>({ cpu: 0, ram: 0, disk: 0, details: {} });
const state = reactive({
  showUserMenu: false,
  showStatus: true,
  currentVersion: null as string | null
});

const toggleUserMenu = () => state.showUserMenu = !state.showUserMenu;
const closeUserMenu = () => state.showUserMenu = false;

const openWindows = computed(() => {
  return Object.values(desktop.windows).filter(w => w.isOpen);
});

const handleTaskbarClick = (appId: WindowApp) => {
  const win = desktop.windows[appId];
  if (win.isMinimized) {
    desktop.toggleMinimize(appId);
  } else if (win.zIndex === desktop.topZIndex) {
    desktop.toggleMinimize(appId);
  } else {
    desktop.focusWindow(appId);
  }
};

const fetchStats = async () => {
  try {
    const res = await axios.get('/api/system/stats');
    const data = res.data;
    if (state.currentVersion && data.version !== state.currentVersion) {
      window.location.reload();
      return;
    }
    if (!state.currentVersion) state.currentVersion = data.version;
    stats.value = data;
  } catch (err) {
    console.error('Error fetching stats');
  }
};

const fetchExternalDrives = async () => {
  try {
    const res = await axios.get('/api/system/external-drives');
    const startX = 130; 
    const dynamicIcons = res.data.map((drive: any, index: number) => ({
      ...drive,
      x: startX + Math.floor(index / 5) * 110,
      y: (index % 5) * 120 + 20
    }));
    desktop.setDynamicIcons(dynamicIcons);
  } catch (err) {
    console.error('Error fetching external drives');
  }
};

let statsTimer: any;
let driveTimer: any;

onMounted(() => {
  fetchStats();
  fetchExternalDrives();
  statsTimer = setInterval(fetchStats, 5000);
  driveTimer = setInterval(fetchExternalDrives, 10000);
});

onUnmounted(() => {
  clearInterval(statsTimer);
  clearInterval(driveTimer);
});

const handleLogout = () => {
  auth.logout();
  router.push('/login');
};

const handleReboot = async () => {
  if (confirm('¿Reiniciar sistema?')) {
    await axios.post('/api/system/reboot');
  }
};

const handleShutdown = async () => {
  if (confirm('¿Apagar sistema?')) {
    await axios.post('/api/system/shutdown');
  }
};

const formatUptime = (seconds: number) => {
  if (!seconds) return '0 d 00:00:00';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatGB = (bytes: number) => {
  if (!bytes) return '0 GB';
  return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
};
</script>

<template>
  <div class="desktop-container" :style="{ backgroundImage: `url(${desktop.wallpaper})` }">
    <!-- Top Bar -->
    <header class="top-bar glass">
      <div class="top-left">
        <button class="menu-btn" title="Menú Principal"><Grid :size="20" /></button>
        <div class="logo-container">
          <img src="/src/assets/logo.png" alt="NubeOS" class="top-logo" />
          <span class="os-name">NubeOS</span>
        </div>
      </div>

      <div class="taskbar">
        <button 
          v-for="win in openWindows" 
          :key="win.id"
          class="taskbar-item"
          :class="{ active: !win.isMinimized && win.zIndex === desktop.topZIndex, minimized: win.isMinimized }"
          @click="handleTaskbarClick(win.id)"
        >
          <component :size="16" :is="win.id === 'files' ? Folder : win.id === 'apps' ? LayoutDashboard : win.id === 'monitor' ? Activity : win.id === 'terminal' ? Terminal : Settings" />
          <span class="taskbar-label">{{ win.title }}</span>
        </button>
      </div>
      
      <div class="top-right">
        <div class="system-icons">
          <button class="icon-btn" title="Buscar"><Search :size="18"/></button>
          <button class="icon-btn" title="Estado" @click="state.showStatus = !state.showStatus"><Activity :size="18"/></button>
        </div>
        <div class="time">{{ new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</div>
        
        <div class="user-pill-container">
          <div class="user-pill" @click="toggleUserMenu" :class="{ active: state.showUserMenu }">
            <div class="user-avatar"><User :size="14" /></div>
            <span class="user-nick">{{ auth.user?.username }}</span>
          </div>
          
          <Transition name="fade">
            <div v-if="state.showUserMenu" class="user-dropdown">
              <div class="dropdown-header">
                <div class="user-avatar-large"><User :size="24"/></div>
                <div class="user-info-large">
                  <div class="username-large">{{ auth.user?.username }}</div>
                  <div class="user-role-large">Administrador</div>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleLogout"><LogOut :size="16" /> Cerrar sesión</button>
              <button class="dropdown-item" @click="handleReboot"><RotateCcw :size="16" /> Reiniciar</button>
              <button class="dropdown-item power" @click="handleShutdown"><Power :size="16" /> Apagar</button>
            </div>
          </Transition>
        </div>
        <div v-if="state.showUserMenu" class="menu-overlay" @click="closeUserMenu"></div>
      </div>
    </header>

    <main class="desktop-area">
      <div class="icons-container">
        <DesktopIcon v-for="icon in desktop.desktopIcons" :key="icon.id" :iconData="icon" />
        <DesktopIcon v-for="icon in desktop.dynamicIcons" :key="icon.id" :iconData="icon" />
      </div>

      <!-- Windows Layer -->
      <Window appId="files" title="Archivos"><Files /></Window>
      <Window appId="apps" title="Aplicaciones"><Apps /></Window>
      <Window appId="monitor" title="Monitor"><Home /></Window>
      <Window appId="admin" title="Panel" v-if="auth.admin"><ControlPanel /></Window>
      <Window appId="terminal" title="Terminal" :noPadding="true"><TerminalView /></Window>
      
      <!-- System Widget -->
      <aside class="syno-style" v-if="state.showStatus">
        <div class="syno-section health">
          <div class="section-title"><CheckCircle2 :size="14" class="title-icon"/> SALUD DEL SISTEMA</div>
          <div class="health-content">
            <CheckCircle2 :size="40" color="#22c55e" />
            <div class="status-text">
              <div class="status-main">En buen estado</div>
              <div class="status-sub">Su NubeOS funciona bien.</div>
            </div>
          </div>
          <div class="syno-info-list">
            <div class="info-row" v-if="stats.hostname"><span class="label">Nombre</span> <span class="val">{{ stats.hostname }}</span></div>
            <div class="info-row" v-if="stats.ip"><span class="label">IP Local</span> <span class="val">{{ stats.ip }}</span></div>
            <div class="info-row" v-if="stats.details?.uptime"><span class="label">Uptime</span> <span class="val">{{ formatUptime(stats.details.uptime) }}</span></div>
          </div>
        </div>

        <div class="syno-section resources">
          <div class="section-title"><Activity :size="14" class="title-icon"/> MONITOR DE RECURSOS</div>
          <div class="res-item">
            <span class="label">CPU</span>
            <div class="bar-bg"><div class="bar" :style="{ width: (stats.cpu || 0) + '%' }">{{ stats.cpu || 0 }}%</div></div>
          </div>
          <div class="res-item">
            <span class="label">RAM</span>
            <div class="bar-bg"><div class="bar" :style="{ width: (stats.ram || 0) + '%' }">{{ stats.ram || 0 }}%</div></div>
          </div>
        </div>

        <div class="syno-section storage">
          <div class="section-title"><Database :size="14" class="title-icon"/> ALMACENAMIENTO</div>
          <div class="storage-item">
            <Database :size="24" color="#3b82f6" style="margin-top: 5px"/>
            <div class="storage-info">
              <div class="storage-label">Volumen 1</div>
              <div class="bar-bg"><div class="bar" :style="{ width: (stats.disk || 0) + '%' }"></div></div>
              <div class="storage-data">{{ formatGB(stats.details?.diskUsed || 0) }} / {{ formatGB(stats.details?.diskTotal || 0) }}</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.desktop-container {
  width: 100vw;
  height: 100vh;
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background-color: #000;
}

.top-bar {
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  z-index: 2100;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.top-logo {
  height: 24px !important;
  width: 24px !important;
  min-width: 24px;
  min-height: 24px;
  object-fit: contain;
}

.os-name { font-weight: 700; font-size: 1.1rem; color: white; margin-left: -0.25rem;}

.taskbar {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  overflow: hidden;
}

.taskbar-item {
  height: 36px;
  padding: 0 0.75rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
}

.taskbar-item:hover { background: rgba(255,255,255,0.1); }

.taskbar-item.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: white;
}

.desktop-area {
  flex: 1;
  position: relative;
  z-index: 10;
  pointer-events: auto;
}

.icons-container {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  padding: 1.5rem;
  display: grid;
  grid-template-rows: repeat(auto-fill, 100px);
  grid-auto-flow: column;
  gap: 1.5rem;
  pointer-events: none;
  z-index: 20;
}

.icons-container > * { pointer-events: auto; }

.syno-style {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 260px;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 100;
  padding: 0;
  overflow: hidden;
  color: white;
}

.syno-section { padding: 1rem; border-bottom: 2px solid rgba(0,0,0,0.2); }
.section-title { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem; }
.health-content { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.status-main { font-weight: 700; color: #22c55e; font-size: 1rem;}
.status-sub { font-size: 0.7rem; color: #94a3b8; }
.syno-info-list { font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.3rem;}
.info-row { display: flex; justify-content: space-between; }
.info-row .label { color: #94a3b8; }

.bar-bg { flex: 1; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; position: relative; }
.bar { height: 100%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: white; transition: width 0.4s; }
.res-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.res-item .label { font-size: 0.7rem; width: 30px; font-weight: 700; }

.storage-item { display: flex; gap: 0.75rem; align-items: flex-start; }
.storage-label { font-size: 0.75rem; font-weight: 700; margin-bottom: 4px; }
.storage-data { font-size: 0.65rem; color: #3b82f6; margin-top: 4px; }

.user-pill-container { display: flex; align-items: center; position: relative; }
.user-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.6rem; border-radius: 20px; background: rgba(255,255,255,0.05); cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
.user-pill:hover, .user-pill.active { background: rgba(255,255,255,0.1); }
.user-avatar { width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;}
.user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 240px; background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2100; padding: 0.5rem; }
.dropdown-item { width: 100%; text-align: left; padding: 0.6rem 1rem; color: #e2e8f0; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; background: transparent; border: none; cursor: pointer; }
.dropdown-item:hover { background: rgba(255,255,255,0.05); }
.dropdown-item.power:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }

.menu-overlay { position: fixed; inset: 0; z-index: 2050; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }

.time { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; margin: 0 0.5rem;}
.system-icons { display: flex; gap: 0.25rem; }
.icon-btn { background: transparent; color: white; padding: 0.5rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; }
.icon-btn:hover { background: rgba(255,255,255,0.1); }
</style>
