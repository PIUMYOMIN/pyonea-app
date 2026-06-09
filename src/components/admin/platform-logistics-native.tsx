import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  assignAdminDeliveryCourier,
  fetchAdminCourierCandidates,
  fetchAdminPlatformDeliveries,
  formatMMK,
  updateAdminDeliveryStatus,
  type AdminCourierCandidate,
  type AdminPlatformDelivery,
  type AdminSellersPagination,
} from '@/utils/native-api';

const STATUS_TONE: Record<string, { wrap: string; text: string }> = {
  pending: { wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  awaiting_pickup: { wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  picked_up: { wrap: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300' },
  in_transit: { wrap: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
  out_for_delivery: { wrap: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  delivered: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  failed: { wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  cancelled: { wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-700 dark:text-slate-300' },
};

const DISABLED_ASSIGN_STATUSES = new Set(['pending', 'delivered', 'cancelled', 'returned', 'failed']);

function formatStatus(status: string) {
  return (status || '').replace(/_/g, ' ');
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || {
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
  };

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>{formatStatus(status)}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  tone: 'blue' | 'yellow' | 'purple' | 'green';
}) {
  const tones = {
    blue: { wrap: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
    yellow: { wrap: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400' },
    purple: { wrap: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
    green: { wrap: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
  };
  const palette = tones[tone];

  return (
    <View className={`rounded-xl p-4 ${palette.wrap}`}>
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400">{label}</Text>
          <Text className={`mt-1 font-sans text-xl font-bold ${palette.text}`} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <Feather name={icon} size={20} color={tone === 'green' ? '#15803d' : tone === 'blue' ? '#1d4ed8' : tone === 'yellow' ? '#ca8a04' : '#7c3aed'} />
      </View>
    </View>
  );
}

function DeliveryDetailModal({
  visible,
  delivery,
  onClose,
}: {
  visible: boolean;
  delivery: AdminPlatformDelivery | null;
  onClose: () => void;
}) {
  const { t } = useAppTranslation();
  if (!visible || !delivery) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="max-h-[85%] w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <Text className="min-w-0 flex-1 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {t('admin.platformLogistics.detailTitle', {
                defaultValue: 'Delivery — Order #{{number}}',
                number: delivery.order.orderNumber,
              })}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-lg">
              <Feather name="x-circle" size={20} color="#94a3b8" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" contentContainerClassName="gap-5">
            <View className="gap-4 md:flex-row">
              <View className="flex-1 gap-3">
                <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('admin.platformLogistics.sections.deliveryInfo', 'Delivery Info')}
                </Text>
                <View className="gap-2">
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.status', 'Status')}
                    </Text>
                    <DeliveryStatusBadge status={delivery.status} />
                  </View>
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.tracking', 'Tracking #')}
                    </Text>
                    <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                      {delivery.trackingNumber || t('admin.platformLogistics.notAssigned', 'Not assigned')}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.fee', 'Delivery Fee')}
                    </Text>
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {delivery.platformDeliveryFee}
                    </Text>
                  </View>
                  {(delivery.courierName || delivery.assignedDriverName) && (
                    <View>
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                        {t('admin.platformLogistics.fields.driver', 'Driver')}
                      </Text>
                      <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                        {delivery.courierName || delivery.assignedDriverName}
                        {delivery.driverPhone ? ` · ${delivery.driverPhone}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-1 gap-3">
                <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('admin.platformLogistics.sections.orderInfo', 'Order Info')}
                </Text>
                <View className="gap-2">
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.seller', 'Seller')}
                    </Text>
                    <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                      {delivery.supplierName || '—'}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.buyer', 'Buyer')}
                    </Text>
                    <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                      {delivery.buyerName || delivery.order.customerName || '—'}
                      {delivery.buyerPhone || delivery.order.customerPhone
                        ? ` · ${delivery.buyerPhone || delivery.order.customerPhone}`
                        : ''}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                      {t('admin.platformLogistics.fields.address', 'Address')}
                    </Text>
                    <Text className="font-sans text-sm leading-5 text-gray-900 dark:text-slate-100">
                      {delivery.deliveryAddress || '—'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {delivery.updates.length > 0 ? (
              <View>
                <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('admin.platformLogistics.sections.trackingHistory', 'Tracking History')}
                </Text>
                <View className="gap-2">
                  {delivery.updates.map((update) => (
                    <View
                      key={String(update.id)}
                      className="flex-row gap-3 rounded-xl bg-gray-50 p-3 dark:bg-slate-700">
                      <Feather name="file-text" size={16} color="#94a3b8" />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-start justify-between gap-2">
                          <Text className="font-sans text-sm font-medium capitalize text-gray-900 dark:text-slate-100">
                            {formatStatus(update.status)}
                          </Text>
                          <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">
                            {update.createdAt ? new Date(update.createdAt).toLocaleString() : ''}
                          </Text>
                        </View>
                        {update.notes ? (
                          <Text className="mt-0.5 font-sans text-xs text-gray-600 dark:text-slate-400">
                            {update.notes}
                          </Text>
                        ) : null}
                        {update.location ? (
                          <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
                            📍 {update.location}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View className="border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <Pressable
              onPress={onClose}
              className="self-end rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.platformLogistics.close', 'Close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AssignCourierModal({
  visible,
  delivery,
  candidates,
  submitting,
  onClose,
  onAssign,
}: {
  visible: boolean;
  delivery: AdminPlatformDelivery | null;
  candidates: AdminCourierCandidate[];
  submitting: boolean;
  onClose: () => void;
  onAssign: (form: {
    platform_courier_id?: number;
    driver_name: string;
    driver_phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
  }) => void;
}) {
  const { t } = useAppTranslation();
  const [mode, setMode] = useState<'manual' | 'user'>('manual');
  const [platformCourierId, setPlatformCourierId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');

  useEffect(() => {
    if (!delivery) return;
    setMode('manual');
    setPlatformCourierId('');
    setDriverName(delivery.assignedDriverName || delivery.courierName || '');
    setDriverPhone(delivery.driverPhone || '');
    setVehicleType(delivery.assignedVehicleType || 'Motorcycle');
    setVehicleNumber(delivery.assignedVehicleNumber || '');
  }, [delivery]);

  if (!visible || !delivery) return null;

  const selectCandidate = (userId: string) => {
    setPlatformCourierId(userId);
    const user = candidates.find((candidate) => candidate.id === userId);
    if (user) {
      setDriverName(user.name || '');
      setDriverPhone(user.phone || '');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
              {t('admin.platformLogistics.assignTitle', 'Assign Courier')}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-lg">
              <Feather name="x" size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <ScrollView className="max-h-[70vh] px-5 py-4" contentContainerClassName="gap-4">
            <View className="flex-row gap-2">
              {(['manual', 'user'] as const).map((item) => {
                const active = mode === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setMode(item)}
                    className={`flex-1 rounded-lg border py-2 ${
                      active
                        ? 'border-green-600 bg-green-600'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                    <Text
                      className={`text-center font-sans text-xs font-medium ${
                        active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                      }`}>
                      {item === 'manual'
                        ? t('admin.platformLogistics.assignManual', 'Enter manually')
                        : t('admin.platformLogistics.assignFromUsers', 'Pick from users')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'user' && candidates.length > 0 ? (
              <View className="gap-2">
                <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {t('admin.platformLogistics.selectUser', 'Select User')}
                </Text>
                {candidates.map((candidate) => {
                  const active = platformCourierId === candidate.id;
                  return (
                    <Pressable
                      key={candidate.id}
                      onPress={() => selectCandidate(candidate.id)}
                      className={`rounded-xl border px-3 py-2.5 ${
                        active
                          ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}>
                      <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                        {candidate.name} · {candidate.phone || candidate.email || candidate.role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {[
              {
                key: 'name',
                label: t('admin.platformLogistics.driverName', 'Driver Name *'),
                value: driverName,
                onChange: setDriverName,
                placeholder: 'e.g. Ko Aung',
              },
              {
                key: 'phone',
                label: t('admin.platformLogistics.driverPhone', 'Driver Phone'),
                value: driverPhone,
                onChange: setDriverPhone,
                placeholder: '+959...',
              },
              {
                key: 'vehicle',
                label: t('admin.platformLogistics.vehicleType', 'Vehicle Type'),
                value: vehicleType,
                onChange: setVehicleType,
                placeholder: 'Motorcycle / Van / Truck',
              },
              {
                key: 'number',
                label: t('admin.platformLogistics.vehicleNumber', 'Vehicle Number'),
                value: vehicleNumber,
                onChange: setVehicleNumber,
                placeholder: 'e.g. 1A/1234',
              },
            ].map((field) => (
              <View key={field.key}>
                <Text className="mb-1 font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor="#94a3b8"
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </View>
            ))}
          </ScrollView>

          <View className="flex-row justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <Pressable
              onPress={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                {t('admin.platformLogistics.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={submitting || !driverName.trim()}
              onPress={() =>
                onAssign({
                  platform_courier_id: platformCourierId ? Number(platformCourierId) : undefined,
                  driver_name: driverName.trim(),
                  driver_phone: driverPhone.trim() || undefined,
                  vehicle_type: vehicleType.trim() || undefined,
                  vehicle_number: vehicleNumber.trim() || undefined,
                })
              }
              className="rounded-xl bg-green-600 px-4 py-2 disabled:opacity-50">
              <Text className="font-sans text-sm font-semibold text-white">
                {submitting
                  ? t('admin.platformLogistics.assigning', 'Assigning…')
                  : t('admin.platformLogistics.assign', 'Assign')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PlatformLogisticsNative() {
  const { t } = useAppTranslation();
  const [deliveries, setDeliveries] = useState<AdminPlatformDelivery[]>([]);
  const [candidates, setCandidates] = useState<AdminCourierCandidate[]>([]);
  const [pagination, setPagination] = useState<AdminSellersPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewDelivery, setViewDelivery] = useState<AdminPlatformDelivery | null>(null);
  const [assignDelivery, setAssignDelivery] = useState<AdminPlatformDelivery | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDeliveries = useCallback(async (targetPage: number, showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const result = await fetchAdminPlatformDeliveries(targetPage);
      setDeliveries(result.deliveries);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.platformLogistics.errors.load', 'Failed to load deliveries.'),
      );
      setDeliveries([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDeliveries(page, page === 1);
  }, [loadDeliveries, page]);

  useEffect(() => {
    void fetchAdminCourierCandidates()
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, []);

  const stats = useMemo(
    () => ({
      total: deliveries.length,
      pending: deliveries.filter((item) => !item.platformCourierId && item.status !== 'delivered').length,
      active: deliveries.filter((item) =>
        ['picked_up', 'in_transit', 'out_for_delivery'].includes(item.status),
      ).length,
      revenue: deliveries.reduce((sum, item) => sum + item.platformDeliveryFeeValue, 0),
    }),
    [deliveries],
  );

  const handleAssign = async (form: {
    platform_courier_id?: number;
    driver_name: string;
    driver_phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
  }) => {
    if (!assignDelivery) return;
    setAssigning(true);
    try {
      await assignAdminDeliveryCourier(assignDelivery.id, form);
      setAssignDelivery(null);
      setMessage(t('admin.platformLogistics.messages.assigned', 'Courier assigned.'));
      await loadDeliveries(page, false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.platformLogistics.errors.assign', 'Failed to assign courier.'),
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (deliveryId: string | number, status: string, notes: string) => {
    setBusyId(String(deliveryId));
    try {
      await updateAdminDeliveryStatus(deliveryId, status, notes);
      setMessage(
        t('admin.platformLogistics.messages.statusUpdated', 'Status updated to "{{status}}".', {
          status: formatStatus(status),
        }),
      );
      await loadDeliveries(page, false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.platformLogistics.errors.status', 'Failed to update status.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.platformLogistics.loading', 'Loading deliveries...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <DeliveryDetailModal
        visible={Boolean(viewDelivery)}
        delivery={viewDelivery}
        onClose={() => setViewDelivery(null)}
      />
      <AssignCourierModal
        visible={Boolean(assignDelivery)}
        delivery={assignDelivery}
        candidates={candidates}
        submitting={assigning}
        onClose={() => setAssignDelivery(null)}
        onAssign={(form) => void handleAssign(form)}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.platformLogistics.title', 'Platform Logistics')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t(
              'admin.platformLogistics.subtitle',
              'Manage platform delivery assignments and tracking',
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => void loadDeliveries(page, false)}
          className="h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={16} />
        </Pressable>
      </View>

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void loadDeliveries(page)}>
            <Text className="font-sans text-xs font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <View className="w-[47%] lg:w-[23%]">
          <StatCard label={t('admin.platformLogistics.stats.total', 'Total')} value={stats.total} icon="truck" tone="blue" />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <StatCard
            label={t('admin.platformLogistics.stats.unassigned', 'Unassigned')}
            value={stats.pending}
            icon="clock"
            tone="yellow"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <StatCard
            label={t('admin.platformLogistics.stats.inProgress', 'In Progress')}
            value={stats.active}
            icon="truck"
            tone="purple"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <StatCard
            label={t('admin.platformLogistics.stats.revenue', 'Revenue')}
            value={formatMMK(stats.revenue)}
            icon="dollar-sign"
            tone="green"
          />
        </View>
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {deliveries.length === 0 ? (
          <View className="items-center px-6 py-14">
            <Feather name="truck" color="#94a3b8" size={40} />
            <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
              {t('admin.platformLogistics.empty', 'No platform deliveries found.')}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[980px]">
              <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { key: 'order', label: t('admin.platformLogistics.columns.order', 'Order #'), width: 'w-[100px]' },
                  { key: 'seller', label: t('admin.platformLogistics.columns.seller', 'Seller'), width: 'w-[140px]' },
                  { key: 'status', label: t('admin.platformLogistics.columns.status', 'Status'), width: 'w-[130px]' },
                  {
                    key: 'courier',
                    label: t('admin.platformLogistics.columns.courier', 'Courier / Driver'),
                    width: 'w-[170px]',
                  },
                  { key: 'fee', label: t('admin.platformLogistics.columns.fee', 'Fee'), width: 'w-[110px]' },
                  { key: 'actions', label: t('admin.platformLogistics.columns.actions', 'Actions'), width: 'w-[220px]' },
                ].map((column) => (
                  <View key={column.key} className={`${column.width} px-2`}>
                    <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {deliveries.map((delivery) => {
                const hasCourier = Boolean(delivery.courierName || delivery.assignedDriverName);
                const canAssign = !DISABLED_ASSIGN_STATUSES.has(delivery.status);
                const isBusy = busyId === String(delivery.id);

                return (
                  <View
                    key={String(delivery.id)}
                    className="flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                    <View className="w-[100px] justify-center px-2">
                      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                        #{delivery.order.orderNumber}
                      </Text>
                    </View>
                    <View className="w-[140px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300" numberOfLines={2}>
                        {delivery.supplierName || '—'}
                      </Text>
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <DeliveryStatusBadge status={delivery.status} />
                    </View>
                    <View className="w-[170px] justify-center px-2">
                      {hasCourier ? (
                        <View className="flex-row items-center gap-1.5">
                          <Feather name="user" size={14} color="#94a3b8" />
                          <View className="min-w-0 flex-1">
                            <Text className="font-sans text-xs font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
                              {delivery.courierName || delivery.assignedDriverName}
                            </Text>
                            {delivery.driverPhone ? (
                              <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">
                                {delivery.driverPhone}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          disabled={!canAssign}
                          onPress={() => setAssignDelivery(delivery)}
                          className={`flex-row items-center gap-1 self-start rounded-lg border px-2.5 py-1 ${
                            canAssign
                              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700'
                          }`}>
                          <Feather name="users" size={12} color={canAssign ? '#15803d' : '#94a3b8'} />
                          <Text
                            className={`font-sans text-[11px] font-semibold ${
                              canAssign ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'
                            }`}>
                            {t('admin.platformLogistics.assignCourier', 'Assign Courier')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <Text className="font-sans text-xs font-medium text-gray-700 dark:text-slate-300">
                        {delivery.platformDeliveryFee}
                      </Text>
                    </View>
                    <View className="w-[220px] flex-row flex-wrap items-center gap-1.5 px-2">
                      <Pressable
                        onPress={() => setViewDelivery(delivery)}
                        className="h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                        <Feather name="eye" size={15} color="#15803d" />
                      </Pressable>

                      {delivery.status === 'awaiting_pickup' ? (
                        <Pressable
                          disabled={isBusy}
                          onPress={() =>
                            void handleStatusUpdate(delivery.id, 'picked_up', 'Package picked up by courier')
                          }
                          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 disabled:opacity-50">
                          <Text className="font-sans text-[11px] font-semibold text-white">
                            {t('admin.platformLogistics.actions.pickedUp', 'Picked Up')}
                          </Text>
                        </Pressable>
                      ) : null}
                      {delivery.status === 'picked_up' ? (
                        <Pressable
                          disabled={isBusy}
                          onPress={() =>
                            void handleStatusUpdate(delivery.id, 'in_transit', 'Package in transit')
                          }
                          className="rounded-lg bg-purple-600 px-2.5 py-1.5 disabled:opacity-50">
                          <Text className="font-sans text-[11px] font-semibold text-white">
                            {t('admin.platformLogistics.actions.inTransit', 'In Transit')}
                          </Text>
                        </Pressable>
                      ) : null}
                      {delivery.status === 'in_transit' ? (
                        <Pressable
                          disabled={isBusy}
                          onPress={() =>
                            void handleStatusUpdate(delivery.id, 'out_for_delivery', 'Out for delivery')
                          }
                          className="rounded-lg bg-orange-500 px-2.5 py-1.5 disabled:opacity-50">
                          <Text className="font-sans text-[11px] font-semibold text-white">
                            {t('admin.platformLogistics.actions.outForDelivery', 'Out for Delivery')}
                          </Text>
                        </Pressable>
                      ) : null}
                      {delivery.status === 'out_for_delivery' ? (
                        <Pressable
                          disabled={isBusy}
                          onPress={() =>
                            void handleStatusUpdate(delivery.id, 'delivered', 'Delivered successfully')
                          }
                          className="rounded-lg bg-green-600 px-2.5 py-1.5 disabled:opacity-50">
                          <Text className="font-sans text-[11px] font-semibold text-white">
                            {t('admin.platformLogistics.actions.delivered', 'Delivered ✓')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {pagination && pagination.lastPage > 1 ? (
          <View className="flex-row items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t('admin.platformLogistics.page', 'Page {{current}} of {{last}}', {
                current: pagination.currentPage,
                last: pagination.lastPage,
              })}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                disabled={pagination.currentPage <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.platformLogistics.previous', 'Previous')}
                </Text>
              </Pressable>
              <Pressable
                disabled={pagination.currentPage >= pagination.lastPage}
                onPress={() => setPage((current) => current + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.platformLogistics.next', 'Next')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {refreshing ? (
        <View className="absolute bottom-2 right-2 rounded-full bg-white p-2 shadow dark:bg-slate-800">
          <ActivityIndicator color="#16a34a" size="small" />
        </View>
      ) : null}
    </View>
  );
}
