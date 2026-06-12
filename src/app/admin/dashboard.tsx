import { lazyRouteScreen } from '@/utils/lazy-route-screen';

export default lazyRouteScreen(
  () => import('@/pages/admin-dashboard-native'),
  'AdminDashboardNative',
);
