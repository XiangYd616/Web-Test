#!/usr/bin/env node
/**
 * sync-version.mjs
 *
 * Single source of truth: root package.json "version"
 * Syncs to all other locations that contain a version string.
 *
 * Usage:
 *   node scripts/sync-version.mjs          # sync current version
 *   node scripts/sync-version.mjs 1.2.0    # set + sync specific version
 *   node scripts/sync-version.mjs patch     # bump patch (1.0.0 -> 1.0.1)
 *   node scripts/sync-version.mjs minor     # bump minor (1.0.0 -> 1.1.0)
 *   node scripts/sync-version.mjs major     # bump major (1.0.0 -> 2.0.0)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── helpers ──────────────────────────────────────────

function readJSON(rel) {
  const abs = resolve(ROOT, rel);
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function writeJSON(rel, obj) {
  const abs = resolve(ROOT, rel);
  writeFileSync(abs, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function replaceInFile(rel, pattern, replacement) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    console.log(`  ⏭  skip (not found): ${rel}`);
    return false;
  }
  const content = readFileSync(abs, 'utf-8');
  const updated = content.replace(pattern, replacement);
  if (content === updated) {
    console.log(`  ✓  already up-to-date: ${rel}`);
    return false;
  }
  writeFileSync(abs, updated, 'utf-8');
  console.log(`  ✔  updated: ${rel}`);
  return true;
}

function bumpSemver(version, type) {
  const parts = version.split('.').map(Number);
  if (type === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (type === 'minor') { parts[1]++; parts[2] = 0; }
  else if (type === 'patch') { parts[2]++; }
  else { throw new Error(`Unknown bump type: ${type}`); }
  return parts.join('.');
}

// ─── determine target version ────────────────────────

const rootPkg = readJSON('package.json');
const currentVersion = rootPkg.version;
const arg = process.argv[2];

let targetVersion;
if (!arg) {
  targetVersion = currentVersion;
  console.log(`\nSyncing current version: ${targetVersion}\n`);
} else if (['major', 'minor', 'patch'].includes(arg)) {
  targetVersion = bumpSemver(currentVersion, arg);
  console.log(`\nBumping ${arg}: ${currentVersion} → ${targetVersion}\n`);
} else if (/^\d+\.\d+\.\d+/.test(arg)) {
  targetVersion = arg;
  console.log(`\nSetting version: ${currentVersion} → ${targetVersion}\n`);
} else {
  console.error(`Usage: node scripts/sync-version.mjs [patch|minor|major|x.y.z]`);
  process.exit(1);
}

// ─── 1. package.json files ───────────────────────────

const packageFiles = [
  'package.json',
  'tools/electron/package.json',
  'frontend/package.json',
  'backend/package.json',
  'shared/package.json',
  'website/package.json',
];

for (const rel of packageFiles) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    console.log(`  ⏭  skip (not found): ${rel}`);
    continue;
  }
  const pkg = readJSON(rel);
  if (pkg.version === targetVersion) {
    console.log(`  ✓  already up-to-date: ${rel}`);
    continue;
  }
  pkg.version = targetVersion;
  writeJSON(rel, pkg);
  console.log(`  ✔  updated: ${rel}`);
}

// ─── 2. versions.json ────────────────────────────────

const versionsFile = 'versions.json';
if (existsSync(resolve(ROOT, versionsFile))) {
  const vj = readJSON(versionsFile);
  if (vj.project?.version !== targetVersion) {
    vj.project.version = targetVersion;
    writeJSON(versionsFile, vj);
    console.log(`  ✔  updated: ${versionsFile}`);
  } else {
    console.log(`  ✓  already up-to-date: ${versionsFile}`);
  }
}

// ─── 3. .env files (VITE_APP_VERSION / APP_VERSION) ──

const envFiles = [
  '.env',
  '.env.production',
  '.env.example',
  'backend/.env',
  'backend/.env.production',
];

for (const rel of envFiles) {
  replaceInFile(
    rel,
    /^((?:VITE_)?APP_VERSION)=.*/m,
    `$1=${targetVersion}`
  );
}

// ─── done ────────────────────────────────────────────

console.log(`\n✅ All files synced to v${targetVersion}\n`);
