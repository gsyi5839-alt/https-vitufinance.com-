#!/usr/bin/env node
/**
 * Code line-count guard for VituFinance.
 *
 * Policy:
 * - >300 lines: warning, should be planned for splitting.
 * - >500 lines: failure, must be split before merging/deploying new code.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_WARNING_LIMIT = 300;
const DEFAULT_ERROR_LIMIT = 500;

const CODE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.vue',
  '.css',
  '.scss',
  '.sass',
  '.less'
]);

const EXCLUDED_DIRS = new Set([
  '.git',
  '.cache',
  '.vite',
  'backups',
  'build',
  'coverage',
  'dist',
  'logs',
  'node_modules',
  'uploads'
]);

const APP_ROOTS = {
  backend: 'backend',
  frontend: 'frontend',
  admin: 'admin'
};

function parseArgs(argv) {
  const options = {
    apps: [],
    warningLimit: DEFAULT_WARNING_LIMIT,
    errorLimit: DEFAULT_ERROR_LIMIT
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--warn' || arg === '--warning') {
      options.warningLimit = Number(argv[++i]);
    } else if (arg === '--max' || arg === '--error') {
      options.errorLimit = Number(argv[++i]);
    } else if (arg === '--all') {
      options.apps = Object.keys(APP_ROOTS);
    } else if (!arg.startsWith('--')) {
      options.apps.push(arg);
    }
  }

  if (options.apps.length === 0) {
    const cwd = path.resolve(process.cwd());
    const detectedApp = Object.entries(APP_ROOTS)
      .find(([, relativeRoot]) => cwd === path.join(repoRoot, relativeRoot));
    options.apps = detectedApp ? [detectedApp[0]] : Object.keys(APP_ROOTS);
  }

  if (!Number.isFinite(options.warningLimit) || options.warningLimit < 1) {
    throw new Error('--warn must be a positive number');
  }
  if (!Number.isFinite(options.errorLimit) || options.errorLimit < options.warningLimit) {
    throw new Error('--max must be greater than or equal to --warn');
  }

  const unknownApps = options.apps.filter(app => !APP_ROOTS[app]);
  if (unknownApps.length > 0) {
    throw new Error(`Unknown app(s): ${unknownApps.join(', ')}. Use backend, frontend, admin, or --all.`);
  }

  return options;
}

function shouldSkipDirectory(name) {
  return EXCLUDED_DIRS.has(name);
}

function shouldCheckFile(filePath) {
  if (filePath.endsWith('.min.js')) {
    return false;
  }
  return CODE_EXTENSIONS.has(path.extname(filePath));
}

async function collectFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDirectory(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }

      if (entry.isFile() && shouldCheckFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function countLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r\n|\r|\n/).length;
}

async function scanApp(appName, warningLimit, errorLimit) {
  const appRoot = path.join(repoRoot, APP_ROOTS[appName]);
  const files = await collectFiles(appRoot);
  const records = [];

  for (const file of files) {
    const lines = await countLines(file);
    if (lines > warningLimit) {
      records.push({
        app: appName,
        file: path.relative(repoRoot, file),
        lines,
        level: lines > errorLimit ? 'error' : 'warning'
      });
    }
  }

  return records.sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));
}

function printRecords(title, records) {
  if (records.length === 0) {
    return;
  }

  console.log(`\n${title}`);
  for (const record of records) {
    console.log(`  ${record.lines.toString().padStart(5)}  ${record.file}`);
  }
}

async function main() {
  const { apps, warningLimit, errorLimit } = parseArgs(process.argv.slice(2));
  const allRecords = [];

  for (const app of apps) {
    allRecords.push(...await scanApp(app, warningLimit, errorLimit));
  }

  const errors = allRecords.filter(record => record.level === 'error');
  const warnings = allRecords.filter(record => record.level === 'warning');

  console.log(`[line-check] apps=${apps.join(', ')} warn>${warningLimit} fail>${errorLimit}`);
  console.log(`[line-check] scanned files over warning threshold: ${allRecords.length}`);

  printRecords(`Files over ${errorLimit} lines, must split:`, errors);
  printRecords(`Files over ${warningLimit} lines, plan splitting:`, warnings);

  if (errors.length > 0) {
    console.log(`\n[line-check] failed: ${errors.length} file(s) exceed ${errorLimit} lines.`);
    process.exit(1);
  }

  console.log('\n[line-check] passed.');
}

main().catch(error => {
  console.error(`[line-check] ${error.message}`);
  process.exit(1);
});
