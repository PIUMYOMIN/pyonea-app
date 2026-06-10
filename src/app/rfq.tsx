import { Redirect, type Href } from 'expo-router';

import { useNativeAuth } from '@/context/native-auth';
import { rfqDashboardHref } from '@/utils/notification-routing';

export default function RfqRoute() {
  const { user, isLoading } = useNativeAuth();

  if (isLoading) return null;

  return <Redirect href={rfqDashboardHref(user?.type) as Href} />;
}
