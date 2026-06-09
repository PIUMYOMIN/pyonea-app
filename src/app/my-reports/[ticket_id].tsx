import { useLocalSearchParams } from 'expo-router';

import { MyReportDetailNative } from '@/pages/my-reports-native';

export default function MyReportDetailRoute() {
  const params = useLocalSearchParams<{ ticket_id?: string }>();
  const ticketId = typeof params.ticket_id === 'string' ? params.ticket_id : '';

  return <MyReportDetailNative ticketId={ticketId} />;
}
