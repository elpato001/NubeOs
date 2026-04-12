<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { UserPlus, ShieldCheck, Rocket } from 'lucide-vue-next';

const auth = useAuthStore();
const router = useRouter();

const username = ref('admin');
const password = ref('');
const confirmPassword = ref('');
const step = ref(1);

const handleSetup = async () => {
  if (password.value !== confirmPassword.value) {
    auth.error = 'Las contraseñas no coinciden';
    return;
  }
  
  const success = await auth.setupAdmin(username.value, password.value);
  if (success) {
    step.value = 3;
  }
};

const goToDashboard = () => {
  router.push('/');
};
</script>

<template>
  <div class="setup-container">
    <div class="glass setup-card fade-in">
      <!-- Success Step -->
      <div v-if="step === 3" class="success-step text-center">
        <div class="icon-circle success">
          <Rocket :size="48" />
        </div>
        <h2>¡Todo listo!</h2>
        <p>Tu cuenta de administrador ha sido creada con éxito. Ya puedes empezar a usar NubeOS.</p>
        <button @click="goToDashboard" class="btn-primary mt-6">
          Ir al Panel de Control
        </button>
      </div>

      <!-- Setup Step -->
      <div v-else>
        <div class="header">
          <div class="logo-box">
            <ShieldCheck :size="48" class="setup-icon" />
          </div>
          <h1>Configuración Inicial</h1>
          <p>Bienvenido a NubeOS. Crea tu cuenta de administrador para comenzar.</p>
        </div>

        <form @submit.prevent="handleSetup" class="setup-form">
          <div class="input-group">
            <label>Usuario Administrador</label>
            <input 
              v-model="username" 
              type="text" 
              placeholder="Ej. admin"
              required
            />
          </div>
          
          <div class="input-group">
            <label>Contraseña</label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••"
              required
            />
          </div>

          <div class="input-group">
            <label>Confirmar Contraseña</label>
            <input 
              v-model="confirmPassword" 
              type="password" 
              placeholder="••••••••"
              required
            />
          </div>

          <div v-if="auth.error" class="error-msg">
            {{ auth.error }}
          </div>

          <button :disabled="auth.loading" type="submit" class="btn-primary">
            <UserPlus v-if="!auth.loading" :size="20" />
            <span>{{ auth.loading ? 'Configurando...' : 'Crear Administrador' }}</span>
          </button>
        </form>
      </div>
      
      <div class="steps-indicator" v-if="step < 3">
        <div class="step" :class="{ active: step === 1 }"></div>
        <div class="step" :class="{ active: step === 2 }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
}

.setup-card {
  width: 100%;
  max-width: 500px;
  padding: 3rem;
}

.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-box {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.btn-primary {
  background: var(--primary);
  color: white;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1rem;
  border-radius: 12px;
  font-weight: 600;
  margin-top: 1rem;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  text-align: center;
}

.success-step {
  padding: 1rem 0;
}

.icon-circle {
  width: 100px;
  height: 100px;
  margin: 0 auto 2rem;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.steps-indicator {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2.5rem;
}

.step {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.step.active {
  background: var(--primary);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

.text-center {
  text-align: center;
}

.mt-6 {
  margin-top: 1.5rem;
}
</style>
