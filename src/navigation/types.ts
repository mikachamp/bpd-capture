import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  DashboardTab: undefined;
  CalendarTab: { initialMode?: 'month' | 'week' } | undefined;
  InsightsTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NewOrder: undefined;
  JobDetail: { orderId: number };
  Capture: { orderId: number; ceNumber: string };
  BrowseByDate: undefined;
  SearchByCe: undefined;
  SearchByClient: undefined;
  Clients: undefined;
};
