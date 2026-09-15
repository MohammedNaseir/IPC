// Standalone deployment helper.
//   node scripts/standalone.mjs prepare  -> copy .next/static and public/ into .next/standalone (run after `next build`)
//   node scripts/standalone.mjs start    -> prepare if needed, then run the standalone server on process.env.PORT
// `start` self-prepares because a host may run a bare `next build` that skips the prepare step.
import { cpSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const serverFile = path.join(standaloneDir, 'server.js');

function prepare() {
  if (!existsSync(serverFile)) {
    console.error('Missing .next/standalone/server.js. Run `npm run build` first (next.config must set output: "standalone").');
    process.exit(1);
  }
  const staticSrc = path.join(root, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  if (!existsSync(staticSrc)) {
    console.error('Missing .next/static. The build output is incomplete.');
    process.exit(1);
  }
  cpSync(staticSrc, staticDest, { recursive: true, force: true });

  const publicSrc = path.join(root, 'public');
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, path.join(standaloneDir, 'public'), { recursive: true, force: true });
  }
}

const command = process.argv[2];
if (command === 'prepare') {
  prepare();
  console.log('Standalone output prepared.');
} else if (command === 'start') {
  if (!existsSync(path.join(standaloneDir, '.next', 'static'))) prepare();
  createRequire(import.meta.url)(serverFile);
} else {
  console.error('Usage: node scripts/standalone.mjs <prepare|start>');
  process.exit(1);
}
