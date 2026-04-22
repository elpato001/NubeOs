const loading = ref(true);
const error = ref(false);
const iframeLoaded = ref(false);

const isLinux = computed(() => {
  return navigator.platform.toLowerCase().includes('linux');
});

const serverUrl = computed(() => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
});

const checkServer = async () => {
  try {
    // Ping the server
    await fetch(serverUrl.value, { mode: 'no-cors', cache: 'no-cache' });
    error.value = false;
  } catch (err) {
    console.warn('MyMediaServer unreachable:', err);
    error.value = true;
    loading.value = false;
  }
};

const handleLoad = () => {
  loading.value = false;
  iframeLoaded.value = true;
};

const retry = () => {
  loading.value = true;
  error.value = false;
  iframeLoaded.value = false;
  checkServer();
};

onMounted(() => {
  checkServer();
  
  // Timeout for loading
  setTimeout(() => {
    if (loading.value && !iframeLoaded.value) {
      error.value = true;
      loading.value = false;
    }
  }, 7000); // Increased timeout a bit for slow server starts
});
</script>

<template>
  <div class="mymediaserver-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loader"></div>
      <p>Conectando a MyMediaServer...</p>
    </div>

    <iframe 
      v-if="!error"
      :src="serverUrl" 
      class="server-iframe" 
      :style="{ opacity: loading ? 0 : 1 }"
      @load="handleLoad"
      frameborder="0"
    ></iframe>

    <div v-if="error" class="error-overlay">
      <ServerOff :size="48" color="#f87171" />
      <h3 class="error-title">Servidor no alcanzable</h3>
      <p class="error-desc" v-if="!isLinux">
        No se pudo conectar con MyMediaServer en el puerto 3001. 
        Asegúrate de haber ejecutado el instalador para Windows.
      </p>
      <p class="error-desc" v-else>
        No se pudo conectar con MyMediaServer en el puerto 3001. 
        Verifica el estado del servicio en tu servidor Linux.
      </p>

      <div class="instruction-box" v-if="isLinux">
        <h4>Comandos de solución (Linux):</h4>
        <p>1. Verifica si el servicio está activo:</p>
        <div class="code-snippet">sudo systemctl status mymediaserver</div>
        <p class="mt-2">2. Si está detenido, inícialo:</p>
        <div class="code-snippet">sudo systemctl restart mymediaserver</div>
      </div>

      <div class="instruction-box" v-else>
        <h4>Solución para Windows:</h4>
        <p>Ejecuta el script instalador en tu carpeta raíz:</p>
        <div class="code-snippet">install_mymediaserver_win.bat</div>
      </div>

      <button @click="retry" class="retry-btn">Reintentar Conexión</button>
    </div>
  </div>
</template>

const checkServer = async () => {
  try {
    // Try to pings the server (simple fetch)
    // Note: This might fail due to CORS, but if it fails with type "opaque" or similar, 
    // it still means SOME response was received.
    // If it throws a network error, current server is likely down.
    await fetch(serverUrl.value, { mode: 'no-cors', cache: 'no-cache' });
    error.value = false;
  } catch (err) {
    console.warn('MyMediaServer unreachable:', err);
    error.value = true;
    loading.value = false;
  }
};

const handleLoad = () => {
  loading.value = false;
  iframeLoaded.value = true;
};

const retry = () => {
  loading.value = true;
  error.value = false;
  iframeLoaded.value = false;
  checkServer();
};

onMounted(() => {
  checkServer();
  
  // Timeout for loading
  setTimeout(() => {
    if (loading.value && !iframeLoaded.value) {
      error.value = true;
      loading.value = false;
    }
  }, 5000);
});
</script>

<style scoped>
.mymediaserver-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.server-iframe {
  width: 100%;
  flex: 1;
  border: none;
  background: white;
  transition: opacity 0.3s;
}

.loading-overlay, .error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: white;
  padding: 2rem;
  text-align: center;
  z-index: 10;
}

.error-overlay {
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
}

.error-title {
  color: #f87171;
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.error-desc {
  color: #94a3b8;
  max-width: 400px;
  line-height: 1.5;
  margin-bottom: 2rem;
}

.instruction-box {
  background: rgba(0,0,0,0.3);
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 2rem;
  text-align: left;
}

.instruction-box h4 {
  margin-top: 0;
  color: #3b82f6;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.instruction-box p {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.code-snippet {
  background: #000;
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: #10b981;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #06b6d4;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(8, 145, 178, 0.4);
}
</style>
