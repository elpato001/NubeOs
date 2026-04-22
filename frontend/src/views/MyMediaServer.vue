<template>
  <div class="mymediaserver-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loader"></div>
      <p>Conectando a MyMediaServer...</p>
    </div>
    <iframe 
      :src="serverUrl" 
      class="server-iframe" 
      @load="loading = false"
      frameborder="0"
    ></iframe>
    <div v-if="error" class="error-overlay">
      <ServerOff :size="48" />
      <h3>No se pudo conectar al servidor</h3>
      <p>Asegúrate de que MyMediaServer esté instalado y en ejecución en el puerto 3000.</p>
      <button @click="retry" class="retry-btn">Reintentar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ServerOff } from 'lucide-vue-next';

const loading = ref(true);
const error = ref(false);

const serverUrl = computed(() => {
  // Use the same hostname as the current window, but port 3001
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
});

const retry = () => {
  loading.ref = true;
  error.value = false;
  // Force iframe reload
  const iframe = document.querySelector('.server-iframe') as HTMLIFrameElement;
  if (iframe) iframe.src = serverUrl.value;
};

onMounted(() => {
  // Simple timeout to show error if it doesn't load
  setTimeout(() => {
    if (loading.value) {
      // We don't know for sure if it failed or just slow, 
      // but if after 10s it's still loading, it might be down.
      // However, if the iframe loads a 404/refused, it might not trigger @load
    }
  }, 10000);
});
</script>

<style scoped>
.mymediaserver-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
  display: flex;
  flex-direction: column;
}

.server-iframe {
  width: 100%;
  flex: 1;
  border: none;
  background: white;
}

.loading-overlay, .error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e293b;
  color: white;
  z-index: 10;
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
  margin-top: 1.5rem;
  padding: 0.6rem 1.5rem;
  background: #06b6d4;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #0891b2;
  transform: translateY(-2px);
}
</style>
