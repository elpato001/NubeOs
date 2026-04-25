<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2, Server, Check, ArrowRight } from 'lucide-vue-next';
import axios from 'axios';

const router = useRouter();
const step = ref(0); // 0: Loading, 1: Welcome, 2: Installing, 3: Account Config, 4: Finish
const progress = ref(0);
const statusMessage = ref('Preparando archivos...');

// Form data
const deviceName = ref('NubeOS-Server');
const adminUser = ref('admin');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');

const startInstall = () => {
  step.value = 2;
  simulateProgress();
};

const simulateProgress = () => {
  const interval = setInterval(() => {
    progress.value += Math.floor(Math.random() * 5) + 1;
    if (progress.value >= 100) {
      progress.value = 100;
      clearInterval(interval);
      setTimeout(() => step.value = 3, 1000);
    }
    
    // Update messages
    if (progress.value < 30) statusMessage.value = 'Configurando particiones de disco...';
    else if (progress.value < 60) statusMessage.value = 'Instalando NubeOS Core...';
    else if (progress.value < 90) statusMessage.value = 'Configurando entorno de red...';
    else statusMessage.value = 'Finalizando instalación...';
  }, 400);
};

const handleFinalConfig = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }
  
  step.value = 0; // Show loader
  try {
    // Aquí se enviaría la config real al backend para aplicar al sistema Ubuntu
    await axios.post('/api/installer/start', {
      hostname: deviceName.value,
      username: adminUser.value,
      password: password.value,
      disk: 'sda' // Detectado previamente
    });
    
    setTimeout(() => {
      step.value = 4;
    }, 2000);
  } catch (e) {
    error.value = 'Error al aplicar la configuración final';
    step.value = 3;
  }
};

onMounted(() => {
  // Simular carga inicial del sistema
  setTimeout(() => step.value = 1, 1500);
});

</script>

<template>
  <div class="dsm-wrapper">
    <!-- Blue Background -->
    <div class="dsm-bg"></div>

    <!-- Centered Card -->
    <div class="dsm-card shadow-2xl">
      
      <!-- STEP 0: INITIAL LOADING -->
      <div v-if="step === 0" class="flex-center h-full flex-col">
        <div class="dots-loader mb-4">
           <span></span><span></span><span></span>
        </div>
        <p class="text-slate-500 font-medium">Cargando...</p>
      </div>

      <!-- STEP 1: WELCOME -->
      <div v-if="step === 1" class="step-container welcome-step">
        <div class="promo-side">
          <div class="server-promo">
            <Server :size="120" stroke-width="1" class="server-icon" />
            <div class="leds"></div>
          </div>
        </div>
        <div class="content-side">
          <h1 class="welcome-title">Bienvenido.</h1>
          <p class="welcome-desc">Configure su NubeOS ahora.</p>
          <button @click="startInstall" class="btn-dsm-primary">
            Instalar
          </button>
        </div>
        <div class="card-footer-info">Información del dispositivo</div>
      </div>

      <!-- STEP 2: INSTALLING (The Big Ring) -->
      <div v-if="step === 2" class="step-container installing-step">
        <div class="progress-ring-container">
          <svg viewBox="0 0 100 100" class="progress-svg">
            <circle cx="50" cy="50" r="45" class="ring-bg-circle" />
            <circle 
              cx="50" cy="50" r="45" 
              class="ring-active-circle" 
              :style="{ strokeDashoffset: 283 - (283 * progress) / 100 }"
            />
          </svg>
          <div class="progress-number">{{ progress }}<span class="percent-symbol">%</span></div>
        </div>
        <h2 class="installing-title">Instalando NubeOS (NOS)</h2>
        <p class="installing-desc">
          Este proceso solo tardará unos minutos en completarse. No apague la corriente durante este proceso.
        </p>
        <p class="status-msg">{{ statusMessage }}</p>
      </div>

      <!-- STEP 3: ACCOUNT CONFIG -->
      <div v-if="step === 3" class="step-container config-step">
        <h2 class="config-title">Primeros pasos con su NubeOS</h2>
        <p class="config-subtitle">
          Asigne un nombre a su servidor y cree una cuenta de administrador. 
          Utilice esta cuenta para iniciar sesión y gestionar Ubuntu y NubeOS.
        </p>

        <div class="form-body">
          <div class="dsm-input-row">
            <label>Nombre del dispositivo:</label>
            <input v-model="deviceName" type="text" placeholder="Ej. MINAS" />
          </div>
          <div class="dsm-input-row">
            <label>Cuenta de administrador:</label>
            <input v-model="adminUser" type="text" placeholder="admin" />
          </div>
          <div class="dsm-input-row">
            <label>Contraseña:</label>
            <input v-model="password" type="password" />
          </div>
          <div class="dsm-input-row">
            <label>Confirmar contraseña:</label>
            <input v-model="confirmPassword" type="password" />
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="form-footer">
           <button class="btn-dsm-secondary">Anterior</button>
           <button @click="handleFinalConfig" class="btn-dsm-primary min-width-btn">Siguiente</button>
        </div>
      </div>

      <!-- STEP 4: FINISH -->
      <div v-if="step === 4" class="step-container finish-step">
        <div class="success-icon-blob">
          <Check :size="40" stroke-width="3" />
        </div>
        <h2 class="finish-title">¡Todo listo!</h2>
        <p class="finish-desc">
          El sistema se ha configurado correctamente. Ya puede acceder a su nube privada.
        </p>
        <button @click="router.push('/')" class="btn-dsm-primary">
          Ir al Escritorio
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.dsm-wrapper {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  z-index: 9999;
}

.dsm-bg {
  position: absolute;
  inset: 0;
  background: #3b82f6; /* Synology Blue */
  z-index: 0;
}

.dsm-card {
  position: relative;
  z-index: 10;
  width: 800px;
  height: 500px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Step Layouts */
.step-container {
  height: 100%;
  display: flex;
}

.welcome-step {
  align-items: center;
  padding: 0 60px;
}

.promo-side {
  width: 50%;
  display: flex;
  justify-content: center;
}

.content-side {
  width: 50%;
  padding-left: 40px;
}

.installing-step {
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.config-step {
  flex-direction: column;
  padding: 48px;
}

.finish-step {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

/* Typography */
.welcome-title { font-size: 2rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.welcome-desc { color: #64748b; margin-bottom: 40px; }

.installing-title { font-size: 1.25rem; font-weight: 700; color: #334155; margin-top: 32px; }
.installing-desc { color: #94a3b8; font-size: 0.875rem; margin-top: 8px; max-width: 400px; text-align: center; }
.status-msg { color: #3b82f6; font-size: 0.75rem; font-weight: 700; margin-top: 16px; text-transform: uppercase; letter-spacing: 0.1em; }

.config-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.config-subtitle { font-size: 0.75rem; color: #64748b; margin-bottom: 32px; line-height: 1.4; }

.finish-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.finish-desc { color: #64748b; margin-bottom: 32px; }

/* Loader */
.dots-loader { margin-bottom: 16px; }
.dots-loader span {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  margin: 0 4px;
  animation: dots 1.4s infinite ease-in-out both;
}
.dots-loader span:nth-child(1) { animation-delay: -0.32s; }
.dots-loader span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dots {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

/* Buttons */
.btn-dsm-primary {
  background: #007bff;
  color: white;
  padding: 10px 30px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}
.btn-dsm-primary:hover { background: #0069d9; }

.btn-dsm-secondary {
  background: #e9ecef;
  color: #495057;
  padding: 10px 30px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
}

.min-width-btn { min-width: 120px; }

/* Progress Ring */
.progress-ring-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-svg { width: 256px; height: 256px; }
.ring-bg-circle { fill: none; stroke: #f1f5f9; stroke-width: 1.5; }
.ring-active-circle {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 0.5s ease;
}

.progress-number {
  position: absolute;
  font-size: 4rem;
  font-weight: 300;
  color: #1e293b;
}
.percent-symbol { font-size: 1.5rem; }

/* Forms */
.form-body { display: flex; flex-direction: column; gap: 16px; flex-grow: 1; }
.dsm-input-row { display: flex; align-items: center; gap: 20px; }
.dsm-input-row label { width: 180px; font-size: 0.85rem; color: #475569; }
.dsm-input-row input {
  flex: 1;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
}
.dsm-input-row input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

.form-footer {
  display: flex;
  justify-content: end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.error-msg { color: #ef4444; font-size: 0.75rem; margin-bottom: 16px; }

/* Promo Area */
.server-promo { position: relative; }
.server-icon { color: #334155; }
.leds {
  position: absolute;
  top: 40px; right: 20px;
  width: 4px; height: 12px;
  background: #10b981;
  box-shadow: 0 0 5px #10b981;
  border-radius: 2px;
}

.card-footer-info {
  position: absolute;
  bottom: 20px;
  left: 0; right: 0;
  text-align: center;
  font-size: 0.75rem;
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

.success-icon-blob {
  width: 80px; height: 80px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}
</style>
