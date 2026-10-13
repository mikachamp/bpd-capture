import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Stage } from '../types/models';

export type MainTabParamList = {
  DashboardTab: undefined;
  CalendarTab: { initialMode?: 'month' | 'week' } | undefined;
  InsightsTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NewOrder: undefined;
  Order: { orderId: number };
  PickJob: undefined;
  JobDetail: { orderId: number };
  /** stage: which stage new shots are filed under (defaults to Sample). */
  Capture: { orderId: number; ceNumber: string; stage?: Stage };
  BrowseByDate: undefined;
  SearchByCe: undefined;
  SearchByClient: undefined;
  Clients: undefined;
};
