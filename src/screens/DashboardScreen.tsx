import { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { listInProcessOrders, updateOrderDueDate } from '../db/orders';
import { exportAndShareDailyDigest } from '../services/reportPdf';
import type { Order } from '../types/models';
import { OrderListItem } from '../components/OrderListItem';
import { AppLogo } from '../components/AppLogo';
import { colors, gradientAccent, radius, spacing, typography } from '../theme/theme';
import { usePressScale } from '../utils/usePressScale';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSendingDigest, setIsSendingDigest] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    return listInProcessOrders()
      .then((result) => setOrders(result))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleDueDateChange = async (orderId: number, dueDate: string | null) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, dueDate } : o)));
    await updateOrderDueDate(orderId, dueDate);
  };

  const handleSendDigest = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available in web preview',
        'The daily digest reads photos directly off the device and only works in the installed Android app.'
      );
      return;
    }
    setIsSendingDigest(true);
    try {
      const { jobCount } = await exportAndShareDailyDigest();
      Alert.alert('Digest ready', `Sent a digest covering ${jobCount} job${jobCount === 1 ? '' : 's'} completed today.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the daily digest.';
      Alert.alert('Digest not sent', message);
    } finally {
      setIsSendingDigest(false);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const dueThisWeek = orders.filter((o) => o.dueDate).length;
  const overdueCount = orders.filter((o) => o.dueDate && o.dueDate < today).length;
  const newOrderPress = usePressScale();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[colors.accentTint, colors.background]} style={styles.heroBand}>
        <View style={styles.centered}>
          <View style={styles.header}>
            <AppLogo size={44} />
            <View style={styles.headerText}>
              <Text style={styles.title}>BPD Capture</Text>
              <Text style={styles.subtitle}>
                {loading
                  ? 'Loading…'
                  : `${orders.length} in process${dueThisWeek ? ` · ${dueThisWeek} with a due date` : ''}${
                      overdueCount ? ` · ${overdueCount} overdue` : ''
                    }`}
              </Text>
            </View>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate('Insights')} hitSlop={8}>
              <Text style={styles.headerIconText}>📊</Text>
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate('Calendar')} hitSlop={8}>
              <Text style={styles.headerIconText}>📅</Text>
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate('Settings')} hitSlop={8}>
              <Text style={styles.headerIconText}>⚙️</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => navigation.navigate('NewOrder')}
              onPressIn={newOrderPress.onPressIn}
              onPressOut={newOrderPress.onPressOut}
            >
              <Animated.View style={newOrderPress.style}>
                <LinearGradient
                  colors={gradientAccent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionButton, styles.actionButtonFull, styles.primaryAction]}
                >
                  <Text style={styles.primaryActionText}>+ New Order</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
            <View style={styles.actionsPairRow}>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate('SearchByCe')}>
                <Text style={styles.actionButtonText}>Search by CE</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => navigation.navigate('SearchByClient')}>
                <Text style={styles.actionButtonText}>Search by Client</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.actionButton, styles.actionButtonFull]}
              onPress={() => navigation.navigate('BrowseByDate')}
            >
              <Text style={styles.actionButtonText}>Browse Completed</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.actionButtonFull]}
              onPress={handleSendDigest}
              disabled={isSendingDigest}
            >
              <Text style={styles.actionButtonText}>
                {isSendingDigest ? 'Preparing digest…' : '📨 Send Daily Digest'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>In Process</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OrderListItem
            order={item}
            onPress={() => navigation.navigate('JobDetail', { orderId: item.id })}
            onDueDateChange={(dueDate) => handleDueDateChange(item.id, dueDate)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No orders in process. Tap "+ New Order" to start one.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heroBand: {
    paddingBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  actionsPairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionButtonFull: {
    flex: 0,
    width: '100%',
  },
  actionButtonText: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
  primaryAction: {
    borderWidth: 0,
  },
  primaryActionText: {
    fontWeight: '700',
    color: colors.textOnDark,
    fontSize: 13,
  },
  sectionLabel: {
    ...typography.label,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  empty: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
