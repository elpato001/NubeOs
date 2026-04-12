<script setup lang="ts">
import { X, Minus, Square, Maximize2 } from 'lucide-vue-next';
import { useDesktopStore, type WindowApp } from '../stores/desktop';

const props = defineProps<{
  appId: WindowApp;
  title: string;
}>();

const desktop = useDesktopStore();
const win = desktop.windows[props.appId];

const handleClose = () => desktop.closeWindow(props.appId);
const handleMinimize = () => desktop.toggleMinimize(props.appId);
const handleMaximize = () => desktop.toggleMaximize(props.appId);
const handleFocus = () => desktop.focusWindow(props.appId);
</script>

<template>
  <div 
    v-if="win.isOpen" 
    class="window-frame glass"
    :class="{ hidden: win.isMinimized, maximized: win.isMaximized }"
    :style="{ zIndex: win.zIndex }"
    @mousedown="handleFocus"
  >
    <div class="window-header" @dblclick="handleMaximize">
      <div class="window-title">{{ title }}</div>
      <div class="window-controls">
        <button @click.stop="handleMinimize" class="control-btn min" title="Minimizar"><Minus :size="14"/></button>
        <button @click.stop="handleMaximize" class="control-btn max" title="Maximizar"><Square :size="10"/></button>
        <button @click.stop="handleClose" class="control-btn close" title="Cerrar"><X :size="14"/></button>
      </div>
    </div>
    <div class="window-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.window-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 900px;
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Maximized state */
.window-frame.maximized {
  top: 0;
  left: 0;
  transform: none;
  width: 100%;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
  border: none;
}

/* Minimized state */
.window-frame.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -40%) scale(0.95);
}

.window-frame.maximized.hidden {
  transform: scale(0.95);
}

.window-header {
  height: 40px;
  min-height: 40px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  cursor: default;
  user-select: none;
}

.window-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.window-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.control-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.control-btn.max:hover { background: rgba(34, 197, 94, 0.3); color: #22c55e; }
.control-btn.close:hover { background: #ef4444; }

.window-content {
  flex: 1;
  background: var(--bg-main);
  overflow: auto;
  padding: 1.5rem;
}
</style>
