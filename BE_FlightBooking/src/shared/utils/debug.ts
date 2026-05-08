import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const isDebug = () => process.env.DEBUG === 'true';
const isLogToFile = () => process.env.LOG_TO_FILE === 'true';

function renderArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === 'string' ? a : util.inspect(a, { breakLength: Infinity })))
    .join(' ');
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function logsDir(): string {
  return path.resolve(__dirname, '../../../logs');
}

function appendToDailyFile(line: string): void {
  try {
    const dir = logsDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, `${todayUtc()}.log`), line);
  } catch {
    // swallow — never throw from the logging path
  }
}

export function debugLog(tag: string, ...args: unknown[]): void {
  if (!isDebug()) return;

  console.log(`[DEBUG][${tag}]`, ...args);

  if (isLogToFile()) {
    const iso = new Date().toISOString();
    appendToDailyFile(`${iso} [${tag}] ${renderArgs(args)}\n`);
  }
}

export function errorLog(tag: string, handler: string, ...args: unknown[]): void {
  console.error(`[${tag}] ${handler} -`, ...args);

  if (isLogToFile()) {
    const iso = new Date().toISOString();
    appendToDailyFile(`${iso} [ERROR] [${tag}] ${handler} - ${renderArgs(args)}\n`);
  }
}
