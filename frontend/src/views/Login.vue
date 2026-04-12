<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { LogIn, User, Lock } from 'lucide-vue-next';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');

const handleLogin = async () => {
  const success = await auth.login(username.value, password.value);
  if (success) {
    router.push('/');
  }
};
</script>

<template>
  <div class="login-container">
    <!-- Abstract background elements -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    <div class="bg-blob blob-3"></div>

    <div class="login-card fade-in">
      <div class="header">
        <div class="logo-wrapper">
          <div class="logo-glow"></div>
          <img src="../assets/logo.png" alt="NubeOS Logo" class="login-logo" />
        </div>
        <h1>NubeOS</h1>
        <p class="subtitle">Cloud Personal Inteligente</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-field">
          <label>Identidad</label>
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input 
              v-model="username" 
              type="text" 
              placeholder="Nombre de usuario"
              required
            />
          </div>
        </div>
        
        <div class="input-field">
          <label>Credencial de acceso</label>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              type="password" 
              placeholder="Contraseña"
              required
            />
          </div>
        </div>

        <div v-if="auth.error" class="error-msg">
          {{ auth.error }}
        </div>

        <button :disabled="auth.loading" type="submit" class="btn-login">
          <span v-if="!auth.loading" class="btn-content">
            Entrar al sistema
            <LogIn :size="18" />
          </span>
          <span v-else>Autenticando...</span>
        </button>

        <div class="footer-links">
          <a href="#" class="link-muted">¿Olvidaste tu contraseña?</a>
        </div>
      </form>

      <div class="version-badge">v1.2.0 Stable Build</div>
    </div>

    <!-- Background Decorative Text -->
    <div class="bg-text">NUBE OS</div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100vw;
  padding: 1.5rem;
  background: #020617;
  overflow: hidden;
  position: relative;
}

/* Background Animated Blobs */
.bg-blob {
  position: absolute;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.4;
  border-radius: 50%;
  animation: float 20s infinite alternate;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: #4338ca;
  top: -100px;
  right: -100px;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: #7e22ce;
  bottom: -100px;
  left: -50px;
  animation-duration: 25s;
}

.blob-3 {
  width: 300px;
  height: 300px;
  background: #1d4ed8;
  top: 40%;
  left: 30%;
  animation-duration: 30s;
}

@keyframes float {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(50px, 50px) scale(1.1); }
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 3rem;
  z-index: 10;
  text-align: center;
}

.header {
  margin-bottom: 2.5rem;
}

.logo-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
}

.logo-glow {
  position: absolute;
  inset: -10px;
  background: var(--primary);
  filter: blur(20px);
  opacity: 0.3;
  border-radius: 50%;
}

.login-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 2;
}

h1 {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  margin-bottom: 0.25rem;
  background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 500;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  text-align: left;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-left: 0.25rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: #64748b;
  transition: color 0.3s;
}

input {
  width: 100%;
  background: rgba(2, 6, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  color: white;
  font-size: 1rem;
  transition: all 0.3s;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(2, 6, 23, 0.8);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
}

input:focus + .input-icon, 
.input-wrapper:focus-within .input-icon {
  color: var(--primary);
}

.btn-login {
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.btn-login:active {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 0.8rem;
  border-radius: 10px;
  font-size: 0.85rem;
  text-align: center;
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

.footer-links {
  text-align: center;
}

.link-muted {
  color: #64748b;
  font-size: 0.85rem;
  text-decoration: none;
  transition: color 0.2s;
}

.link-muted:hover {
  color: #94a3b8;
}

.version-badge {
  margin-top: 3rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bg-text {
  position: absolute;
  bottom: -20px;
  right: -20px;
  font-size: 15vw;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.02);
  user-select: none;
  pointer-events: none;
  line-height: 1;
}
</style>
