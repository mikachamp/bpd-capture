import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BENCHES, getBench, getNightShift, getOperator, getStaff, setBench, setNightShift, setOperator, setStaff, type Bench, type NightShift } from '../db/team';
import { Icon } from './Icon';
import { colors, fonts, isFloor, radius, spacing, typography } from '../theme/theme';

/**
 * Settings → Workshop team. The names offered when someone signs off a stage,
 * who uses this phone (prefilled on sign-offs), and which bench this phone
 * sits at (the Floor build's job list puts that bench's jobs first).
 */
export function TeamSettingsSection() {
  const [staff, setStaffList] = useState<string[]>([]);
  const [operator, setOperatorName] = useState<string | null>(null);
  const [bench, setBenchKey] = useState<Bench>('all');
  const [night, setNight] = useState<NightShift>('auto');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    void (async () => {
      setStaffList(await getStaff());
      setOperatorName(await getOperator());
      setBenchKey(await getBench());
      setNight(await getNightShift());
    })();
  }, []);

  const addName = async () => {
    const name = newName.trim();
    if (!name) return;
    const next = [...staff.filter((n) => n.toLowerCase() !== name.toLowerCase()), name];
    await setStaff(next);
    setStaffList(next);
    setNewName('');
  };

  const removeName = async (name: string) => {
    const next = staff.filter((n) => n !== name);
    await setStaff(next);
    setStaffList(next);
    if (operator === name) {
      await setOperator(null);
      setOperatorName(null);
    }
  };

  const chooseOperator = async (name: string) => {
    const value = operator === name ? null : name;
    await setOperator(value);
    setOperatorName(value);
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Workshop team</Text>
      <Text style={styles.helperText}>The people who sign off stages. Their names appear as quick choices when a job moves on.</Text>

      <View style={[styles.chips, styles.fieldSpacing]}>
        {staff.map((name) => (
          <View key={name} style={styles.nameChip}>
            <Text style={styles.chipText}>{name}</Text>
            <Pressable onPress={() => void removeName(name)} hitSlop={10} accessibilityLabel={`Remove ${name}`}>
              <Icon name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
        {staff.length === 0 && <Text style={styles.helperText}>No names yet.</Text>}
      </View>
      <View style={[styles.addRow, styles.fieldSpacing]}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Add a name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onSubmitEditing={() => void addName()}
          returnKeyType="done"
          autoCapitalize="words"
        />
        <Pressable style={styles.addButton} onPress={() => void addName()} accessibilityLabel="Add name">
          <Icon name="plus" size={20} color={colors.accentInk} strokeWidth={2.2} />
        </Pressable>
      </View>

      {staff.length > 0 && (
        <>
          <Text style={[styles.label, styles.sectionSpacingSmall]}>This phone is used by</Text>
          <View style={[styles.chips, styles.fieldSpacing]}>
            {staff.map((name) => (
              <Pressable key={name} style={[styles.choice, operator === name && styles.choiceOn]} onPress={() => void chooseOperator(name)}>
                <Text style={[styles.choiceText, operator === name && styles.choiceTextOn]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.label, styles.sectionSpacingSmall]}>My bench</Text>
      <Text style={styles.helperText}>Jobs waiting at this bench are listed first on this phone.</Text>
      <View style={[styles.chips, styles.fieldSpacing]}>
        {BENCHES.map((b) => (
          <Pressable key={b.key} style={[styles.choice, bench === b.key && styles.choiceOn]} onPress={() => { setBenchKey(b.key); void setBench(b.key); }}>
            <Text style={[styles.choiceText, bench === b.key && styles.choiceTextOn]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>

      {isFloor && (
        <>
          <Text style={[styles.label, styles.sectionSpacingSmall]}>Night Shift (dark screens)</Text>
          <Text style={styles.helperText}>Auto turns it on for jobs at the Installed stage, for installers in store at night or in bright sun.</Text>
          <View style={[styles.chips, styles.fieldSpacing]}>
            {(['auto', 'on', 'off'] as NightShift[]).map((mode) => (
              <Pressable key={mode} style={[styles.choice, night === mode && styles.choiceOn]} onPress={() => { setNight(mode); void setNightShift(mode); }}>
                <Text style={[styles.choiceText, night === mode && styles.choiceTextOn]}>{mode === 'auto' ? 'Auto' : mode === 'on' ? 'Always on' : 'Off'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const TARGET = isFloor ? 48 : 38;

const styles = StyleSheet.create({
  sectionLabel: { ...typography.label },
  label: { ...typography.label, color: colors.textSecondary },
  helperText: { ...typography.caption, fontFamily: fonts.family, fontSize: 12, lineHeight: 17 },
  fieldSpacing: { marginTop: spacing.sm },
  sectionSpacingSmall: { marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nameChip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: TARGET, paddingLeft: 14, paddingRight: 10, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.family, fontSize: 15, color: colors.textPrimary },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, height: TARGET + 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, fontFamily: fonts.family, fontSize: 16, color: colors.textPrimary },
  addButton: { width: TARGET + 4, height: TARGET + 4, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  choice: { height: TARGET, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.selected, borderColor: colors.selected },
  choiceText: { fontFamily: fonts.family, fontSize: 15, color: colors.textSecondary },
  choiceTextOn: { color: colors.selectedText, fontWeight: '600' },
});
