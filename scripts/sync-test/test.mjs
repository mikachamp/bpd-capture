// Two simulated devices syncing through an in-memory fake of GitHub's git data API.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const core = require('./out/syncCore.js');
const { syncOnce, GitHubError, utf8ToBase64, base64ToUtf8 } = core;

// ---- fake GitHub: content-addressed blobs/trees/commits + one branch ----
class FakeGitHub {
  constructor() { this.blobs = new Map(); this.trees = new Map(); this.commits = new Map(); this.branch = null; this.n = 0; this.interfere = null; this.calls = 0; }
  id(p) { return p + (++this.n); }
  async head(etag) { this.calls++; if (!this.branch) return null; const tag = 'W/' + this.branch; return etag === tag ? 'unchanged' : { sha: this.branch, etag: tag }; }
  async commitTree(c) { return this.commits.get(c).tree; }
  async listTree(t) { return new Map(this.trees.get(t)); }
  async blobBase64(s) { return this.blobs.get(s); }
  async createBlob(b64) { const s = this.id('b'); this.blobs.set(s, b64); return s; }
  async createTree(base, entries) { const m = new Map(base ? this.trees.get(base) : []); for (const e of entries) { if (e.sha) m.set(e.path, e.sha); else m.delete(e.path); } const t = this.id('t'); this.trees.set(t, m); return t; }
  async createCommit(msg, tree, parents) { const c = this.id('c'); this.commits.set(c, { tree, parents, msg }); return c; }
  async moveBranch(c) {
    if (this.interfere) { const f = this.interfere; this.interfere = null; await f(); }
    if (!this.commits.get(c).parents.includes(this.branch)) throw new GitHubError(422, 'not a fast forward');
    this.branch = c;
  }
  async createBranch(c) { this.branch = c; }
  files() { return [...this.trees.get(this.commits.get(this.branch).tree).keys()].sort(); }
}

// ---- fake device store ----
let clock = 0;
const now = () => `2026-10-13T12:00:${String(++clock).padStart(2, '0')}.000Z`;
class Device {
  constructor(name) { this.name = name; this.jobs = new Map(); this.clients = new Map(); this.media = new Map(); this.files = new Map(); this.tombs = new Set(); this.index = new Map(); this.state = new Map(); }
  // app-side actions (what the db layer does)
  addJob(ce, extra = {}) { const uuid = extra.uuid ?? `${this.name}-job-${++clock}`; const t = now(); const j = { uuid, ceNumber: ce, status: 'in_process', createdAt: t, updatedAt: t, completedAt: null, dueDate: null, notes: null, clientName: null, projectName: null, syncedAt: null, ...extra }; this.jobs.set(uuid, j); return j; }
  editJob(uuid, patch) { Object.assign(this.jobs.get(uuid), patch, { updatedAt: now() }); }
  deleteJob(uuid) { this.jobs.delete(uuid); for (const [k, m] of this.media) if (m.jobUuid === uuid) this.media.delete(k); if (!uuid.startsWith('demo-')) this.tombs.add(`jobs/${uuid}.json`).add(`media/${uuid}/`); }
  addPhoto(jobUuid, bytes) { const uuid = `${this.name}-m-${++clock}`; const t = now(); this.media.set(uuid, { uuid, jobUuid, type: 'photo', fileName: `photo_${clock}.jpg`, extension: 'jpg', createdAt: t, updatedAt: t, syncedAt: null }); this.files.set(uuid, bytes); return uuid; }
  // SyncStore
  strip(r) { const { syncedAt, ...rest } = r; return rest; }
  dirty(map) { return [...map.values()].filter((r) => !r.syncedAt || r.syncedAt < r.updatedAt).map((r) => this.strip(r)); }
  async dirtyJobs() { return this.dirty(this.jobs); }
  async dirtyClients() { return this.dirty(this.clients); }
  async dirtyMedia() { return this.dirty(this.media); }
  async tombstones() { return [...this.tombs]; }
  async clearTombstones(p) { p.forEach((x) => this.tombs.delete(x)); }
  stamp(r) { return r ? { updatedAt: r.updatedAt, syncedAt: r.syncedAt } : null; }
  async jobStamp(u) { return this.stamp(this.jobs.get(u)); }
  async clientStamp(u) { return this.stamp(this.clients.get(u)); }
  async mediaStamp(u) { return this.stamp(this.media.get(u)); }
  async applyJob(r) { const isNew = !this.jobs.has(r.uuid); this.jobs.set(r.uuid, { ...r, syncedAt: r.updatedAt }); return isNew; }
  async applyClient(r) { this.clients.set(r.uuid, { ...r, syncedAt: r.updatedAt }); }
  async applyMedia(r, b64) { if (!this.jobs.has(r.jobUuid)) return; this.media.set(r.uuid, { ...r, syncedAt: r.updatedAt }); if (b64 !== null) this.files.set(r.uuid, base64ToUtf8(b64)); }
  async deleteJobLocal(u) { this.jobs.delete(u); for (const [k, m] of this.media) if (m.jobUuid === u) this.media.delete(k); }
  async deleteClientLocal(u) { this.clients.delete(u); }
  async deleteMediaLocal(u) { this.media.delete(u); this.files.delete(u); }
  async readMediaForUpload(r) { return utf8ToBase64(this.files.get(r.uuid)); }
  async markSynced(kind, u, at) { const m = kind === 'job' ? this.jobs : kind === 'client' ? this.clients : this.media; if (m.get(u)) m.get(u).syncedAt = at; }
  async remoteIndex() { return new Map(this.index); }
  async saveRemoteIndex(i) { this.index = new Map(i); }
  async getState(k) { return this.state.get(k) ?? null; }
  async setState(k, v) { this.state.set(k, v); }
}

const gh = new FakeGitHub();
const phone = new Device('phone');
const desk = new Device('desk');
const sync = (d) => syncOnce(gh, d, d.name);
const ces = (d) => [...d.jobs.values()].map((j) => j.ceNumber).sort();
let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log('✓', name); };

await step('first sync creates the data branch; demo jobs never upload', async () => {
  phone.addJob('CE-DEMO', { uuid: 'demo-CE-DEMO' });
  const real = phone.addJob('CE-100', { projectName: 'Roof — Ünïcode “quotes” ✓' });
  phone.addPhoto(real.uuid, 'PHOTO-BYTES-1');
  const r = await sync(phone);
  assert.equal(r.pushed, 2);
  assert.ok(gh.files().includes(`jobs/${real.uuid}.json`));
  assert.ok(!gh.files().some((f) => f.includes('demo-')));
});

await step('desktop pulls the new job and its photo; reports it as new', async () => {
  const r = await sync(desk);
  assert.deepEqual(ces(desk), ['CE-100']);
  assert.equal(r.newJobs.length, 1);
  const job = [...desk.jobs.values()][0];
  assert.equal(job.projectName, 'Roof — Ünïcode “quotes” ✓', 'UTF-8 round-trip');
  assert.equal([...desk.files.values()][0], 'PHOTO-BYTES-1');
});

await step('nothing to do: second sync is up to date and makes no commit', async () => {
  const before = gh.branch;
  const r = await sync(desk);
  assert.equal(r.upToDate, true);
  assert.equal(gh.branch, before);
});

await step('edit on desktop reaches the phone', async () => {
  const uuid = [...desk.jobs.keys()][0];
  desk.editJob(uuid, { notes: 'Gutter torn' });
  await sync(desk); await sync(phone);
  assert.equal(phone.jobs.get(uuid).notes, 'Gutter torn');
});

await step('both edit the same job offline: the newer edit wins on both', async () => {
  const uuid = [...phone.jobs.keys()].find((u) => !u.startsWith('demo-'));
  phone.editJob(uuid, { notes: 'phone edit (older)' });
  desk.editJob(uuid, { notes: 'desk edit (newer)' });
  await sync(phone); await sync(desk); await sync(phone);
  assert.equal(phone.jobs.get(uuid).notes, 'desk edit (newer)');
  assert.equal(desk.jobs.get(uuid).notes, 'desk edit (newer)');
});

await step('other device pushes mid-sync: retry merges both, nothing lost', async () => {
  const a = phone.addJob('CE-200');
  gh.interfere = async () => { desk.addJob('CE-300'); await sync(desk); };
  await sync(phone);
  await sync(desk); await sync(phone);
  assert.deepEqual(ces(phone).filter((c) => c !== 'CE-DEMO'), ['CE-100', 'CE-200', 'CE-300']);
  assert.deepEqual(ces(desk), ['CE-100', 'CE-200', 'CE-300']);
  assert.ok(a);
});

await step('delete on phone removes the job and its media everywhere', async () => {
  const uuid = [...phone.jobs.values()].find((j) => j.ceNumber === 'CE-100').uuid;
  phone.deleteJob(uuid);
  await sync(phone);
  assert.ok(!gh.files().some((f) => f.includes(uuid)), 'job + media gone from GitHub');
  const r = await sync(desk);
  assert.equal(r.deletedLocal, 1);
  assert.ok(!desk.jobs.has(uuid) && desk.files.size === 0);
});

await step('deleted on one device but edited on the other: the edit is kept', async () => {
  const uuid = [...desk.jobs.values()].find((j) => j.ceNumber === 'CE-200').uuid;
  desk.deleteJob(uuid);
  await sync(desk);
  phone.editJob(uuid, { notes: 'still needed' });
  await sync(phone); await sync(desk);
  assert.equal(desk.jobs.get(uuid)?.notes, 'still needed');
});

await step('deleting a demo job leaves nothing to sync', async () => {
  phone.deleteJob('demo-CE-DEMO');
  assert.equal(phone.tombs.size, 0);
});

console.log(`\n${passed} scenarios passed. GitHub files now:\n  ${gh.files().join('\n  ')}`);
