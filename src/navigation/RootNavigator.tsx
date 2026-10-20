import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList, MainTabParamList } from './types';
import { JobsScreen } from '../screens/JobsScreen';
import { OrderScreen } from '../screens/OrderScreen';
import { FloorJobsScreen } from '../screens/FloorJobsScreen';
import { FloorOrderScreen } from '../screens/FloorOrderScreen';
import { PickJobScreen } from '../screens/PickJobScreen';
import { NewOrderScreen } from '../screens/NewOrderScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { BrowseByDateScreen } from '../screens/BrowseByDateScreen';
import { SearchByCeScreen } from '../screens/SearchByCeScreen';
import { SearchByClientScreen } from '../screens/SearchByClientScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Icon, type IconName } from '../components/Icon';
import { colors, fonts, isFloor, radius, spacing } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const baseTheme = isFloor ? DefaultTheme : DarkTheme;
const navigationTheme: Theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

const TAB_ICONS: Record<keyof MainTabParamList, { icon: IconName; label: string }> = {
  DashboardTab: { icon: 'list', label: 'Jobs' },
  CalendarTab: { icon: 'calendar', label: 'Calendar' },
  InsightsTab: { icon: 'chart', label: 'Insights' },
  SettingsTab: { icon: 'settings', label: 'Settings' },
};

/** Floating pill bar: four icon tabs plus the one accent action, Capture. */
function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.tabs}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const meta = TAB_ICONS[route.name as keyof MainTabParamList];
            return (
              <Pressable
                key={route.key}
                style={[styles.tab, focused && styles.tabOn]}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
              >
                <Icon name={meta.icon} size={22} color={focused ? colors.selectedText : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.capture} onPress={() => navigation.getParent()?.navigate('PickJob')} accessibilityLabel="Capture photos for an order">
          <Icon name="camera" size={18} color={colors.accentInk} strokeWidth={1.9} />
          <Text style={styles.captureText}>Capture</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Floor Mode bar: flat, 72 dp tall, icon + label on every tab, and a wide
 * safety-yellow Capture in the middle where a thumb lands.
 */
function FloorTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tab = (index: number) => {
    const route = state.routes[index];
    const focused = state.index === index;
    const meta = TAB_ICONS[route.name as keyof MainTabParamList];
    return (
      <Pressable
        key={route.key}
        style={styles.floorTab}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
      >
        <Icon name={meta.icon} size={26} color={focused ? colors.textPrimary : colors.textMuted} strokeWidth={focused ? 2.2 : 1.8} />
        <Text style={[styles.floorTabText, focused && styles.floorTabTextOn]}>{meta.label}</Text>
        {focused && <View style={styles.floorTabMark} />}
      </Pressable>
    );
  };
  return (
    <View style={[styles.floorBar, { paddingBottom: insets.bottom }]}>
      {tab(0)}
      {tab(1)}
      <Pressable style={styles.floorCapture} onPress={() => navigation.getParent()?.navigate('PickJob')} accessibilityLabel="Capture photos for a job">
        <Icon name="camera" size={28} color={colors.accentInk} strokeWidth={2.2} />
        <Text style={styles.floorCaptureText}>Capture</Text>
      </Pressable>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => (isFloor ? <FloorTabBar {...props} /> : <PillTabBar {...props} />)} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="DashboardTab" component={isFloor ? FloorJobsScreen : JobsScreen} options={{ title: 'Jobs' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="InsightsTab" component={InsightsScreen} options={{ title: 'Insights' }} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.family, fontWeight: '500', color: colors.textPrimary },
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.family, fontWeight: '500', color: colors.textPrimary },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Order" component={isFloor ? FloorOrderScreen : OrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PickJob" component={PickJobScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: 'New order' }} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Edit details' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BrowseByDate" component={BrowseByDateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SearchByCe" component={SearchByCeScreen} options={{ title: 'Search by CE' }} />
        <Stack.Screen name="SearchByClient" component={SearchByClientScreen} options={{ title: 'Search by client' }} />
        <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: 'Clients' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl },
  bar: {
    height: 64, borderRadius: radius.pill, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingLeft: spacing.md, paddingRight: spacing.sm, elevation: 8,
  },
  tabs: { flexDirection: 'row', gap: 2 },
  tab: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.selected },
  capture: { height: 48, paddingLeft: 14, paddingRight: 18, borderRadius: radius.pill, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  captureText: { fontFamily: fonts.family, fontSize: 15, fontWeight: '500', color: colors.accentInk },
  floorBar: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  floorTab: { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center', gap: 2 },
  floorTabText: { fontFamily: fonts.condensed, textTransform: 'uppercase', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: colors.textMuted },
  floorTabTextOn: { color: colors.textPrimary, fontWeight: '700' },
  floorTabMark: { position: 'absolute', top: 0, left: 14, right: 14, height: 4, backgroundColor: colors.textPrimary },
  floorCapture: { flex: 1.3, height: 72, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', gap: 2 },
  floorCaptureText: { fontFamily: fonts.condensed, textTransform: 'uppercase', fontSize: 15, fontWeight: '700', letterSpacing: 0.5, color: colors.accentInk },
});
