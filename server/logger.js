const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'smart-mirror.log');

// Ensure logs/ directory exists
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (_) {
  // ignore
}

// On startup: delete log file if it's from a previous day
try {
  const stat = fs.statSync(LOG_FILE);
  const fileDate = new Date(stat.mtime).toDateString();
  const today = new Date().toDateString();
  if (fileDate !== today) {
    fs.unlinkSync(LOG_FILE);
  }
} catch (_) {
  // File doesn't exist or can't be read — fine
}

function write(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;

  // Console output
  if (level === 'ERROR') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }

  // File output — never crash on write errors
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (_) {
    // ignore
  }
}

module.exports = {
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
  error: (msg) => write('ERROR', msg),
};
