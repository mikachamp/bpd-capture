// Same file in BPD_Capture_Desktop/src/shared/sync/syncCore.ts — keep identical.
// Platform-free sync engine: everything device-specific (database, files,
// video compression) comes in through the SyncStore interface, and GitHub is
// reached with plain fetch, which both React Native and Electron's Node have.

import {
  DATA_BRANCH,
  DEMO_UUID_PREFIX,
  clientPath,
  jobPath,
  mediaBinaryPath,
  mediaMetaPath,
} from './paths';

export const REPO = 'mikachamp/bpd-capture';

// ---------- Records as stored on GitHub ----------

export type JobRecord = {
  uuid: string;
  ceNumber: string;
  status: 'in_process' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dueDate: string | null;
  notes: string | null;
  clientName: string | null;
  projectName: string | null;
};

export type MediaRecord = {
  uuid: string;
  jobUuid: string;
  type: 'photo' | 'video';
  fileName: string;
  extension: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = { uuid: string; name: string; createdAt: string; updatedAt: string };

/** What the local side knows about one record: when it was last edited and last synced. */
export type LocalStamp = { updatedAt: string; syncedAt: string | null } | null;

export interface SyncStore {
  dirtyJobs(): Promise<JobRecord[]>;
  dirtyClients(): Promise<ClientRecord[]>;
  dirtyMedia(): Promise<MediaRecord[]>;
  tombstones(): Promise<string[]>;
  clearTombstones(paths: string[]): Promise<void>;

  jobStamp(uuid: string): Promise<LocalStamp>;
  clientStamp(uuid: string): Promise<LocalStamp>;
  mediaStamp(uuid: string): Promise<LocalStamp>;

  /** Insert or overwrite from GitHub, marking it synced at record.updatedAt. Returns true for a job new to this device. */
  applyJob(record: JobRecord): Promise<boolean>;
  applyClient(record: ClientRecord): Promise<void>;
  /** base64 is null when only the metadata changed and the local file is kept. */
  applyMedia(record: MediaRecord, base64: string | null): Promise<void>;
  deleteJobLocal(uuid: string): Promise<void>;
  deleteClientLocal(uuid: string): Promise<void>;
  deleteMediaLocal(uuid: string): Promise<void>;

  /**
   * The file's bytes for upload (videos compressed first), as base64 — or null
   * to skip this item (e.g. still too big for GitHub's 100 MB file limit after
   * compression). The store decides how to tell the user and whether to retry.
   */
  readMediaForUpload(record: MediaRecord): Promise<string | null>;
  markSynced(kind: 'job' | 'client' | 'media', uuid: string, updatedAt: string): Promise<void>;

  remoteIndex(): Promise<Map<string, string>>;
  saveRemoteIndex(index: Map<string, string>): Promise<void>;
  getState(key: string): Promise<string | null>;
  setState(key: string, value: string | null): Promise<void>;
}

export type SyncResult = {
  pulledJobs: number;
  newJobs: JobRecord[];
  pushed: number;
  deletedLocal: number;
  upToDate: boolean;
};

// ---------- GitHub (git data API) ----------

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHub {
  constructor(private token: string, private repo = REPO) {}

  private async call(path: string, init: RequestInit = {}, okStatuses: number[] = []): Promise<Response> {
    const response = await fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!response.ok && !okStatuses.includes(response.status)) {
      const text = await response.text().catch(() => '');
      throw new GitHubError(response.status, `GitHub ${response.status}: ${text.slice(0, 200)}`);
    }
    return response;
  }

  /** Head commit of the data branch; 'unchanged' when the ETag still matches; null when the branch doesn't exist yet. */
  async head(etag: string | null): Promise<{ sha: string; etag: string | null } | 'unchanged' | null> {
    const response = await this.call(`/git/ref/heads/${DATA_BRANCH}`, etag ? { headers: { 'If-None-Match': etag } } : {}, [304, 404]);
    if (response.status === 304) return 'unchanged';
    if (response.status === 404) return null;
    const body = await response.json();
    return { sha: body.object.sha, etag: response.headers.get('ETag') };
  }

  async commitTree(commitSha: string): Promise<string> {
    const body = await (await this.call(`/git/commits/${commitSha}`)).json();
    return body.tree.sha;
  }

  /** Every file in a tree: path -> blob sha. */
  async listTree(treeSha: string): Promise<Map<string, string>> {
    const body = await (await this.call(`/git/trees/${treeSha}?recursive=1`)).json();
    if (body.truncated) throw new Error('The data branch has too many files to list in one request.');
    const map = new Map<string, string>();
    for (const entry of body.tree as { path: string; type: string; sha: string }[]) {
      if (entry.type === 'blob') map.set(entry.path, entry.sha);
    }
    return map;
  }

  async blobBase64(sha: string): Promise<string> {
    const body = await (await this.call(`/git/blobs/${sha}`)).json();
    return String(body.content).replace(/\n/g, '');
  }

  async createBlob(base64: string): Promise<string> {
    const body = await (await this.call('/git/blobs', { method: 'POST', body: JSON.stringify({ content: base64, encoding: 'base64' }) })).json();
    return body.sha;
  }

  async createTree(baseTree: string | null, entries: { path: string; sha: string | null }[]): Promise<string> {
    const tree = entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha }));
    const body = await (await this.call('/git/trees', { method: 'POST', body: JSON.stringify(baseTree ? { base_tree: baseTree, tree } : { tree }) })).json();
    return body.sha;
  }

  async createCommit(message: string, treeSha: string, parents: string[]): Promise<string> {
    const body = await (await this.call('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: treeSha, parents }) })).json();
    return body.sha;
  }

  /** Fast-forward only: fails with 422 if someone else pushed first, so nothing is ever overwritten. */
  async moveBranch(commitSha: string): Promise<void> {
    await this.call(`/git/refs/heads/${DATA_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commitSha, force: false }) });
  }

  async createBranch(commitSha: string): Promise<void> {
    await this.call('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${DATA_BRANCH}`, sha: commitSha }) });
  }
}

// ---------- base64 + UTF-8 helpers (no Buffer/btoa/TextDecoder dependency) ----------

function utf8Encode(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const c = char.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let c: number;
    if (b < 0x80) { c = b; i += 1; }
    else if (b < 0xe0) { c = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    out += String.fromCodePoint(c);
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function utf8ToBase64(text: string): string {
  const bytes = utf8Encode(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

export function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    bytes.push((n >> 16) & 255);
    if (clean[i + 2] !== undefined) bytes.push((n >> 8) & 255);
    if (clean[i + 3] !== undefined) bytes.push(n & 255);
  }
  return utf8Decode(bytes);
}

// ---------- the sync itself ----------

const isDirty = (stamp: LocalStamp) => !!stamp && (!stamp.syncedAt || stamp.syncedAt < stamp.updatedAt);
const uuidFrom = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
const isMediaMeta = (path: string) => path.startsWith('media/') && path.endsWith('.json');
const json = <T>(base64: string): T => JSON.parse(base64ToUtf8(base64)) as T;

const STATE_HEAD = 'sync.headSha';
const STATE_ETAG = 'sync.etag';

/**
 * One full sync: pull what changed on GitHub since last time, then push local
 * changes as a single commit. Newest edit wins per record. Retries when the
 * other device pushed in between (the branch only ever moves forward).
 */
export async function syncOnce(gh: GitHub, store: SyncStore, deviceName: string): Promise<SyncResult> {
  const result: SyncResult = { pulledJobs: 0, newJobs: [], pushed: 0, deletedLocal: 0, upToDate: false };

  for (let attempt = 0; attempt < 4; attempt++) {
    // 1. Where is the data branch now?
    let head = await gh.head(attempt === 0 ? await store.getState(STATE_ETAG) : null);
    if (head === null) {
      const tree = await gh.createTree(null, [{ path: 'README.md', sha: await gh.createBlob(utf8ToBase64('# BPD Capture data\n\nSynced job data. Written by the BPD Capture apps; do not edit by hand.\n')) }]);
      const commit = await gh.createCommit('Create data branch', tree, []);
      await gh.createBranch(commit);
      head = { sha: commit, etag: null };
    }
    const lastSha = await store.getState(STATE_HEAD);
    if (head === 'unchanged' && !lastSha) head = await gh.head(null);
    if (head === null) throw new Error('The data branch disappeared during sync.');
    let index = await store.remoteIndex();
    let headSha = head === 'unchanged' ? (lastSha as string) : head.sha;
    let treeSha: string | null = null;

    // 2. Pull, if GitHub moved since our last sync.
    if (head !== 'unchanged' && head.sha !== lastSha) {
      treeSha = await gh.commitTree(head.sha);
      const remote = await gh.listTree(treeSha);
      const changed = [...remote].filter(([path, sha]) => index.get(path) !== sha).map(([path]) => path);
      const removed = [...index.keys()].filter((path) => !remote.has(path));

      for (const path of changed.filter((p) => p.startsWith('jobs/'))) {
        const record = json<JobRecord>(await gh.blobBase64(remote.get(path)!));
        const local = await store.jobStamp(record.uuid);
        if (!local || !isDirty(local) || record.updatedAt > local.updatedAt) {
          const isNew = await store.applyJob(record);
          result.pulledJobs++;
          if (isNew) result.newJobs.push(record);
        }
      }
      for (const path of changed.filter((p) => p.startsWith('clients/'))) {
        const record = json<ClientRecord>(await gh.blobBase64(remote.get(path)!));
        const local = await store.clientStamp(record.uuid);
        if (!local || !isDirty(local) || record.updatedAt > local.updatedAt) await store.applyClient(record);
      }
      for (const path of changed.filter(isMediaMeta)) {
        const record = json<MediaRecord>(await gh.blobBase64(remote.get(path)!));
        const local = await store.mediaStamp(record.uuid);
        if (local && isDirty(local) && record.updatedAt <= local.updatedAt) continue;
        const binarySha = remote.get(mediaBinaryPath(record.jobUuid, record.uuid, record.extension));
        if (!binarySha) continue; // sidecar without its file: skip until the upload finishes
        await store.applyMedia(record, local ? null : await gh.blobBase64(binarySha));
      }
      // Gone from GitHub = deleted on another device, unless edited here since.
      for (const path of removed) {
        const uuid = uuidFrom(path);
        if (path.startsWith('jobs/')) {
          if (!isDirty(await store.jobStamp(uuid))) { await store.deleteJobLocal(uuid); result.deletedLocal++; }
        } else if (path.startsWith('clients/')) {
          if (!isDirty(await store.clientStamp(uuid))) await store.deleteClientLocal(uuid);
        } else if (isMediaMeta(path)) {
          if (!isDirty(await store.mediaStamp(uuid))) await store.deleteMediaLocal(uuid);
        }
      }
      index = remote;
      await store.saveRemoteIndex(index);
      await store.setState(STATE_HEAD, head.sha);
      await store.setState(STATE_ETAG, head.etag);
      headSha = head.sha;
    }

    // 3. Push local changes.
    const [jobs, clients, media, tombstones] = await Promise.all([store.dirtyJobs(), store.dirtyClients(), store.dirtyMedia(), store.tombstones()]);
    const live = <T extends { uuid: string }>(rows: T[]) => rows.filter((r) => !r.uuid.startsWith(DEMO_UUID_PREFIX));
    const entries: { path: string; sha: string | null }[] = [];
    const pushedRecords: { kind: 'job' | 'client' | 'media'; uuid: string; updatedAt: string }[] = [];

    for (const job of live(jobs)) {
      entries.push({ path: jobPath(job.uuid), sha: await gh.createBlob(utf8ToBase64(JSON.stringify(job, null, 2))) });
      pushedRecords.push({ kind: 'job', uuid: job.uuid, updatedAt: job.updatedAt });
    }
    for (const client of live(clients)) {
      entries.push({ path: clientPath(client.uuid), sha: await gh.createBlob(utf8ToBase64(JSON.stringify(client, null, 2))) });
      pushedRecords.push({ kind: 'client', uuid: client.uuid, updatedAt: client.updatedAt });
    }
    for (const item of live(media).filter((m) => !m.jobUuid.startsWith(DEMO_UUID_PREFIX))) {
      const binaryPath = mediaBinaryPath(item.jobUuid, item.uuid, item.extension);
      if (!index.has(binaryPath)) {
        const data = await store.readMediaForUpload(item);
        if (data === null) continue;
        entries.push({ path: binaryPath, sha: await gh.createBlob(data) });
      }
      entries.push({ path: mediaMetaPath(item.jobUuid, item.uuid), sha: await gh.createBlob(utf8ToBase64(JSON.stringify(item, null, 2))) });
      pushedRecords.push({ kind: 'media', uuid: item.uuid, updatedAt: item.updatedAt });
    }
    for (const tomb of tombstones) {
      const prefix = tomb.endsWith('/') || tomb.endsWith('.');
      for (const path of index.keys()) {
        if (prefix ? path.startsWith(tomb) : path === tomb) entries.push({ path, sha: null });
      }
    }

    if (entries.length === 0) {
      if (tombstones.length) await store.clearTombstones(tombstones);
      result.upToDate = result.pulledJobs === 0 && result.deletedLocal === 0;
      return result;
    }

    if (!treeSha) treeSha = await gh.commitTree(headSha);
    const newTree = await gh.createTree(treeSha, entries);
    const commit = await gh.createCommit(`Sync from ${deviceName}: ${pushedRecords.length} change(s)`, newTree, [headSha]);
    try {
      await gh.moveBranch(commit);
    } catch (error) {
      if (error instanceof GitHubError && error.status === 422) continue; // the other device pushed first: pull again
      throw error;
    }

    for (const record of pushedRecords) await store.markSynced(record.kind, record.uuid, record.updatedAt);
    await store.clearTombstones(tombstones);
    for (const entry of entries) {
      if (entry.sha) index.set(entry.path, entry.sha);
      else index.delete(entry.path);
    }
    await store.saveRemoteIndex(index);
    await store.setState(STATE_HEAD, commit);
    await store.setState(STATE_ETAG, null);
    result.pushed = pushedRecords.length;
    return result;
  }
  throw new Error('Another device kept syncing at the same moment. Try again in a minute.');
}

// ---------- Sign in with GitHub (device flow; no client secret needed) ----------

export type DeviceCode = { deviceCode: string; userCode: string; verificationUri: string; interval: number; expiresIn: number };

export async function startDeviceFlow(clientId: string): Promise<DeviceCode> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  });
  const body = await response.json();
  if (!response.ok || !body.device_code) throw new Error(body.error_description || 'Could not start GitHub sign-in.');
  return { deviceCode: body.device_code, userCode: body.user_code, verificationUri: body.verification_uri, interval: body.interval ?? 5, expiresIn: body.expires_in ?? 900 };
}

/** Polls until the user approves in the browser. Resolves with the token, or throws on denial/expiry/cancel. */
export async function waitForDeviceToken(clientId: string, code: DeviceCode, isCancelled: () => boolean = () => false): Promise<string> {
  let interval = code.interval;
  const deadline = Date.now() + code.expiresIn * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    if (isCancelled()) throw new Error('Sign-in cancelled.');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, device_code: code.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
    });
    const body = await response.json();
    if (body.access_token) return body.access_token as string;
    if (body.error === 'authorization_pending') continue;
    if (body.error === 'slow_down') { interval += 5; continue; }
    if (body.error === 'access_denied') throw new Error('Sign-in was declined on GitHub.');
    if (body.error === 'expired_token') break;
    throw new Error(body.error_description || 'GitHub sign-in failed.');
  }
  throw new Error('The sign-in code expired. Start again.');
}

export async function githubLogin(token: string): Promise<string> {
  const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new GitHubError(response.status, 'That GitHub sign-in no longer works. Sign in again.');
  return (await response.json()).login as string;
}
