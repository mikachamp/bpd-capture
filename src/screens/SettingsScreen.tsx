import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import { getDispatcherContact, setDispatcherContact } from '../db/settings';
import { exportBackup, importBackup, isBackupPasswordProtected, pickBackupFile } from '../services/backup';
import {
  backupThenDownloadAndInstall,
  checkForUpdate,
  currentVersion,
  openInstallPermissionSettings,
  type UpdateInfo,
} from '../services/appUpdate';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';
import { SyncSettingsSection } from '../components/SyncSettingsSection';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [passwordPromptMode, setPasswordPromptMode] = useState<'export' | 'restore' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingRestoreUri, setPendingRestoreUri] = useState<string | null>(null);

  useEffect(() => {
    getDispatcherContact().then((contact) => {
      setEmail(contact.email ?? '');
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const trimmedEmail = email.trim();
    await setDispatcherContact({ email: trimmedEmail || null });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1200);
  };

  const runExport = async (password?: string) => {
    setIsExportingBackup(true);
    try {
      await exportBackup(password || undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create a backup. Please try again.';
      Alert.alert('Backup failed', message);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExportBackup = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'Backup export reads the database and media files directly off the device and only works in the installed Android app.'
      );
      return;
    }
    setPasswordInput('');
    setPasswordPromptMode('export');
  };

  const runRestore = (uri: string, password?: string) => {
    Alert.alert(
      'Restore from backup?',
      "This replaces every job, photo, and video currently on this device with what's in the backup file. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoringBackup(true);
            try {
              await importBackup(uri, password || undefined);
              Alert.alert(
                'Backup restored',
                'Your data has been replaced with the backup. Close BPD Capture completely and reopen it for the restored data to show up.'
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Could not restore this backup. Please try again.';
              Alert.alert('Restore failed', message);
            } finally {
              setIsRestoringBackup(false);
            }
          },
        },
      ]
    );
  };

  const handleImportBackup = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'Backup restore reads the database and media files directly off the device and only works in the installed Android app.'
      );
      return;
    }
    try {
      const uri = await pickBackupFile();
      if (!uri) return;
      const protectedFile = await isBackupPasswordProtected(uri);
      if (protectedFile) {
        setPasswordInput('');
        setPendingRestoreUri(uri);
        setPasswordPromptMode('restore');
      } else {
        runRestore(uri);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read this backup file. Please try again.';
      Alert.alert('Restore failed', message);
    }
  };

  const closePasswordPrompt = () => {
    setPasswordPromptMode(null);
    setPasswordInput('');
    setPendingRestoreUri(null);
  };

  const submitPasswordPrompt = () => {
    const mode = passwordPromptMode;
    const password = passwordInput;
    const restoreUri = pendingRestoreUri;
    closePasswordPrompt();
    if (mode === 'export') {
      runExport(password);
    } else if (mode === 'restore' && restoreUri) {
      runRestore(restoreUri, password);
    }
  };

  const runUpdate = async (update: UpdateInfo) => {
    setIsInstallingUpdate(true);
    try {
      await backupThenDownloadAndInstall(update);
    } catch (error) {
      Alert.alert(
        'Update failed',
        "Could not install the update. If Android blocked it, allow this app to install other apps, then try again.",
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { openInstallPermissionSettings().catch(() => {}); } },
        ]
      );
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  const handleCheckForUpdate = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available in web preview', 'Update checks only work in the installed Android app.');
      return;
    }
    setIsCheckingUpdate(true);
    try {
      const update = await checkForUpdate();
      if (!update) {
        Alert.alert("You're up to date", `Running the latest version (${currentVersion()}).`);
        return;
      }
      Alert.alert(
        `Update available — ${update.tagName}`,
        'Your data is backed up automatically on this phone, then the update downloads and Android asks you to tap Install.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Now', onPress: () => runUpdate(update) },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check for updates. Please try again.';
      Alert.alert('Update check failed', message);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={styles.headerSaveText}>{justSaved ? 'Saved' : 'Save'}</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, email, justSaved]);

  if (!loaded) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>Clients</Text>
            <Text style={styles.helperText}>
              Manage the client names suggested when creating a new job.
            </Text>
            <Pressable
              style={[styles.secondaryButton, styles.fieldSpacing]}
              onPress={() => navigation.navigate('Clients')}
            >
              <Text style={styles.secondaryButtonText}>Manage Clients</Text>
            </Pressable>

            <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Dispatcher Contact</Text>
            <Text style={styles.helperText}>
              Saved here, field reports and the daily digest are sent straight to this dispatcher —
              email opens pre-addressed with the PDF attached, no share-sheet chooser needed.
            </Text>

            <Text style={[styles.label, styles.fieldSpacing]}>Dispatcher Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. dispatch@blueprintdigital.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />

            <Pressable style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </Pressable>

            <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Data Backup</Text>
            <Text style={styles.helperText}>
              Everything lives only on this device — there's no cloud sync. Create a backup
              file periodically and save it somewhere safe (Drive, a computer) in case this
              phone is lost, reset, or the app is uninstalled.
            </Text>

            <Pressable
              style={[styles.secondaryButton, styles.fieldSpacing]}
              onPress={handleExportBackup}
              disabled={isExportingBackup}
            >
              <Text style={styles.secondaryButtonText}>
                {isExportingBackup ? 'Preparing backup…' : 'Create Full Backup'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.fieldSpacing]}
              onPress={handleImportBackup}
              disabled={isRestoringBackup}
            >
              <Text style={styles.secondaryButtonText}>
                {isRestoringBackup ? 'Restoring…' : 'Restore from Backup'}
              </Text>
            </Pressable>

            <SyncSettingsSection />

            <Text style={[styles.sectionLabel, styles.sectionSpacing]}>App Updates</Text>
            <Text style={styles.helperText}>
              Current version {currentVersion()}. Checks GitHub for a newer release, backs up
              your data automatically, then walks you through installing it — Android always
              requires you to confirm the install yourself.
            </Text>
            <Pressable
              style={[styles.secondaryButton, styles.fieldSpacing]}
              onPress={handleCheckForUpdate}
              disabled={isCheckingUpdate || isInstallingUpdate}
            >
              <Text style={styles.secondaryButtonText}>
                {isInstallingUpdate
                  ? 'Backing up & downloading…'
                  : isCheckingUpdate
                    ? 'Checking…'
                    : 'Check for Updates'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={passwordPromptMode !== null} transparent animationType="fade" onRequestClose={closePasswordPrompt}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.passwordBackdrop}>
          <View style={styles.passwordSheet}>
            <Text style={styles.passwordTitle}>
              {passwordPromptMode === 'export' ? 'Protect this backup? (optional)' : 'This backup is password-protected'}
            </Text>
            <Text style={styles.helperText}>
              {passwordPromptMode === 'export'
                ? "Set a password to encrypt the backup, or leave blank to create it without one."
                : 'Enter the password it was created with to restore it.'}
            </Text>
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.fieldSpacing]}
              onSubmitEditing={submitPasswordPrompt}
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.passwordButtonRow}>
              <Pressable style={styles.passwordCancelButton} onPress={closePasswordPrompt}>
                <Text style={styles.passwordCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.passwordSubmitButton} onPress={submitPasswordPrompt}>
                <Text style={styles.passwordSubmitText}>
                  {passwordPromptMode === 'export' ? 'Create Backup' : 'Restore'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // clears the floating tab bar
  },
  content: {
    padding: spacing.xl,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  sectionLabel: {
    ...typography.label,
  },
  helperText: {
    ...typography.caption,
    fontFamily: fonts.family,
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldSpacing: {
    marginTop: spacing.sm,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.family,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: colors.textOnDark,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 16,
  },
  headerSaveText: {
    color: colors.accent,
    fontWeight: '700',
    fontFamily: fonts.family,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
  },
  passwordBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,22,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  passwordSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  passwordTitle: {
    ...typography.subtitle,
  },
  passwordButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  passwordCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  passwordCancelText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  passwordSubmitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  passwordSubmitText: {
    fontWeight: '700',
    color: colors.textOnDark,
  },
});
