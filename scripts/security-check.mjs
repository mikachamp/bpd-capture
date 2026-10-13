// Static security check for both apps — run with `npm run security:check`.
// Fails (exit 1) on patterns that reintroduce the bugs SECURITY.md rules out.
// Scans the mobile app's src/ and, when it sits next to this repo, the desktop app's src/.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TARGETS = [join(ROOT, 'src'), join(ROOT, 'App.tsx'), join(ROOT, '..', 'BPD_Capture_Desktop', 'src')].filter(existsSync);

// Interpolations allowed inside SQL text: constant column lists, never user input.
const SQL_INTERPOLATION_ALLOWLIST = new Set(['ORDER_COLUMNS']);
// Variables allowed as the whole SQL argument: fixed SQL from constants in db/schema.ts.
const SQL_VARIABLE_ALLOWLIST = /^(SCHEMA_SQL|MIGRATIONS_SQL|migration)[^A-Za-z0-9_]/;
const SQL_CALL = /\b(runAsync|getAllAsync|getFirstAsync|getEachAsync|execAsync|prepareAsync|prepare|exec)\s*\(\s*/g;

const RULES = [
  {
    name: 'SQL built from strings',
    why: 'Pass values as ? parameters so typed text can never become SQL.',
    check(text) {
      const hits = [];
      for (const call of text.matchAll(SQL_CALL)) {
        const start = call.index + call[0].length;
        const quote = text[start];
        if (quote === '`') {
          const end = text.indexOf('`', start + 1);
          const sql = text.slice(start + 1, end);
          for (const m of sql.matchAll(/\$\{\s*([^}]*?)\s*\}/g)) {
            if (!SQL_INTERPOLATION_ALLOWLIST.has(m[1])) hits.push({ index: start, detail: `\${${m[1]}}` });
          }
        } else if (quote === "'" || quote === '"') {
          const end = text.indexOf(quote, start + 1);
          if (/^\s*\+/.test(text.slice(end + 1, end + 8))) hits.push({ index: start, detail: 'string concatenation' });
        } else if (!/^[)\s]/.test(quote) && !SQL_VARIABLE_ALLOWLIST.test(text.slice(start, start + 20))) {
          hits.push({ index: start, detail: `non-literal SQL: ${text.slice(start, start + 30).split('\n')[0]}` });
        }
      }
      return hits;
    },
  },
  {
    name: 'Raw HTML / dynamic code',
    why: 'React escapes text; these bypass it (XSS). Use escapeHtml() for PDF HTML instead.',
    check: (text) =>
      [...text.matchAll(/dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|\beval\s*\(|new Function\s*\(/g)].map((m) => ({
        index: m.index,
        detail: m[0],
      })),
  },
  {
    name: 'Hard-coded secret',
    why: 'Anything in the app can be extracted from the APK/installer. Never ship tokens or keys.',
    check: (text) =>
      [...text.matchAll(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----/g)].map((m) => ({
        index: m.index,
        detail: m[0].slice(0, 12) + '…',
      })),
  },
];

function* files(path) {
  if (statSync(path).isFile()) {
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    yield* files(join(path, entry));
  }
}

let failures = 0;
let scanned = 0;
for (const target of TARGETS) {
  for (const file of files(target)) {
    scanned++;
    const text = readFileSync(file, 'utf8');
    for (const rule of RULES) {
      for (const hit of rule.check(text)) {
        const line = text.slice(0, hit.index).split('\n').length;
        console.log(`✗ ${rule.name}: ${relative(join(ROOT, '..'), file)}:${line} — ${hit.detail}\n    ${rule.why}`);
        failures++;
      }
    }
  }
}

console.log(failures ? `\n${failures} problem(s) in ${scanned} files.` : `✓ No problems in ${scanned} files.`);
process.exit(failures ? 1 : 0);
