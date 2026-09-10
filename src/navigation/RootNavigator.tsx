import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { NewOrderScreen } from '../screens/NewOrderScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { BrowseByDateScreen } from '../screens/BrowseByDateScreen';
import { SearchByCeScreen } from '../screens/SearchByCeScreen';
import { SearchByClientScreen } from '../screens/SearchByClientScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: 'New Order' }} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Detail' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BrowseByDate" component={BrowseByDateScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SearchByCe" component={SearchByCeScreen} options={{ title: 'Search by CE' }} />
        <Stack.Screen name="SearchByClient" component={SearchByClientScreen} options={{ title: 'Search by Client' }} />
        <Stack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
