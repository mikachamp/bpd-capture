import { useLayoutEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { createOrder, DuplicateCeNumberError, getOrderByCe } from '../db/orders';
import { isValidCeNumber } from '../utils/ceNumber';
import { DueDateChip } from '../components/DueDateChip';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NewOrder'>;

export function NewOrderScreen({ navigation }: Props) {
  const [ceNumber, setCeNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!isValidCeNumber(ceNumber)) {
      Alert.alert('CE number required', 'Enter a valid CE number to open this job.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({ ceNumber, dueDate, clientName, projectName });
      navigation.replace('JobDetail', { orderId: order.id });
    } catch (error) {
      if (error instanceof DuplicateCeNumberError) {
        const existing = await getOrderByCe(ceNumber);
        if (existing) {
          Alert.alert('CE already exists', `Opening the existing order for ${existing.ceNumber}.`, [
            { text: 'OK', onPress: () => navigation.replace('JobDetail', { orderId: existing.id }) },
          ]);
          return;
        }
      }
      Alert.alert('Something went wrong', 'Could not create this order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleCreate} disabled={submitting} hitSlop={8}>
          <Text style={styles.headerSaveText}>{submitting ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, ceNumber, clientName, projectName, dueDate, submitting]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.label}>CE Number</Text>
            <TextInput
              value={ceNumber}
              onChangeText={setCeNumber}
              placeholder="e.g. CE-2024-0091"
              autoCapitalize="characters"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoFocus
              style={styles.input}
              returnKeyType="next"
            />

            <Text style={[styles.label, styles.fieldSpacing]}>Client Name</Text>
            <TextInput
              value={clientName}
              onChangeText={setClientName}
              placeholder="e.g. Marcus Reyes"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              style={styles.input}
              returnKeyType="next"
            />

            <Text style={[styles.label, styles.fieldSpacing]}>Project Name</Text>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="e.g. Roof replacement — 14 Ashford Ct"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              style={styles.input}
              onSubmitEditing={handleCreate}
              returnKeyType="go"
            />

            <Text style={[styles.label, styles.fieldSpacing]}>Due Date</Text>
            <DueDateChip dueDate={dueDate} onChange={setDueDate} size="full" />

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Opening...' : 'Open Order'}</Text>
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
    gap: spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldSpacing: {
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
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
