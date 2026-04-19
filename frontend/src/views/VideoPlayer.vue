<template>
  <div class="video-player-container">
    <video 
      ref="videoRef" 
      :src="desktop.currentVideo" 
      controls 
      autoplay 
      class="native-video"
    ></video>
    <div v-if="!desktop.currentVideo" class="no-video">
      <Film :size="48" />
      <p>Selecciona un video para reproducir</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';
import { useDesktopStore } from '../stores/desktop';
import { Film } from 'lucide-vue-next';

const desktop = useDesktopStore();
const videoRef = ref<HTMLVideoElement | null>(null);

// Reset video when currentVideo changes to ensure it plays
watch(() => desktop.currentVideo, () => {
  if (videoRef.value) {
    videoRef.value.load();
    videoRef.value.play().catch(e => console.warn('Autoplay blocked or failed:', e));
  }
});

onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.src = "";
    videoRef.value.load();
  }
});
</script>

<style scoped>
.video-player-container {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.native-video {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  outline: none;
}

.no-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #475569;
}

.no-video p {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
