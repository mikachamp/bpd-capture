import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import { createLocalBackup } from './backup';

/**
 * This app is sideloaded (no Play Store), so there is no store-level update
 * mechanism. Checking a public GitHub repo's Releases is the only update
 * channel available without standing up a server — which would contradict
 * this app's offline-first, no-backend design. The repo must stay public:
 * a private repo's release API needs an authenticated request, and the only
 * way to authenticate from inside a distributed APK is to embed a token in
 * it, which anyone can extract by unzipping the APK. That's not a secret at
 * that point, so this deliberately avoids it entirely.
 */
const REPO = 'mikachamp/bpd-capture';

export type UpdateInfo = {
  tagName: string;
  version: string;
  downloadUrl: string;
  notes: string | null;
};

function parseVersion(tag: string): string {
  return tag.replace(/^v/i, '');
}

/** Plain dotted-numeric semver comparison — good enough for "1.2.0" style tags. */
function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map((part) => Number(part) || 0);
  const l = local.split('.').map((part) => Number(part) || 0);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

/**
 * Returns the newer release's info, or null if the installed app is already
 * current. Throws a friendly error on network failure or a malformed
 * release (no APK asset attached).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Platform.OS === 'web') {
    throw new Error('Update checks only work in the installed Android app.');
  }

  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  if (!response.ok) {
    throw new Error('Could not reach GitHub to check for updates. Check your connection and try again.');
  }
  const release = await response.json();
  const tagName: string = release.tag_name;
  const remoteVersion = parseVersion(tagName);
  const localVersion = Application.nativeApplicationVersion ?? '0.0.0';

  if (!isNewerVersion(remoteVersion, localVersion)) {
    return null;
  }

  const asset = (release.assets ?? []).find((a: { name: string }) => a.name.toLowerCase().endsWith('.apk'));
  if (!asset) {
    throw new Error(`Release ${tagName} has no installable APK attached.`);
  }

  return {
    tagName,
    version: remoteVersion,
    downloadUrl: asset.browser_download_url,
    notes: typeof release.body === 'string' ? release.body : null,
  };
}

/**
 * Backs up current data first — per explicit requirement, an update never
 * proceeds without one. The backup is saved silently inside the app (no
 * share sheet), then the new APK is downloaded and handed off to
 * Android's own package installer UI. Android requires the user to confirm
 * the install themselves; no app can silently replace itself, sideloaded or
 * not, so this is as close to "automatic" as the platform allows.
 */
export async function backupThenDownloadAndInstall(update: UpdateInfo): Promise<void> {
  await createLocalBackup();

  const destination = new File(Paths.cache, `bpd-capture-${update.tagName}.apk`);
  if (destination.exists) {
    destination.delete();
  }
  const downloaded = await File.downloadFileAsync(update.downloadUrl, destination);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: downloaded.contentUri,
    flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}

/** Fallback if the install intent fails because this app isn't allowed to install packages yet. */
export function openInstallPermissionSettings(): Promise<IntentLauncher.IntentLauncherResult> {
  return IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: `package:${Application.applicationId}`,
  });
}

export function currentVersion(): string {
  return Application.nativeApplicationVersion ?? '1.0.0';
}
