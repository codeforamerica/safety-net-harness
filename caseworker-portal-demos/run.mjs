#!/usr/bin/env node
/**
 * Demo setup/teardown runner.
 *
 * Starts the mock server and seeds demo data for a named demo. Everything
 * runs from one command — no manual steps.
 *
 * Usage:
 *   node run.mjs --demo=cbms
 *   node run.mjs --demo=cbms --teardown
 *
 * Environment:
 *   BLUEPRINT_DIR  Path to the safety-net-blueprint repo
 *                  (default: ../../safety-net-blueprint relative to this file)
 *
 * What it does (setup):
 *   1. Resolve overlays → /tmp/snb-demo-<name>/specs/
 *   2. Start the mock server in the background (--detach), using the resolved
 *      specs and the demo's seeds/ directory for YAML seed data
 *   3. Wait for the server to be ready
 *   4. Run seed.mjs if present — seeds data that requires live API calls
 *      (e.g., applications going through real state machine transitions)
 *   5. Generate TypeScript clients → data/<name>/.generated/
 *
 * What it does (teardown):
 *   1. Stop the running mock server
 *   2. Remove /tmp/snb-demo-<name>/ and data/<name>/.generated/
 */

import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blueprintDir = resolve(
  process.env.BLUEPRINT_DIR ?? join(__dirname, '../../safety-net-blueprint'),
);

// ── Parse args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const demoArg = args.find((a) => a.startsWith('--demo='));
const teardown = args.includes('--teardown');

if (!demoArg) {
  console.error('Usage: node run.mjs --demo=<name> [--teardown]');
  process.exit(1);
}

const demoName = demoArg.split('=')[1];
const demoDir = join(__dirname, 'data', demoName);

if (!existsSync(demoDir)) {
  console.error(`Demo not found: ${demoDir}`);
  process.exit(1);
}

const tmpDir = join('/tmp', `snb-demo-${demoName}`);
const specsOut = join(tmpDir, 'specs');
const generatedOut = join(demoDir, '.generated');

const serverScript = join(blueprintDir, 'packages/mock-server/scripts/server.js');
const resolveScript = join(blueprintDir, 'packages/contracts/scripts/resolve.js');
const generateScript = join(blueprintDir, 'packages/clients/scripts/generate-clients-typescript.js');
const blueprintContracts = join(blueprintDir, 'packages/contracts');
const overlaysDir = join(demoDir, 'overlays');
const seedsDir = join(demoDir, 'seeds');
const seedScript = join(demoDir, 'seed.mjs');

// ── Teardown ──────────────────────────────────────────────────────────────────

if (teardown) {
  console.log(`Tearing down demo: ${demoName}`);

  execFileSync('node', [serverScript, '--stop'], { stdio: 'inherit' });

  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true });
    console.log(`  Removed ${tmpDir}`);
  }
  if (existsSync(generatedOut)) {
    rmSync(generatedOut, { recursive: true });
    console.log(`  Removed ${generatedOut}`);
  }
  console.log('Done.');
  process.exit(0);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

console.log('='.repeat(70));
console.log(`Demo setup: ${demoName}`);
console.log('='.repeat(70));
console.log(`  Demo dir:    ${demoDir}`);
console.log(`  Blueprint:   ${blueprintDir}`);
console.log(`  Specs out:   ${specsOut}`);
console.log(`  Client out:  ${generatedOut}`);

if (!existsSync(blueprintDir)) {
  console.error(`\nBlueprint not found at: ${blueprintDir}`);
  console.error('Set BLUEPRINT_DIR env var to the correct path.');
  process.exit(1);
}

// ── Step 1: Resolve overlays ──────────────────────────────────────────────────

console.log('\n── Step 1: Resolving overlays ───────────────────────────────────');

mkdirSync(specsOut, { recursive: true });

const resolveArgs = [resolveScript, `--spec=${blueprintContracts}`, `--out=${specsOut}`];

if (existsSync(overlaysDir)) {
  resolveArgs.push(`--overlay=${overlaysDir}`);
  console.log(`  Applying overlays from ${overlaysDir}`);
} else {
  console.log('  No overlays directory — copying base specs unchanged');
}

execFileSync('node', resolveArgs, { stdio: 'inherit' });

// ── Step 2: Start mock server ─────────────────────────────────────────────────

console.log('\n── Step 2: Starting mock server ─────────────────────────────────');

// Stop any existing instance first so the new server can bind to the port.
try {
  execFileSync('node', [serverScript, '--stop'], { stdio: 'pipe' });
} catch {
  // Nothing was running — that's fine.
}

const serverArgs = [serverScript, '--detach', `--spec=${specsOut}`];

const hasSeedYaml =
  existsSync(seedsDir) &&
  readdirSync(seedsDir).some((f) => f.endsWith('.yaml'));

if (hasSeedYaml) {
  serverArgs.push(`--seed=${seedsDir}`);
  console.log(`  YAML seeds: ${seedsDir}`);
} else {
  console.log('  No YAML seeds');
}

execFileSync('node', serverArgs, {
  stdio: 'inherit',
  // SKIP_VALIDATION: seed YAML files may include readOnly fields (e.g. dueDate,
  // isExpedited) that are valid demo data but fail schema validation because
  // they are server-computed in production.
  env: { ...process.env, SKIP_VALIDATION: 'true' },
});

// ── Step 3: Wait for server ready ─────────────────────────────────────────────

console.log('\n── Step 3: Waiting for server ───────────────────────────────────');

const serverUrl = 'http://localhost:1080/intake/applications';
const maxAttempts = 40;
const delayMs = 500;

for (let i = 0; i < maxAttempts; i++) {
  try {
    const res = await fetch(serverUrl);
    if (res.status < 500) {
      console.log(`  Server ready (attempt ${i + 1})`);
      break;
    }
  } catch {
    // Connection refused — not ready yet
  }
  if (i === maxAttempts - 1) {
    console.error(`  Server did not start within ${(maxAttempts * delayMs) / 1000}s`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

// ── Step 4: Run seed script ───────────────────────────────────────────────────

if (existsSync(seedScript)) {
  console.log('\n── Step 4: Running seed script ──────────────────────────────────');
  execFileSync('node', [seedScript], { stdio: 'inherit' });
} else {
  console.log('\n── Step 4: No seed script — skipping ────────────────────────────');
}

// ── Step 5: Generate TypeScript clients ──────────────────────────────────────

console.log('\n── Step 5: Generating TypeScript clients ────────────────────────');

mkdirSync(generatedOut, { recursive: true });

execFileSync('node', [generateScript, `--spec=${specsOut}`, `--out=${generatedOut}`], {
  stdio: 'inherit',
});

// ── Done ──────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70));
console.log('Demo setup complete!');
console.log('='.repeat(70));
console.log('\nMock server is running on http://localhost:1080');
console.log('\nStart the demo app:');
console.log(`  cd ${__dirname} && npm install && npm run dev`);
console.log('\nWhen done:');
console.log(`  node run.mjs --demo=${demoName} --teardown\n`);
