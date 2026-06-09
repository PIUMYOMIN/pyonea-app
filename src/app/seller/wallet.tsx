import { Redirect } from 'expo-router';

export default function SellerWalletRoute() {
  return <Redirect href="/seller/dashboard?tab=wallet" />;
}
