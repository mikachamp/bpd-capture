import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { createOrder, DuplicateCeNumberError, getOrderByCe } from '../db/orders';
import { addClient, listClients } from '../db/clients';
import type { Client } from '../types/models';
import { isValidCeNumber } from '../utils/ceNumber';
import { DueDateChip } from '../components/DueDateChip';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NewOrder'>;

export function NewOrderScreen({ navigation }: Props) {
  const [ceNumber, setCeNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    listClients().then(setClients);
  }, []);

  const clientSuggestions = useMemo(() => {
    const query = clientName.trim().toLowerCase();
    if (!query) return [];
    return clients
      .filter((c) => c.name.toLowerCase().includes(query) && c.name.toLowerCase() !== query)
      .slice(0, 5);
  }, [clients, clientName]);

  const handleCreate = async () => {
    if (!isValidCeNumber(ceNumber)) {
      Alert.alert('CE number required', 'Enter a valid CE number to open this job.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({ ceNumber, dueDate, clientName, projectName });
      const trimmedClient = clientName.trim();
      if (trimmedClient) {
        // Fire-and-forget: new client names are saved for future autocomplete
        // suggestions without blocking navigation into the new job.
        addClient(trimmedClient).catch(() => {});
      }
      navigation.replace('Order', { orderId: order.id });
    } catch (error) {
      if (error instanceof DuplicateCeNumberError) {
        const existing = await getOrderByCe(ceNumber);
        if (existing) {
          Alert.alert('CE already exists', `Opening the existing order for ${existing.ceNumber}.`, [
            { text: 'OK', onPress: () => navigation.replace('Order', { orderId: existing.id }) },
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
              onFocus={() => setShowSuggestions(false)}
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
              onChangeText={(text) => {
                setClientName(text);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Marcus Reyes"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              style={styles.input}
              returnKeyType="next"
            />
            {showSuggestions && clientSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {clientSuggestions.map((client) => (
                  <Pressable
                    key={client.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setClientName(client.name);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{client.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.label, styles.fieldSpacing]}>Project Name</Text>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              onFocus={() => setShowSuggestions(false)}
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
  suggestionsBox: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.textPrimary,
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
});
