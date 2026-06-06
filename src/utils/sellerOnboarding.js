import api from './api';

const DELIVERY_ZONE_GATE_STEPS = new Set(['documents', 'review-submit']);

export const sellerHasDeliveryZones = async () => {
  try {
    const response = await api.get('/seller/delivery-areas');
    const zones = response.data?.data || [];
    return Array.isArray(zones) && zones.length > 0;
  } catch (error) {
    console.error('Failed to load delivery zones for onboarding gate:', error);
    return true;
  }
};

export const resolveSellerOnboardingStep = async (statusData) => {
  const currentStep = statusData?.current_step || 'store-basic';

  if (!statusData || !DELIVERY_ZONE_GATE_STEPS.has(currentStep)) {
    return currentStep;
  }

  const hasDeliveryZones = await sellerHasDeliveryZones();
  return hasDeliveryZones ? currentStep : 'delivery-zones';
};
