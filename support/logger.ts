/**
 * support/logger.ts
 *
 * A very simple logger. On purpose it does NOT use a big logging library.
 * Every line has: time, level, which test it belongs to, and the message.
 * This way, anyone reading the console output or the log file can follow
 * what happened, in order, without needing to know the framework.
 *
 * Example output line:
 *   [2026-08-21T10:15:32.101Z] [INFO] [Login - valid user] Filled textbox "Username"
 */
import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'INFO' | 'STEP' | 'WARN' | 'ERROR';

const LOG_DIR = path.resolve(__dirname, '..', 'reports', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// One log file per test run (per process start), so runs don't overwrite each other.
const runStartedAt = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOG_DIR, `run-${runStartedAt}.log`);

function writeLine(level: LogLevel, testName: string, message: string) {
  const line = `[${new Date().toISOString()}] [${level}] [${testName}] ${message}`;
  // Show it live in the terminal / CI console ...
  // eslint-disable-next-line no-console
  console.log(line);
  // ... and also save it to a file, so it survives after the run ends.
  fs.appendFileSync(LOG_FILE, line + '\n');
}

/**
 * Creates a logger already tagged with the current test's name, so every
 * call site doesn't have to repeat it.
 */
export function createLogger(testName: string) {
  return {
    info: (message: string) => writeLine('INFO', testName, message),
    step: (message: string) => writeLine('STEP', testName, message),
    warn: (message: string) => writeLine('WARN', testName, message),
    error: (message: string) => writeLine('ERROR', testName, message),
  };
}

export type Logger = ReturnType<typeof createLogger>;
