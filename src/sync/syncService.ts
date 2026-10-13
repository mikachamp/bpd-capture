import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSetting, setSetting } from '../db/settings';
import { onLocalChange } from './changes';
import { GITHUB_APP_CLIENT_ID, PUSH_DEBOUNCE_MS, SYNC_INTERVAL_MS } from './config';
import { createMobileStore, skippedUploads } from './mobileStore';
import { GitHub, GitHubError, githubLogin, startDeviceFlow, syncOnce, waitForDeviceToken, type DeviceCode } from './syncCore';

const TOKEN_KEY = 'github_token';
const LOGIN_KEY = 'sync.login';
const LAST_SYNC_KEY = 'sync.lastSyncAt';

export type SyncStatus = {
  phase: 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'error';
  login: string | null;
  lastSyncAt: string | null;
  message: string | null;
};

let status: SyncStatus = { phase: GITHUB_APP_CLIENT_ID ? 'signed-out' : 'unconfigured', login: null, lastSyncAt: null, message: null };
const statusListeners = new Set<(s: SyncStatus) => void>();
const dataListeners = new Set<() => void>();
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setInterval> | null = null;
let debounce: ReturnType<typeof setTimeout> | null = null;
let started = false;

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const listener of statusListeners) listener(status);
}

export const getSyncStatus = () => status;
export function onSyncStatus(listener: (s: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}
/** Fires after a sync changed local data, so open screens can reload. */
export function onSyncedData(listener: () => void): () => void {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

const deviceName = () => `phone (${(Platform.constants as { Model?: string }).Model ?? Platform.OS})`;

/** Runs one sync now; if one is already running, queues exactly one more after it. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        setStatus({ phase: 'syncing', message: null });
        skippedUploads.length = 0;
        const result = await syncOnce(new GitHub(token), createMobileStore(), deviceName());
        const now = new Date().toISOString();
        await setSetting(LAST_SYNC_KEY, now);
        const skipped = skippedUploads.length ? `Not synced (over 95 MB after compression): ${skippedUploads.join(', ')}` : null;
        setStatus({ phase: 'idle', lastSyncAt: now, message: skipped });
        if (result.pulledJobs || result.deletedLocal) for (const listener of dataListeners) listener();
      } while (again);
    } catch (error) {
      if (error instanceof GitHubError && (error.status === 401 || error.status === 403)) {
        await signOut();
        setStatus({ message: 'GitHub sign-in expired or was removed. Sign in again to keep syncing.' });
      } else {
        const offline = error instanceof TypeError; // fetch network failure
        setStatus({ phase: 'error', message: offline ? 'No internet. Changes are saved and will sync when you are back online.' : error instanceof Error ? error.message : 'Sync failed.' });
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

function schedule() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (AppState.currentState === 'active') void syncNow();
  }, SYNC_INTERVAL_MS);
}

/** Called once at app start. Safe to call when signed out; it just waits for sign-in. */
export async function startSync(): Promise<void> {
  if (started || Platform.OS === 'web') return;
  started = true;
  const [token, login, lastSyncAt] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), getSetting(LOGIN_KEY), getSetting(LAST_SYNC_KEY)]);
  if (!GITHUB_APP_CLIENT_ID) setStatus({ phase: 'unconfigured', lastSyncAt });
  else setStatus({ phase: token ? 'idle' : 'signed-out', login: token ? login : null, lastSyncAt });

  onLocalChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS);
  });
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void syncNow();
  });
  schedule();
  if (token) void syncNow();
}

/** Starts GitHub's device sign-in; show code.userCode and open code.verificationUri for the user. */
export async function beginSignIn(): Promise<DeviceCode> {
  if (!GITHUB_APP_CLIENT_ID) throw new Error('Sync is not set up yet: the GitHub App Client ID is missing.');
  return startDeviceFlow(GITHUB_APP_CLIENT_ID);
}

/** Waits for the user to approve in the browser, then stores the login and runs the first sync. */
export async function finishSignIn(code: DeviceCode, isCancelled: () => boolean): Promise<string> {
  const token = await waitForDeviceToken(GITHUB_APP_CLIENT_ID, code, isCancelled);
  const login = await githubLogin(token);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await setSetting(LOGIN_KEY, login);
  setStatus({ phase: 'idle', login, message: null });
  void syncNow();
  return login;
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await setSetting(LOGIN_KEY, null);
  setStatus({ phase: GITHUB_APP_CLIENT_ID ? 'signed-out' : 'unconfigured', login: null });
}

/** The stored GitHub token, for other GitHub calls (the update check reads private releases with it). */
export const getGitHubToken = () => SecureStore.getItemAsync(TOKEN_KEY);
