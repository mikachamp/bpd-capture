import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { listInProcessOrders } from '../db/orders';
import type { Order } from '../types/models';
import { currentStep, whereLabel } from '../utils/stages';
import { Icon } from '../components/Icon';
import { colors, fonts, radius, spacing } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PickJob'>;

/** "Capture" from the tab bar: pick the order, and the camera opens on its current stage. */
export function PickJobScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    listInProcessOrders().then((list) => setOrders([...list].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>Which order?</Text>
        <Pressable style={styles.round} onPress={() => navigation.goBack()} accessibilityLabel="Close"><Icon name="close" size={20} /></Pressable>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No open orders. Create one from Jobs first.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.replace('Capture', { orderId: item.id, ceNumber: item.ceNumber, stage: item.stage, step: currentStep(item) })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.client}>{item.clientName || 'No client'} · {item.ceNumber}</Text>
              <Text style={styles.project} numberOfLines={1}>{item.projectName || item.ceNumber}</Text>
            </View>
            <Text style={styles.stage}>{whereLabel(item)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  title: { fontFamily: fonts.family, fontSize: 26, letterSpacing: -0.4, color: colors.textPrimary },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  client: { fontFamily: fonts.family, fontSize: 12.5, color: colors.textMuted },
  project: { fontFamily: fonts.family, fontSize: 17, color: colors.textPrimary, marginTop: 2 },
  stage: { fontFamily: fonts.family, fontSize: 13, color: colors.accentText, borderRadius: radius.pill },
  empty: { fontFamily: fonts.family, fontSize: 14, color: colors.textMuted, marginTop: spacing.xl },
});
