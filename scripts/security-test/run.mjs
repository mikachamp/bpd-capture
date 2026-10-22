// Bundles storage.test.ts with esbuild and runs it with Node's test runner.
//   npm run test:security                 -> tests the current src/
//   node scripts/security-test/run.mjs <dir>  -> tests another copy of src/ (e.g. an old commit)
// Native modules are replaced by the fakes in ./fakes. Uses the desktop project's esbuild.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const srcDir = resolve(process.argv[2] ?? join(root, 'src'));
const require = createRequire(join(root, '..', 'BPD_Capture_Desktop', 'package.json'));
const esbuild = require('esbuild');

const missing = join(here, 'fakes', 'missing.mjs');
const out = join(here, 'out', 'storage.test.mjs');
await esbuild.build({
  entryPoints: [join(here, 'storage.test.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
  alias: {
    'react-native': join(here, 'fakes', 'react-native.mjs'),
    'expo-file-system': join(here, 'fakes', 'expo-file-system.mjs'),
    'expo-media-library/legacy': join(here, 'fakes', 'empty.mjs'),
    'expo-media-library': join(here, 'fakes', 'empty.mjs'),
  },
  plugins: [
    {
      name: 'app-src',
      setup(build) {
        build.onResolve({ filter: /^@app\// }, (args) => {
          const file = join(srcDir, args.path.slice(5)) + '.ts';
          return { path: existsSync(file) ? file : missing };
        });
      },
    },
  ],
});
console.log(`Testing ${srcDir}\n`);
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', out], { stdio: 'inherit' });
process.exit(result.status ?? 1);
