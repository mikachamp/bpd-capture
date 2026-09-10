export type RootStackParamList = {
  Dashboard: undefined;
  NewOrder: undefined;
  JobDetail: { orderId: number };
  Capture: { orderId: number; ceNumber: string };
  BrowseByDate: undefined;
  SearchByCe: undefined;
  SearchByClient: undefined;
  Calendar: { initialMode?: 'month' | 'week' } | undefined;
  Insights: undefined;
  Settings: undefined;
};
