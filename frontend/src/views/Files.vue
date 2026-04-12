<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useFileStore } from '../stores/files';
import { 
  Folder, 
  File, 
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Upload, 
  Plus, 
  Trash2, 
  ChevronLeft,
  Grid,
  List,
  Eye,
  Download,
  X
} from 'lucide-vue-next';

const fileStore = useFileStore();
const selectedItems = ref<string[]>([]);
const viewMode = ref<'grid' | 'list'>('grid');

// Preview state
const previewFile = ref<any>(null);

onMounted(() => {
  fileStore.fetchFiles();
});

const navigateTo = (folderName: string) => {
  const newPath = fileStore.currentPath ? `${fileStore.currentPath}/${folderName}` : folderName;
  fileStore.fetchFiles(newPath);
  selectedItems.value = [];
};

const goBack = () => {
  const parts = fileStore.currentPath.split('/');
  parts.pop();
  fileStore.fetchFiles(parts.join('/'));
  selectedItems.value = [];
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileStore.uploadFiles(target.files);
    target.value = ''; // Reset so same file can be uploaded again
  }
};

const triggerUpload = () => {
  const input = document.getElementById('file-upload') as HTMLInputElement;
  input.click();
};

const createFolder = () => {
  const name = prompt('Nombre de la carpeta:');
  if (name) fileStore.createFolder(name);
};

const deleteSelected = () => {
  if (selectedItems.value.length === 0) return;
  if (confirm(`¿Eliminar ${selectedItems.value.length} elementos?`)) {
    fileStore.deleteItems(selectedItems.value);
    selectedItems.value = [];
  }
};

const toggleSelect = (name: string) => {
  const index = selectedItems.value.indexOf(name);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(name);
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// File type detection for icons and preview
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.mkv'];
const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'];
const textExts = ['.txt', '.md', '.log', '.json', '.xml', '.html', '.css', '.js', '.py', '.sh', '.bat', '.yml', '.yaml', '.ini', '.conf', '.cfg', '.csv'];
const pdfExts = ['.pdf'];

const isPreviewable = (ext: string) => {
  return [...imageExts, ...videoExts, ...audioExts, ...textExts, ...pdfExts].includes(ext);
};

const getFileType = (ext: string) => {
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (textExts.includes(ext)) return 'text';
  if (pdfExts.includes(ext)) return 'pdf';
  return 'other';
};

const openPreview = (item: any) => {
  if (item.isDirectory || !isPreviewable(item.extension)) return;
  previewFile.value = {
    ...item,
    type: getFileType(item.extension),
    url: fileStore.getPreviewUrl(item.name)
  };
};

const closePreview = () => {
  previewFile.value = null;
};

const downloadFile = (name: string) => {
  const url = fileStore.getDownloadUrl(name);
  window.open(url, '_blank');
};

const handleDblClick = (item: any) => {
  if (item.isDirectory) {
    navigateTo(item.name);
  } else if (isPreviewable(item.extension)) {
    openPreview(item);
  }
};
</script>

<template>
  <div class="files-view fade-in">
    <header class="files-header">
      <div class="breadcrumb">
        <button v-if="fileStore.currentPath" @click="goBack" class="back-btn">
          <ChevronLeft :size="20"/>
        </button>
        <span class="path">Archivos / {{ fileStore.currentPath }}</span>
      </div>

      <div class="actions">
        <input 
          id="file-upload" 
          type="file" 
          multiple 
          style="display: none" 
          @change="handleFileUpload"
        />
        
        <button @click="triggerUpload" class="btn btn-secondary">
          <Upload :size="18"/> <span>Subir</span>
        </button>
        <button @click="createFolder" class="btn btn-secondary">
          <Plus :size="18"/> <span>Nueva Carpeta</span>
        </button>
        <button 
          v-if="selectedItems.length > 0" 
          @click="deleteSelected" 
          class="btn btn-danger"
        >
          <Trash2 :size="18"/> <span>Eliminar ({{ selectedItems.length }})</span>
        </button>

        <div class="view-toggle">
          <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }"><Grid :size="18"/></button>
          <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }"><List :size="18"/></button>
        </div>
      </div>
    </header>

    <!-- Upload Progress Banner -->
    <div v-if="fileStore.uploading" class="upload-banner">
      <div class="upload-banner-header">
        <Upload :size="16" />
        <span>Subiendo {{ fileStore.uploadingFiles.length }} archivo(s)...</span>
      </div>
      <div v-for="uf in fileStore.uploadingFiles" :key="uf.name" class="upload-file-item">
        <span class="upload-filename">{{ uf.name }}</span>
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" :style="{ width: uf.progress + '%' }"></div>
        </div>
        <span class="upload-percent">{{ uf.progress }}%</span>
      </div>
    </div>

    <div v-if="fileStore.loading" class="loader">
      <div class="spinner"></div>
      Cargando archivos...
    </div>

    <div v-else class="file-area" :class="viewMode">
      <div 
        v-for="item in fileStore.items" 
        :key="item.name"
        class="file-item glass"
        :class="{ selected: selectedItems.includes(item.name) }"
        @click="toggleSelect(item.name)"
        @dblclick="handleDblClick(item)"
      >
        <div class="icon">
          <Folder v-if="item.isDirectory" :size="48" color="#6366f1" fill="#6366f122" />
          <FileImage v-else-if="imageExts.includes(item.extension)" :size="48" color="#22c55e" />
          <FileVideo v-else-if="videoExts.includes(item.extension)" :size="48" color="#f59e0b" />
          <FileAudio v-else-if="audioExts.includes(item.extension)" :size="48" color="#ec4899" />
          <FileText v-else-if="textExts.includes(item.extension) || pdfExts.includes(item.extension)" :size="48" color="#3b82f6" />
          <File v-else :size="48" color="#cbd5e1" />
        </div>
        <div class="info">
          <span class="name">{{ item.name }}</span>
          <span class="meta" v-if="!item.isDirectory">{{ formatSize(item.size) }}</span>
        </div>
        <!-- Quick actions on hover -->
        <div class="quick-actions" v-if="!item.isDirectory">
          <button 
            v-if="isPreviewable(item.extension)" 
            @click.stop="openPreview(item)" 
            class="quick-btn" 
            title="Vista previa"
          >
            <Eye :size="14"/>
          </button>
          <button 
            @click.stop="downloadFile(item.name)" 
            class="quick-btn" 
            title="Descargar"
          >
            <Download :size="14"/>
          </button>
        </div>
      </div>

      <div v-if="fileStore.items.length === 0" class="empty-state">
        <Folder :size="64" color="#334155" />
        <p>Esta carpeta está vacía</p>
      </div>
    </div>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="previewFile" class="preview-overlay" @click.self="closePreview">
        <div class="preview-modal glass">
          <div class="preview-header">
            <span class="preview-title">{{ previewFile.name }}</span>
            <div class="preview-actions">
              <button @click="downloadFile(previewFile.name)" class="preview-btn" title="Descargar">
                <Download :size="18"/>
              </button>
              <button @click="closePreview" class="preview-btn close" title="Cerrar">
                <X :size="18"/>
              </button>
            </div>
          </div>
          <div class="preview-content">
            <!-- Image -->
            <img v-if="previewFile.type === 'image'" :src="previewFile.url" :alt="previewFile.name" />
            <!-- Video -->
            <video v-else-if="previewFile.type === 'video'" :src="previewFile.url" controls autoplay />
            <!-- Audio -->
            <div v-else-if="previewFile.type === 'audio'" class="audio-preview">
              <FileAudio :size="64" color="#ec4899" />
              <span>{{ previewFile.name }}</span>
              <audio :src="previewFile.url" controls autoplay />
            </div>
            <!-- PDF -->
            <iframe v-else-if="previewFile.type === 'pdf'" :src="previewFile.url" />
            <!-- Text -->
            <iframe v-else-if="previewFile.type === 'text'" :src="previewFile.url" class="text-preview" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.files-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem;
}

.path {
  font-weight: 600;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
}

.btn-secondary { background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid var(--border); }
.btn-danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.view-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius);
  padding: 2px;
}

.view-toggle button {
  padding: 0.5rem;
  background: transparent;
  color: var(--text-muted);
}

.view-toggle button.active {
  background: var(--primary);
  color: white;
}

/* ── Upload Progress Banner ── */
.upload-banner {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  animation: fadeSlideIn 0.3s ease;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.upload-banner-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--primary);
}

.upload-file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.upload-filename {
  font-size: 0.78rem;
  color: var(--text-muted);
  min-width: 120px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #818cf8);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.upload-percent {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 36px;
  text-align: right;
}

/* ── File Area ── */
.file-area {
  display: grid;
  gap: 1.25rem;
}

.file-area.grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.file-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

.file-item.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.file-item .info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  width: 100%;
}

.name {
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

.meta {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* ── Quick Action Buttons ── */
.quick-actions {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.file-item:hover .quick-actions { opacity: 1; }

.quick-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  backdrop-filter: blur(4px);
  transition: all 0.15s;
}

.quick-btn:hover {
  background: var(--primary);
  transform: scale(1.1);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem;
  gap: 1.5rem;
  color: var(--text-muted);
}

/* Loader */
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 5rem;
  color: var(--text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Preview Modal ── */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-modal {
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border);
}

.preview-title {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  transition: all 0.15s;
}

.preview-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.preview-btn.close:hover {
  background: #ef4444;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: var(--bg-main);
  min-height: 300px;
}

.preview-content img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
}

.preview-content video {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
}

.preview-content iframe {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 8px;
  background: white;
}

.preview-content iframe.text-preview {
  background: #1e1e2e;
  color: white;
}

.audio-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem;
}

.audio-preview span {
  font-size: 1rem;
  font-weight: 600;
}

.audio-preview audio {
  width: 100%;
  max-width: 400px;
}
</style>
