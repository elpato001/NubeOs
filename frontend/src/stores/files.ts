import { defineStore } from 'pinia';
import axios from 'axios';

export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

export interface UploadingFile {
  name: string;
  progress: number;
  size: number;
}

export const useFileStore = defineStore('files', {
  state: () => ({
    currentPath: '',
    items: [] as FileItem[],
    loading: false,
    error: null as string | null,
    uploading: false,
    uploadingFiles: [] as UploadingFile[],
  }),

  actions: {
    async fetchFiles(path: string = '') {
      this.loading = true;
      try {
        const response = await axios.get(`/api/files/list?path=${path}`);
        this.items = response.data.items;
        this.currentPath = response.data.currentPath;
      } catch (err: any) {
        this.error = err.response?.data?.error || 'Error al obtener archivos';
      } finally {
        this.loading = false;
      }
    },

    async createFolder(folderName: string) {
      try {
        await axios.post('/api/files/mkdir', { folderName, path: this.currentPath });
        await this.fetchFiles(this.currentPath);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al crear carpeta');
      }
    },

    async deleteItems(names: string[]) {
      try {
        await axios.delete('/api/files/delete', { data: { items: names, path: this.currentPath } });
        await this.fetchFiles(this.currentPath);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al eliminar');
      }
    },

    async uploadFiles(files: FileList) {
      this.uploading = true;
      this.uploadingFiles = Array.from(files).map(f => ({
        name: f.name,
        progress: 0,
        size: f.size,
      }));

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      try {
        await axios.post(`/api/files/upload?path=${this.currentPath}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || 1;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            // Update all files with same progress (single request)
            this.uploadingFiles = this.uploadingFiles.map(f => ({
              ...f,
              progress: percent,
            }));
          }
        });
        // Brief delay to show 100%
        this.uploadingFiles = this.uploadingFiles.map(f => ({ ...f, progress: 100 }));
        setTimeout(async () => {
          this.uploading = false;
          this.uploadingFiles = [];
          await this.fetchFiles(this.currentPath);
        }, 500);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al subir archivos');
        this.uploading = false;
        this.uploadingFiles = [];
      }
    },

    getPreviewUrl(fileName: string) {
      const token = localStorage.getItem('nubeos_token');
      return `/api/files/preview?path=${this.currentPath}&name=${encodeURIComponent(fileName)}&token=${token}`;
    },

    getDownloadUrl(fileName: string) {
      const token = localStorage.getItem('nubeos_token');
      return `/api/files/download?path=${this.currentPath}&name=${encodeURIComponent(fileName)}&token=${token}`;
    }
  }
});
