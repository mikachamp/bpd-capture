import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { RootStackParamList, MainTabParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
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
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{ title: 'Home', tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text>, headerShown: false }} 
      />
      <Tab.Screen 
        name="CalendarTab" 
        component={CalendarScreen} 
        options={{ title: 'Calendar', tabBarIcon: () => <Text style={{fontSize: 20}}>📅</Text>, headerShown: false }} 
      />
      <Tab.Screen 
        name="InsightsTab" 
        component={InsightsScreen} 
        options={{ title: 'Insights', tabBarIcon: () => <Text style={{fontSize: 20}}>📊</Text>, headerShown: false }} 
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{ title: 'Settings', tabBarIcon: () => <Text style={{fontSize: 20}}>⚙️</Text> }} 
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
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: 'New Order' }} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Detail' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BrowseByDate" component={BrowseByDateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SearchByCe" component={SearchByCeScreen} options={{ title: 'Search by CE' }} />
        <Stack.Screen name="SearchByClient" component={SearchByClientScreen} options={{ title: 'Search by Client' }} />
        <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: 'Clients' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
