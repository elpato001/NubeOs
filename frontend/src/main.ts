import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

import axios from 'axios'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Axios Interceptor for Auth Errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 400)) {
      // Only logout if it looks like an auth error
      if (error.response.data?.error === 'Token inválido.' || error.response.status === 401) {
        localStorage.removeItem('nubeos_token');
        localStorage.removeItem('nubeos_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

app.mount('#app')
