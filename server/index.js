require('dotenv').config();

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const logger = require('./logger');

// Load config
const config = require('../config/config.json');

const PORT = process.env.PORT || 3000;

// ── Express ──────────────────────────────────────────

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);

// ── WebSocket ────────────────────────────────────────

const wss = new WebSocketServer({ server });

function broadcast(data) {
  const msg = JSON.stringify({ type: 'state_update', data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  });
}

// ── Mode Determination ───────────────────────────────

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function determineMode(modesConfig) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check each mode; handle midnight-wrapping (night: start > end)
  for (const [mode, { start, end }] of Object.entries(modesConfig)) {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);

    if (s <= e) {
      // Normal range: e.g. morning 06:00–12:00
      if (currentMinutes >= s && currentMinutes < e) return mode;
    } else {
      // Midnight wrap: e.g. night 21:00–06:00
      if (currentMinutes >= s || currentMinutes < e) return mode;
    }
  }

  return 'night'; // fallback
}

// ── Unified State ────────────────────────────────────

const defaultLocation = config.weather.defaultLocation;

const state = {
  mode: determineMode(config.modes),
  startupComplete: true,
  timestamp: new Date().toISOString(),
  location: {
    lat: defaultLocation.lat,
    lon: defaultLocation.lon,
    city: defaultLocation.city,
    status: 'ok',
    updatedAt: new Date().toISOString(),
  },
  weather: null,
  news: null,
  calendar: null,
  briefing: null,
};

// ── WebSocket Connections ────────────────────────────

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  ws.send(JSON.stringify({ type: 'state_update', data: state }));
});

// ── Start Server ─────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Smart Mirror server started on 0.0.0.0:${PORT}`);
  logger.info(`Current mode: ${state.mode}`);
});

// ── Process Error Handlers ───────────────────────────

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// Export for future use by scheduler
module.exports = { state, broadcast, determineMode, config };
