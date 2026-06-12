import { lazyRouteScreen } from '@/utils/lazy-route-screen';

export default lazyRouteScreen(
  () => import('@/pages/checkout-native'),
  'CheckoutNative',
);
