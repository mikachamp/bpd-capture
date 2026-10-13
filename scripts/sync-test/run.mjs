// Bundles src/sync/syncCore.ts and runs the two-device scenarios in test.mjs.
// Usage (from the project root): npm run test:sync
// Uses the desktop project's esbuild (../BPD_Capture_Desktop/node_modules).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const require = createRequire(join(root, '..', 'BPD_Capture_Desktop', 'package.json'));
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: [join(root, 'src/sync/syncCore.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: join(here, 'out/syncCore.js'),
  logLevel: 'error',
});
await import('./test.mjs');
