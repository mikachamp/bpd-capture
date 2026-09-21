import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import { getDispatcherContact, setDispatcherContact } from '../db/settings';
import { exportBackup, importBackup } from '../services/backup';
import { colors, radius, spacing, typography } from '../theme/theme';

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

  const handleExportBackup = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'Backup export reads the database and media files directly off the device and only works in the installed Android app.'
      );
      return;
    }
    setIsExportingBackup(true);
    try {
      await exportBackup();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create a backup. Please try again.';
      Alert.alert('Backup failed', message);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const runRestore = async () => {
    setIsRestoringBackup(true);
    try {
      const outcome = await importBackup();
      if (outcome === 'restored') {
        Alert.alert(
          'Backup restored',
          'Your data has been replaced with the backup. Close BPD Capture completely and reopen it for the restored data to show up.'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not restore this backup. Please try again.';
      Alert.alert('Restore failed', message);
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleImportBackup = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'Backup restore reads the database and media files directly off the device and only works in the installed Android app.'
      );
      return;
    }
    Alert.alert(
      'Restore from backup?',
      'This replaces every job, photo, and video currently on this device with what\'s in the backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: runRestore },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={styles.headerSaveText}>{justSaved ? 'Saved ✓' : 'Save'}</Text>
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
              <Text style={styles.secondaryButtonText}>👥 Manage Clients</Text>
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
                {isExportingBackup ? 'Preparing backup…' : '📦 Create Full Backup'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.fieldSpacing]}
              onPress={handleImportBackup}
              disabled={isRestoringBackup}
            >
              <Text style={styles.secondaryButtonText}>
                {isRestoringBackup ? 'Restoring…' : '♻️ Restore from Backup'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    fontSize: 16,
  },
  headerSaveText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
    paddingHorizontal: spacing.sm,
  },
});
