// Security tests for job-folder handling (security review 2026-10-13, finding 1).
// Runs the real src/utils/ceNumber.ts and src/services/storage.ts against a
// fake expo-file-system backed by a temp folder. See run.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as ce from '@app/utils/ceNumber';
import * as storage from '@app/services/storage';
import * as guard from '@app/utils/pathGuard';

let docs = '';
let orders = '';
const uri = (p: string) => 'file://' + p.split(path.sep).join('/');

const files = () => ({
  ce1: path.join(orders, 'CE-1', 'photo_1.jpg'),
  ce2: path.join(orders, 'CE-2', 'photo_2.jpg'),
  backup: path.join(docs, 'BPD_Capture', 'backups', 'BPD-Capture-backup.zip'),
  outside: path.join(docs, 'outside.txt'),
});

function write(p: string, text: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

function assertEverythingSurvives() {
  const f = files();
  for (const [name, p] of Object.entries(f)) assert.ok(fs.existsSync(p), `${name} was deleted or moved: ${p}`);
}

async function attempt(fn: () => unknown) {
  try {
    await fn();
  } catch {
    // refusing with an error is a correct outcome; what matters is the files
  }
}

beforeEach(() => {
  docs = fs.mkdtempSync(path.join(os.tmpdir(), 'bpd-sec-'));
  process.env.BPD_FAKE_DOCUMENTS = docs;
  orders = path.join(docs, 'BPD_Capture', 'orders');
  const f = files();
  write(f.ce1, 'job 1 photo');
  write(f.ce2, 'job 2 photo');
  write(f.backup, 'backup');
  write(f.outside, 'not ours');
});

test('CE numbers made only of dots are rejected; trailing dots/spaces are trimmed', () => {
  for (const bad of ['.', '..', '...', ' . ', '. .', '  ']) {
    assert.equal(ce.isValidCeNumber(bad), false, `"${bad}" should be rejected`);
  }
  assert.equal(ce.normalizeCeNumber('CE-1. '), 'CE-1');
  assert.equal(ce.normalizeCeNumber('ce-2026-0142'), 'CE-2026-0142');
  assert.equal(typeof ce.assertValidCeNumber, 'function', 'assertValidCeNumber is missing');
  for (const bad of ['.', '..']) assert.throws(() => ce.assertValidCeNumber(bad), /valid CE number/);
});

test('deleting a job named "." does not touch other jobs or backups', async () => {
  await attempt(() => storage.deleteOrderDirectory('.'));
  assertEverythingSurvives();
});

test('deleting a job named ".." does not touch other jobs or backups', async () => {
  await attempt(() => storage.deleteOrderDirectory('..'));
  assertEverythingSurvives();
});

test('deleting "../.." or a name with separators is refused', async () => {
  for (const bad of ['../..', '..\x5c..', 'CE-1/..', ' ..', '.. ']) await attempt(() => storage.deleteOrderDirectory(bad));
  assertEverythingSurvives();
});

test('renaming to or from "." / ".." moves nothing', async () => {
  await attempt(() => storage.renameOrderDirectory('.', 'MOVED'));
  await attempt(() => storage.renameOrderDirectory('..', 'MOVED'));
  await attempt(() => storage.renameOrderDirectory('CE-1', '..'));
  await attempt(() => storage.renameOrderDirectory('CE-1', '.'));
  assertEverythingSurvives();
  assert.ok(!fs.existsSync(path.join(orders, 'MOVED')), 'a dot folder was renamed');
});

test('normal delete and rename still work', async () => {
  await storage.renameOrderDirectory('CE-1', 'CE-9');
  assert.ok(fs.existsSync(path.join(orders, 'CE-9', 'photo_1.jpg')));
  await storage.deleteOrderDirectory('CE-9');
  assert.ok(!fs.existsSync(path.join(orders, 'CE-9')));
  assert.ok(fs.existsSync(files().ce2));
});

test('renaming a photo to "../../x" keeps it inside its job folder', async () => {
  const f = files();
  await attempt(() => storage.renameMediaFile(uri(f.ce1), '..\x2f..\x2fescaped'));
  await attempt(() => storage.renameMediaFile(uri(f.ce1), '..\x5c..\x5cescaped'));
  assert.ok(!fs.existsSync(path.join(docs, 'BPD_Capture', 'escaped.jpg')), 'photo escaped to BPD_Capture/');
  assert.ok(!fs.existsSync(path.join(orders, 'escaped.jpg')), 'photo escaped to orders/');
  const stillInJob = fs.readdirSync(path.join(orders, 'CE-1'));
  assert.equal(stillInJob.length, 1, 'photo left its job folder');
});

test('deleting a media path outside the job folders leaves it alone', async () => {
  const f = files();
  await attempt(() => storage.deleteMediaFile(uri(f.backup)));
  await attempt(() => storage.deleteMediaFile(uri(f.outside)));
  await attempt(() => storage.deleteMediaFile(uri(path.join(orders, 'CE-1', '..', '..', 'backups', 'BPD-Capture-backup.zip'))));
  assertEverythingSurvives();
});

test('path guard: only paths strictly inside the orders folder pass', () => {
  assert.equal(typeof guard.isStrictlyInside, 'function', 'utils/pathGuard.ts is missing');
  const base = uri(orders);
  const inside = (p: string) => guard.isStrictlyInside(base, p);
  assert.equal(inside(uri(path.join(orders, 'CE-1', 'photo_1.jpg'))), true, 'a job photo');
  assert.equal(inside(base + '/CE-1'), true, 'a job folder');
  assert.equal(inside(base), false, 'the orders folder itself');
  assert.equal(inside(base + '/'), false, 'the orders folder with a trailing slash');
  assert.equal(inside(base + '/.'), false, 'orders/.');
  assert.equal(inside(base + '/..'), false, 'the parent folder');
  assert.equal(inside(base + '/../x'), false, '../x');
  assert.equal(inside(base + '/CE-1/../../backups/b.zip'), false, 'climbing out through a job');
  assert.equal(inside(base + '\x5c..\x5cx'), false, '..\x5cx with backslashes');
  assert.equal(inside(base + '/%2E%2E/x'), false, '%-encoded ..');
  assert.equal(inside(uri(path.join(docs, 'BPD_Capture', 'orders-old', 'x'))), false, 'a sibling that starts the same');
  assert.equal(inside('file:///etc/passwd'), false, 'an absolute path elsewhere');
  assert.equal(inside('/data/user/0/other.app/files/x'), false, 'a plain absolute path elsewhere');
});
