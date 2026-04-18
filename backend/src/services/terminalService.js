let pty;

try {
  pty = require('node-pty');
} catch (err) {
  console.warn('[TERM] node-pty no disponible. La terminal web estará deshabilitada.');
  console.warn('[TERM] Para habilitarla, instala: npm install node-pty');
  console.warn('[TERM] Requiere: build-essential, python3 en Linux');
}

const os = require('os');

function initTerminalSocket(io) {
  if (!pty) {
    console.warn('[TERM] Socket de terminal NO inicializado (node-pty no disponible)');
    // Still handle connections gracefully
    io.on('connection', (socket) => {
      socket.emit('output', '\r\n\x1b[31m[ERROR] Terminal no disponible en este servidor.\r\n');
      socket.emit('output', '\x1b[33mnode-pty no está instalado correctamente.\r\n');
      socket.emit('output', 'Ejecuta: sudo npm install -g node-pty\x1b[0m\r\n');
    });
    return;
  }

  io.on('connection', (socket) => {
    console.log('[TERM] Nuevo cliente conectado:', socket.id);

    const isWindows = os.platform() === 'win32';
    const shell = isWindows ? 'powershell.exe' : 'bash';

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.env.USERPROFILE || '/root',
        env: process.env
      });
    } catch (err) {
      console.error('[TERM] Error al crear proceso PTY:', err.message);
      socket.emit('output', `\r\n\x1b[31m[ERROR] No se pudo iniciar la terminal: ${err.message}\x1b[0m\r\n`);
      return;
    }

    // Send pty output to client
    ptyProcess.onData((data) => {
      socket.emit('output', data);
    });

    // Receive input from client
    socket.on('input', (data) => {
      try {
        ptyProcess.write(data);
      } catch (e) { /* ignore write errors on dead process */ }
    });

    // Handle resizing
    socket.on('resize', (size) => {
      if (size && size.cols && size.rows) {
        try {
          ptyProcess.resize(size.cols, size.rows);
        } catch (e) { /* ignore resize errors */ }
      }
    });

    socket.on('disconnect', () => {
      console.log('[TERM] Cliente desconectado, cerrando pty:', socket.id);
      try {
        ptyProcess.kill();
      } catch (e) { /* already dead */ }
    });
  });
}

module.exports = { initTerminalSocket };
