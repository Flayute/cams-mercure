const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Estado del bot (en producción, esto vendría de la base de datos o Redis)
let botState = {
    isRunning: false,
    isPaused: false,
    currentPosition: null,
    balance: 1000.00,
    totalReturn: 0.00,
    totalTrades: 0,
    winRate: 0.0,
    lastUpdate: null
};

let activityLog = [];
let stats = {
    longTrades: 0,
    shortTrades: 0,
    profitableTrades: 0,
    losingTrades: 0
};

// Ruta al archivo de estado del bot (se sincroniza con el bot Python en RPi)
// Usar IP de Tailscale para acceso remoto
const RPI_IP = process.env.RPI_IP || '100.95.137.80';
const USE_REMOTE = process.env.USE_REMOTE === 'true' || true;

let BOT_STATE_FILE, BOT_LOG_FILE, BOT_COMMAND_FILE;

if (USE_REMOTE) {
    // Archivos remotos en RPi vía SSH/SFTP o HTTP
    // Por ahora, asumimos que están montados en una carpeta compartida
    const REMOTE_PATH = path.join(__dirname, '..', '..', 'rpi-bot-data');
    BOT_STATE_FILE = path.join(REMOTE_PATH, 'bot_state.json');
    BOT_LOG_FILE = path.join(REMOTE_PATH, 'bot_activity.json');
    BOT_COMMAND_FILE = path.join(REMOTE_PATH, 'bot_commands.json');
} else {
    // Local (para desarrollo)
    BOT_STATE_FILE = path.join(__dirname, '..', '..', 'trading-bot-lab', 'bot_state.json');
    BOT_LOG_FILE = path.join(__dirname, '..', '..', 'trading-bot-lab', 'bot_activity.json');
    BOT_COMMAND_FILE = path.join(__dirname, '..', '..', 'trading-bot-lab', 'bot_commands.json');
}

// Leer estado del bot desde archivo
function loadBotState() {
    try {
        if (fs.existsSync(BOT_STATE_FILE)) {
            const data = fs.readFileSync(BOT_STATE_FILE, 'utf8');
            botState = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading bot state:', error);
    }
}

// Leer log de actividad
function loadActivityLog() {
    try {
        if (fs.existsSync(BOT_LOG_FILE)) {
            const data = fs.readFileSync(BOT_LOG_FILE, 'utf8');
            const logs = JSON.parse(data);
            // Mantener solo los últimos 50
            activityLog = logs.slice(-50);
        }
    } catch (error) {
        console.error('Error loading activity log:', error);
    }
}

// Escribir comando para el bot
function sendBotCommand(command) {
    try {
        const commandData = {
            command: command,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(BOT_COMMAND_FILE, JSON.stringify(commandData, null, 2));
        return true;
    } catch (error) {
        console.error('Error sending bot command:', error);
        return false;
    }
}

// API Endpoints

// Get bot status
app.get('/api/status', (req, res) => {
    loadBotState();
    res.json(botState);
});

// Get activity log
app.get('/api/activity', (req, res) => {
    loadActivityLog();
    res.json(activityLog);
});

// Get stats
app.get('/api/stats', (req, res) => {
    loadBotState();
    // Calcular stats desde el estado
    const calculatedStats = {
        longTrades: botState.longTrades || 0,
        shortTrades: botState.shortTrades || 0,
        profitableTrades: botState.profitableTrades || 0,
        losingTrades: botState.losingTrades || 0
    };
    res.json(calculatedStats);
});

// Start bot
app.post('/api/start', (req, res) => {
    const success = sendBotCommand('START');
    if (success) {
        res.json({ message: 'Bot starting...', success: true });
    } else {
        res.status(500).json({ message: 'Failed to start bot', success: false });
    }
});

// Pause/Resume bot
app.post('/api/pause', (req, res) => {
    loadBotState();
    const command = botState.isPaused ? 'RESUME' : 'PAUSE';
    const success = sendBotCommand(command);
    if (success) {
        res.json({ message: `Bot ${command.toLowerCase()}ing...`, success: true });
    } else {
        res.status(500).json({ message: 'Failed to pause/resume bot', success: false });
    }
});

// Panic stop
app.post('/api/panic', (req, res) => {
    const success = sendBotCommand('PANIC');
    if (success) {
        res.json({ message: 'Panic stop initiated', success: true });
    } else {
        res.status(500).json({ message: 'Failed to panic stop', success: false });
    }
});

// Poll for updates every second
setInterval(() => {
    loadBotState();
    loadActivityLog();
}, 1000);

app.listen(PORT, () => {
    console.log(`🤖 APEX Trading Bot API running on http://localhost:${PORT}`);
    console.log(`Monitoring bot state files:
    - State: ${BOT_STATE_FILE}
    - Activity: ${BOT_LOG_FILE}
    - Commands: ${BOT_COMMAND_FILE}`);
});
