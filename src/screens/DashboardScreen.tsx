import { useCallback, useState, useMemo } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { onSyncedData } from '../sync/syncService';
import { format } from 'date-fns';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/types';
import { listInProcessOrders, listAllCompletedOrders, updateOrderDueDate } from '../db/orders';
import { exportAndShareDailyDigest } from '../services/reportPdf';
import type { Order } from '../types/models';
import { OrderListItem } from '../components/OrderListItem';
import { AppLogo } from '../components/AppLogo';
import { colors, fonts, gradientAccent, radius, spacing, typography } from '../theme/theme';
import { usePressScale } from '../utils/usePressScale';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'DashboardTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [activeTab, setActiveTab] = useState<'in_process' | 'completed'>('in_process');
  const [searchQuery, setSearchQuery] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    const fetcher = activeTab === 'in_process' ? listInProcessOrders : listAllCompletedOrders;
    return fetcher()
      .then((result) => setOrders(result))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Jobs added or changed on the desktop appear without leaving the screen.
  useFocusEffect(useCallback(() => onSyncedData(() => void reload()), [reload]));

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

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const lowerQ = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.ceNumber.toLowerCase().includes(lowerQ) ||
        (o.clientName && o.clientName.toLowerCase().includes(lowerQ)) ||
        (o.projectName && o.projectName.toLowerCase().includes(lowerQ))
    );
  }, [orders, searchQuery]);

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
                  : activeTab === 'in_process' 
                    ? `${orders.length} active${dueThisWeek ? ` · ${dueThisWeek} with due date` : ''}${overdueCount ? ` · ${overdueCount} overdue` : ''}`
                    : `${orders.length} completed`}
              </Text>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by CE, Client, or Project..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.segmentContainer}>
            <Pressable 
              style={[styles.segmentTab, activeTab === 'in_process' && styles.segmentTabActive]} 
              onPress={() => { setActiveTab('in_process'); setSearchQuery(''); }}
            >
              <Text style={[styles.segmentTabText, activeTab === 'in_process' && styles.segmentTabTextActive]}>In Process</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentTab, activeTab === 'completed' && styles.segmentTabActive]}
              onPress={() => { setActiveTab('completed'); setSearchQuery(''); }}
            >
              <Text style={[styles.segmentTabText, activeTab === 'completed' && styles.segmentTabTextActive]}>Completed</Text>
            </Pressable>
          </View>

          <Text style={styles.listHeading}>
            {activeTab === 'in_process' ? 'Active Jobs' : 'Completed Jobs'}
          </Text>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OrderListItem
            order={item}
            onPress={() => navigation.navigate('Order', { orderId: item.id })}
            onDueDateChange={(dueDate) => handleDueDateChange(item.id, dueDate)}
          />
        )}
        ListHeaderComponent={
          activeTab === 'completed' ? (
            <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
              <Pressable
                style={[styles.actionButton, styles.actionButtonFull]}
                onPress={handleSendDigest}
                disabled={isSendingDigest}
              >
                <Text style={styles.actionButtonText}>
                  {isSendingDigest ? 'Preparing digest…' : 'Send Daily Digest'}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "No matching orders found."
                  : activeTab === 'in_process' 
                    ? 'No orders in process. Tap "+" to start one.' 
                    : 'No completed orders found.'}
              </Text>
            </View>
          ) : null
        }
      />
      
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NewOrder')}
        onPressIn={newOrderPress.onPressIn}
        onPressOut={newOrderPress.onPressOut}
      >
        <Animated.View style={newOrderPress.style}>
          <Text style={styles.fabText}>+</Text>
        </Animated.View>
      </Pressable>
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
    paddingBottom: spacing.md,
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
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segmentTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentTabText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  segmentTabTextActive: {
    color: colors.textOnDark,
  },
  listHeading: {
    ...typography.label,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
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
    fontFamily: fonts.family,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  listContent: {
    flexGrow: 1,
    // Clears the floating + button (64px tall, sitting spacing.lg above the
    // bottom edge) so it never overlaps the last card in the list.
    paddingBottom: 64 + spacing.lg * 2,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontFamily: fonts.family,
    fontSize: 32,
    color: colors.textOnDark,
    lineHeight: 36,
  },
});
