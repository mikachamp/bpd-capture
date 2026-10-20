import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';
import { beginSignIn, finishSignIn, getSyncStatus, onSyncStatus, signOut, syncNow, type SyncStatus } from '../sync/syncService';
import type { DeviceCode } from '../sync/syncCore';

/**
 * Settings → Sync. Sign in once with GitHub's device flow (a short code
 * approved in the browser — no password or token typed into the app), then
 * jobs, photos and videos sync with the desktop app through the private repo.
 */
export function SyncSettingsSection() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [code, setCode] = useState<DeviceCode | null>(null);
  const [starting, setStarting] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => onSyncStatus(setStatus), []);

  const handleSignIn = async () => {
    setStarting(true);
    cancelled.current = false;
    try {
      const deviceCode = await beginSignIn();
      setCode(deviceCode);
      Linking.openURL(deviceCode.verificationUri).catch(() => {});
      const login = await finishSignIn(deviceCode, () => cancelled.current);
      setCode(null);
      Alert.alert('Signed in', `Syncing as ${login}. Your jobs will now stay in step with the desktop app.`);
    } catch (error) {
      setCode(null);
      if (!cancelled.current) Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out of GitHub?', 'Jobs stay on this phone, but stop syncing until you sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const last = status.lastSyncAt ? `Last synced ${formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}.` : 'Not synced yet.';

  return (
    <View>
      <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Sync</Text>
      <Text style={styles.helperText}>
        Keeps jobs, photos and videos the same on this phone and the desktop app, through your private GitHub repo.
        Checks every 2 minutes while the app is open and right after you change something.
      </Text>

      {status.phase === 'unconfigured' && <Text style={[styles.helperText, styles.fieldSpacing]}>Sync isn't set up in this version yet.</Text>}

      {status.phase === 'signed-out' && !code && (
        <Pressable style={[styles.secondaryButton, styles.fieldSpacing]} onPress={handleSignIn} disabled={starting}>
          <Text style={styles.secondaryButtonText}>{starting ? 'Starting…' : 'Sign in with GitHub'}</Text>
        </Pressable>
      )}

      {code && (
        <View style={[styles.codeBox, styles.fieldSpacing]}>
          <Text style={styles.helperText}>Enter this code on the GitHub page that just opened, then approve:</Text>
          <Text style={styles.code} selectable>{code.userCode}</Text>
          <Pressable onPress={() => Linking.openURL(code.verificationUri)}>
            <Text style={styles.link}>Open {code.verificationUri.replace('https://', '')}</Text>
          </Pressable>
          <View style={styles.waitRow}>
            <ActivityIndicator color={colors.textSecondary} />
            <Text style={styles.helperText}>Waiting for approval…</Text>
          </View>
          <Pressable onPress={() => { cancelled.current = true; setCode(null); }}>
            <Text style={styles.quietLink}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {(status.phase === 'idle' || status.phase === 'syncing' || status.phase === 'error') && (
        <>
          <Text style={[styles.helperText, styles.fieldSpacing]}>
            Signed in as {status.login ?? 'GitHub user'}. {status.phase === 'syncing' ? 'Syncing now…' : last}
          </Text>
          <Pressable style={[styles.secondaryButton, styles.fieldSpacing]} onPress={() => void syncNow()} disabled={status.phase === 'syncing'}>
            <Text style={styles.secondaryButtonText}>{status.phase === 'syncing' ? 'Syncing…' : 'Sync now'}</Text>
          </Pressable>
          <Pressable onPress={handleSignOut}>
            <Text style={styles.quietLink}>Sign out of GitHub</Text>
          </Pressable>
        </>
      )}

      {status.message && <Text style={[styles.helperText, styles.fieldSpacing, styles.message]}>{status.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...typography.label },
  helperText: { ...typography.caption, fontFamily: fonts.family, fontSize: 12, lineHeight: 17 },
  fieldSpacing: { marginTop: spacing.sm },
  sectionSpacing: { marginTop: spacing.xl },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '700', fontFamily: fonts.family, fontSize: 15 },
  codeBox: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  code: { color: colors.textPrimary, fontSize: 30, fontWeight: '700', letterSpacing: 4, textAlign: 'center', paddingVertical: spacing.sm },
  link: { color: colors.accentText, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  quietLink: { color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline', textAlign: 'center', marginTop: spacing.md },
  message: { color: colors.textPrimary },
});
