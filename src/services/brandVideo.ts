import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { getSetting, setSetting } from '../db/settings';
import { saveToGallery } from './storage';

const SAVED_KEY = 'startup_video_saved';

/**
 * Drops a video of the startup animation (assets/bpd-startup-animation.mp4,
 * rendered from the same three.js scene) into the gallery once, the first
 * time this version runs. Only marked done once it actually saves, so a
 * declined permission prompt gets another chance next launch.
 */
export async function saveStartupVideoOnce(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await getSetting(SAVED_KEY)) return;

  const [asset] = await Asset.loadAsync(require('../../assets/bpd-startup-animation.mp4'));
  if (!asset.localUri) return;

  // The gallery keeps the file's name, so give it a readable one instead of the asset hash.
  const named = new File(Paths.cache, 'BPD Startup Animation.mp4');
  if (named.exists) named.delete();
  await new File(asset.localUri).copy(named);

  if (await saveToGallery(named.uri)) {
    await setSetting(SAVED_KEY, new Date().toISOString());
  }
}
