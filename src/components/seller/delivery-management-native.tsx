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
  fetchSellerDeliveries,
  formatMMK,
  setSellerOrderDeliveryMethod,
  submitSellerDeliveryFee,
  updateSellerDeliveryStatus,
  uploadSellerDeliveryProof,
  type SellerDelivery,
  type NativeUploadFile,

  formatApiErrorMessage,
} from '@/utils/native-api';
import { pickImageFromCamera, pickImagesFromLibrary } from '@/utils/native-image-picker';

type Message = { type: 'success' | 'error'; text: string } | null;
type DeliveryMethod = 'supplier' | 'platform';

const transitStatuses = ['awaiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery'];

const statusTone: Record<string, { bg: string; text: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: 'clock', color: '#ca8a04' },
  awaiting_pickup: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: 'clock', color: '#2563eb' },
  picked_up: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300', icon: 'truck', color: '#4f46e5' },
  in_transit: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', icon: 'truck', color: '#9333ea' },
  out_for_delivery: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', icon: 'map-pin', color: '#ea580c' },
  delivered: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', icon: 'check-circle', color: '#16a34a' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', icon: 'x-circle', color: '#dc2626' },
  cancelled: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-800 dark:text-slate-300', icon: 'x-circle', color: '#64748b' },
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const calculatePlatformFee = (weight = 5, distance = 0) => 5000 + weight * 100 + distance * 200;

const isPlatformDelivery = (delivery: SellerDelivery) => delivery.deliveryMethod === 'platform';

const canSubmitPlatformFee = (delivery: SellerDelivery) =>
  isPlatformDelivery(delivery) &&
  delivery.platformDeliveryFeeValue > 0 &&
  !delivery.feeConfirmedAt &&
  !delivery.feeSubmittedAt;

const isPlatformFeeAwaitingAdmin = (delivery: SellerDelivery) =>
  isPlatformDelivery(delivery) &&
  Boolean(delivery.feeSubmittedAt) &&
  !delivery.feeConfirmedAt;

function PlatformFeeStatus({ delivery }: { delivery: SellerDelivery }) {
  const { t } = useAppTranslation();

  if (!isPlatformDelivery(delivery) || delivery.platformDeliveryFeeValue <= 0) {
    return null;
  }

  if (delivery.feeConfirmedAt) {
    return (
      <View className="mt-1 self-start rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
        <Text className="font-sans text-[10px] font-semibold text-green-800 dark:text-green-300">
          {t('seller.delivery.fee.status_confirmed', { defaultValue: 'Fee confirmed' })}
        </Text>
      </View>
    );
  }

  if (delivery.feeSubmittedAt) {
    return (
      <View className="mt-1 self-start rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30">
        <Text className="font-sans text-[10px] font-semibold text-amber-800 dark:text-amber-300">
          {t('seller.delivery.fee.status_submitted', { defaultValue: 'Awaiting admin confirmation' })}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-1 self-start rounded-full bg-red-100 px-2 py-0.5 dark:bg-red-900/30">
      <Text className="font-sans text-[10px] font-semibold text-red-800 dark:text-red-300">
        {t('seller.delivery.fee.status_pending', { defaultValue: 'Fee payment due' })}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = statusTone[status] || statusTone.pending;
  return (
    <View className={`self-start flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${tone.bg}`}>
      <Feather name={tone.icon} color={tone.color} size={14} />
      <Text className={`font-sans text-xs font-medium capitalize ${tone.text}`}>
        {t(`seller.delivery.statuses.${status}`, { defaultValue: status.replaceAll('_', ' ') })}
      </Text>
    </View>
  );
}

function MessageBanner({ message, onClose }: { message: Message; onClose: () => void }) {
  if (!message) return null;
  const success = message.type === 'success';
  return (
    <Pressable
      onPress={onClose}
      className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
        success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}
    >
      <Feather name={success ? 'check-circle' : 'alert-triangle'} color={success ? '#16a34a' : '#dc2626'} size={18} />
      <Text className={`min-w-0 flex-1 font-sans text-sm ${success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {message.text}
      </Text>
      <Feather name="x" color={success ? '#16a34a' : '#dc2626'} size={16} />
    </Pressable>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${tone}`}>
      <Feather name={icon} color="#64748b" size={18} />
      <Text className="mt-2 font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</Text>
      <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function DeliveryCard({
  delivery,
  actionLoading,
  onOpen,
  onMethod,
  onStatus,
  onProof,
  onSubmitFee,
}: {
  delivery: SellerDelivery;
  actionLoading: string | null;
  onOpen: () => void;
  onMethod: () => void;
  onStatus: (status: string, notes: string) => void;
  onProof: () => void;
  onSubmitFee: () => void;
}) {
  const { t } = useAppTranslation();
  const isSelf = delivery.deliveryMethod === 'supplier';
  const loading = actionLoading === String(delivery.id);

  const methodLabel =
    delivery.deliveryMethod === 'platform'
      ? t('seller.delivery.methods.platform', { defaultValue: 'Platform Logistics' })
      : delivery.deliveryMethod === 'supplier'
        ? t('seller.delivery.methods.self', { defaultValue: 'Self Delivery' })
        : t('seller.delivery.actions.choose_method', { defaultValue: 'Choose Method' });

  return (
    <View className="min-h-[84px] w-full flex-row items-center border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <Pressable onPress={onOpen} className="w-36 pr-4">
        <Text className="font-sans text-sm font-bold text-gray-900 dark:text-white" numberOfLines={1}>
          #{delivery.order.orderNumber}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
          {formatDate(delivery.createdAt)}
        </Text>
      </Pressable>

      <Pressable onPress={onOpen} className="w-52 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {delivery.order.customerName}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {delivery.order.customerPhone || delivery.recipientPhone || '-'}
        </Text>
      </Pressable>

      <View className="w-44 pr-4">
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {methodLabel}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {delivery.packageWeight || delivery.order.packageWeight || 0} kg
        </Text>
      </View>

      <View className="w-36 pr-4">
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {delivery.platformDeliveryFee || formatMMK(0)}
        </Text>
        <PlatformFeeStatus delivery={delivery} />
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {delivery.trackingNumber || 'No tracking'}
        </Text>
      </View>

      <View className="w-56 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={2}>
          {delivery.deliveryAddress || delivery.order.deliveryAddress || '-'}
        </Text>
      </View>

      <View className="w-40 pr-4">
        <StatusBadge status={delivery.status} />
      </View>

      <View className="w-64 flex-row flex-wrap items-center gap-2">
        <Pressable onPress={onOpen} className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
          <Feather name="eye" color="#16a34a" size={17} />
        </Pressable>
        {delivery.status === 'pending' ? (
          <Pressable onPress={onMethod} className="rounded-lg bg-blue-600 px-3 py-2">
            <Text className="font-sans text-xs font-bold text-white">{t('seller.delivery.actions.choose_method', { defaultValue: 'Choose Method' })}</Text>
          </Pressable>
        ) : null}
        {canSubmitPlatformFee(delivery) ? (
          <Pressable onPress={onSubmitFee} className="rounded-lg bg-amber-600 px-3 py-2">
            <Text className="font-sans text-xs font-bold text-white">
              {t('seller.delivery.actions.submit_fee', { defaultValue: 'Submit Fee' })}
            </Text>
          </Pressable>
        ) : null}
        {delivery.status === 'awaiting_pickup' && isSelf ? (
          <Pressable disabled={loading} onPress={() => onStatus('picked_up', 'Items picked up from warehouse')} className="rounded-lg bg-indigo-600 px-3 py-2 disabled:opacity-50">
            <Text className="font-sans text-xs font-bold text-white">{loading ? '...' : t('seller.delivery.actions.mark_picked_up', { defaultValue: 'Mark Picked Up' })}</Text>
          </Pressable>
        ) : null}
        {delivery.status === 'picked_up' && isSelf ? (
          <Pressable disabled={loading} onPress={() => onStatus('in_transit', 'On the way to customer')} className="rounded-lg bg-purple-600 px-3 py-2 disabled:opacity-50">
            <Text className="font-sans text-xs font-bold text-white">{loading ? '...' : t('seller.delivery.actions.in_transit', { defaultValue: 'In Transit' })}</Text>
          </Pressable>
        ) : null}
        {delivery.status === 'in_transit' && isSelf ? (
          <Pressable disabled={loading} onPress={() => onStatus('out_for_delivery', 'Out for delivery to customer')} className="rounded-lg bg-orange-500 px-3 py-2 disabled:opacity-50">
            <Text className="font-sans text-xs font-bold text-white">{loading ? '...' : t('seller.delivery.actions.out_for_delivery', { defaultValue: 'Out for Delivery' })}</Text>
          </Pressable>
        ) : null}
        {delivery.status === 'out_for_delivery' && isSelf ? (
          <Pressable disabled={loading} onPress={onProof} className="rounded-lg bg-green-600 px-3 py-2 disabled:opacity-50">
            <Text className="font-sans text-xs font-bold text-white">{t('seller.delivery.proof.title', { defaultValue: 'Upload Delivery Proof' })}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DeliveryMethodModal({
  delivery,
  loading,
  onClose,
  onSubmit,
}: {
  delivery: SellerDelivery | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (method: DeliveryMethod, pickupAddress: string) => void;
}) {
  const { t } = useAppTranslation();
  const [method, setMethod] = useState<DeliveryMethod>('supplier');
  const [pickupAddress, setPickupAddress] = useState(delivery?.pickupAddress || '');
  const weight = delivery?.packageWeight || 5;
  const platformFee = calculatePlatformFee(weight);

  if (!delivery) return null;

  return (
    <Modal visible={Boolean(delivery)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-4 py-8">
        <View className="mx-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-white">{t('seller.order.delivery.choose_method', { defaultValue: 'Choose Delivery Method' })}</Text>
              <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">#{delivery.order.orderNumber}</Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <View className="mt-5 gap-3 md:flex-row">
            {[
              { key: 'supplier' as const, icon: 'truck' as const, title: t('seller.order.delivery.self', { defaultValue: 'Self Delivery' }), fee: t('seller.order.delivery.free', { defaultValue: 'Free' }) },
              { key: 'platform' as const, icon: 'package' as const, title: t('seller.order.delivery.platform', { defaultValue: 'Platform Logistics' }), fee: formatMMK(platformFee) },
            ].map((item) => {
              const active = method === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMethod(item.key)}
                  className={`min-w-0 flex-1 rounded-2xl border p-4 ${
                    active ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <Feather name={item.icon} color={active ? '#16a34a' : '#64748b'} size={22} />
                  <Text className="mt-3 font-sans text-sm font-bold text-gray-900 dark:text-white">{item.title}</Text>
                  <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{item.fee}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-4">
            <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
              {method === 'platform' ? t('seller.order.delivery.pickup_address', { defaultValue: 'Pickup Address' }) : t('seller.order.delivery.store_address', { defaultValue: 'Your Warehouse / Store Address' })}
            </Text>
            <TextInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="No. 12, Merchant St, Yangon"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mt-5 flex-row justify-end gap-3">
            <Pressable onPress={onClose} className="rounded-xl border border-gray-300 px-5 py-2.5 dark:border-slate-600">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{t('seller.delivery.actions.cancel', { defaultValue: 'Cancel' })}</Text>
            </Pressable>
            <Pressable disabled={loading} onPress={() => onSubmit(method, pickupAddress)} className="rounded-xl bg-green-600 px-5 py-2.5 disabled:opacity-60">
              <Text className="font-sans text-sm font-bold text-white">{loading ? 'Saving...' : t('seller.order.delivery.confirm_method', { defaultValue: 'Confirm Method' })}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailModal({ delivery, onClose, onStatus, onProof, onSubmitFee, actionLoading }: {
  delivery: SellerDelivery | null;
  onClose: () => void;
  onStatus: (status: string, notes: string) => void;
  onProof: () => void;
  onSubmitFee: () => void;
  actionLoading: string | null;
}) {
  const { t } = useAppTranslation();
  if (!delivery) return null;
  const isSelf = delivery.deliveryMethod === 'supplier';
  const loading = actionLoading === String(delivery.id);

  return (
    <Modal visible={Boolean(delivery)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-4 py-8">
        <View className="mx-auto max-h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-xl font-semibold text-gray-900 dark:text-white">
              {t('seller.delivery.details.title', { defaultValue: `Delivery #${delivery.order.orderNumber}`, number: delivery.order.orderNumber })}
            </Text>
            <Pressable onPress={onClose}>
              <Feather name="x-circle" color="#94a3b8" size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="p-5">
            <View className="gap-6 md:flex-row">
              <View className="min-w-0 flex-1">
                <Text className="mb-4 font-sans text-lg font-medium text-gray-900 dark:text-white">{t('seller.delivery.details.delivery_information', { defaultValue: 'Delivery Information' })}</Text>
                <View className="gap-3">
                  <StatusBadge status={delivery.status} />
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Method: {delivery.deliveryMethod === 'platform' ? 'Platform Logistics' : 'Self Delivery'}</Text>
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Fee: {delivery.platformDeliveryFee}</Text>
                  <PlatformFeeStatus delivery={delivery} />
                  {delivery.feeSubmissionNote ? (
                    <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                      {t('seller.delivery.fee.note_label', { defaultValue: 'Payment note' })}: {delivery.feeSubmissionNote}
                    </Text>
                  ) : null}
                  {delivery.feeSubmittedAt ? (
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {t('seller.delivery.fee.submitted_at', { defaultValue: 'Submitted' })}: {formatDate(delivery.feeSubmittedAt)}
                    </Text>
                  ) : null}
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Tracking: {delivery.trackingNumber || 'Not assigned'}</Text>
                  {delivery.courierName ? <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Courier: {delivery.courierName}</Text> : null}
                </View>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="mb-4 font-sans text-lg font-medium text-gray-900 dark:text-white">{t('seller.delivery.details.address_information', { defaultValue: 'Address Information' })}</Text>
                <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Pickup Address</Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">{delivery.pickupAddress || 'Not specified'}</Text>
                <Text className="mt-4 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Delivery Address</Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">{delivery.deliveryAddress || delivery.order.deliveryAddress}</Text>
              </View>
            </View>

            {delivery.updates.length ? (
              <View className="mt-6">
                <Text className="mb-4 font-sans text-lg font-medium text-gray-900 dark:text-white">{t('seller.delivery.details.delivery_updates', { defaultValue: 'Delivery Updates' })}</Text>
                <View className="gap-3">
                  {delivery.updates.map((update) => (
                    <View key={update.id} className="flex-row items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50">
                      <Feather name="file-text" color="#94a3b8" size={18} />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row justify-between gap-3">
                          <Text className="font-sans text-sm font-medium capitalize text-gray-900 dark:text-white">{update.status.replaceAll('_', ' ')}</Text>
                          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{formatDate(update.createdAt)}</Text>
                        </View>
                        {update.notes ? <Text className="mt-1 font-sans text-sm text-gray-600 dark:text-slate-400">{update.notes}</Text> : null}
                        {update.location ? <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">Location: {update.location}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {canSubmitPlatformFee(delivery) ? (
              <Pressable onPress={onSubmitFee} className="mt-6 rounded-lg bg-amber-600 py-3">
                <Text className="text-center font-sans text-sm font-medium text-white">
                  {t('seller.delivery.actions.submit_fee', { defaultValue: 'Submit platform delivery fee' })}
                </Text>
              </Pressable>
            ) : null}
            {isPlatformFeeAwaitingAdmin(delivery) ? (
              <View className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <Text className="font-sans text-sm leading-6 text-amber-800 dark:text-amber-200">
                  {t('seller.delivery.fee.awaiting_admin', {
                    defaultValue: 'Your fee payment was submitted. Admin will confirm before platform dispatch proceeds.',
                  })}
                </Text>
              </View>
            ) : null}
            {delivery.status === 'in_transit' && isSelf ? (
              <Pressable disabled={loading} onPress={() => onStatus('out_for_delivery', 'Out for delivery to customer')} className="mt-6 rounded-lg bg-orange-500 py-3 disabled:opacity-50">
                <Text className="text-center font-sans text-sm font-medium text-white">{loading ? 'Updating...' : 'Mark as Out for Delivery'}</Text>
              </Pressable>
            ) : null}
            {delivery.status === 'out_for_delivery' && isSelf ? (
              <Pressable onPress={onProof} className="mt-6 rounded-lg bg-green-600 py-3">
                <Text className="text-center font-sans text-sm font-medium text-white">Upload Delivery Proof</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          <View className="items-end bg-gray-50 px-5 py-3 dark:bg-slate-700/50">
            <Pressable onPress={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-800">
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProofModal({ delivery, actionLoading, onClose, onUpload, onMessage }: {
  delivery: SellerDelivery | null;
  actionLoading: string | null;
  onClose: () => void;
  onUpload: (file: Blob | NativeUploadFile, recipientName: string, recipientPhone: string) => void;
  onMessage: (message: Message) => void;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [proofFile, setProofFile] = useState<Blob | NativeUploadFile | null>(null);
  const [proofName, setProofName] = useState('');
  if (!delivery) return null;

  const chooseFromGallery = async () => {
    const result = await pickImagesFromLibrary();
    const file = result.accepted[0];
    if (result.rejected > 0) {
      onMessage({ type: 'error', text: 'Some images were rejected. Use JPEG, PNG, or WebP under 5 MB.' });
    }
    if (file) {
      setProofFile(file);
      setProofName(file.name);
    }
  };

  const chooseFromCamera = async () => {
    try {
      const result = await pickImageFromCamera();
      const file = result.accepted[0];
      if (file) {
        setProofFile(file);
        setProofName(file.name);
      }
    } catch (error) {
      onMessage({ type: 'error', text: formatApiErrorMessage(error, 'Camera is not available.') });
    }
  };

  const submit = () => {
    if (!proofFile || !recipientName.trim() || !recipientPhone.trim()) {
      onMessage({ type: 'error', text: 'Please fill all fields and select a proof image' });
      return;
    }
    onUpload(proofFile, recipientName, recipientPhone);
  };

  return (
    <Modal visible={Boolean(delivery)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-4 py-8">
        <View className="mx-auto w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-800">
          <View className="flex-row items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
                <Feather name="camera" color="#16a34a" size={18} />
              </View>
              <View>
                <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">Upload Delivery Proof</Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">#{delivery.order.orderNumber}</Text>
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x-circle" color="#94a3b8" size={22} />
            </Pressable>
          </View>
          <View className="gap-4 px-5 py-5">
            <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
              Attach a photo of the delivered package and confirm recipient details to mark this order as delivered.
            </Text>
            <View className="gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 dark:border-slate-600">
              {proofFile ? (
                <View className="flex-row items-center justify-center gap-2">
                  <Feather name="check-circle" color="#16a34a" size={20} />
                  <Text className="font-sans text-sm font-medium text-green-700 dark:text-green-400" numberOfLines={1}>{proofName}</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Feather name="camera" color="#94a3b8" size={28} />
                  <Text className="mt-2 font-sans text-xs text-gray-500 dark:text-slate-400">Select or capture a proof photo</Text>
                </View>
              )}
              <View className="gap-2 sm:flex-row">
                <Pressable onPress={chooseFromGallery} className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5">
                  <Feather name="folder" color="#ffffff" size={15} />
                  <Text className="font-sans text-sm font-bold text-white">Gallery</Text>
                </Pressable>
                <Pressable onPress={chooseFromCamera} className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 dark:border-slate-600">
                  <Feather name="camera" color="#64748b" size={15} />
                  <Text className="font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Camera</Text>
                </Pressable>
              </View>
            </View>
            <TextInput value={recipientName} onChangeText={setRecipientName} className="h-12 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Recipient Name" placeholderTextColor="#9ca3af" />
            <TextInput value={recipientPhone} onChangeText={setRecipientPhone} className="h-12 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Recipient Phone" placeholderTextColor="#9ca3af" />
          </View>
          <View className="flex-row gap-3 px-5 pb-5">
            <Pressable onPress={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 dark:border-slate-600">
              <Text className="text-center font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Cancel</Text>
            </Pressable>
            <Pressable disabled={actionLoading === String(delivery.id)} onPress={submit} className="flex-1 rounded-xl bg-green-600 py-2.5 disabled:opacity-50">
              <Text className="text-center font-sans text-sm font-semibold text-white">{actionLoading === String(delivery.id) ? 'Uploading...' : 'Submit Proof'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FeeSubmitModal({
  delivery,
  actionLoading,
  onClose,
  onSubmit,
}: {
  delivery: SellerDelivery | null;
  actionLoading: string | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const { t } = useAppTranslation();
  const [note, setNote] = useState('');

  if (!delivery) return null;

  return (
    <Modal visible={Boolean(delivery)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-4 py-8">
        <View className="mx-auto w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-800">
          <View className="flex-row items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <Feather name="dollar-sign" color="#d97706" size={18} />
              </View>
              <View>
                <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">
                  {t('seller.delivery.fee.title', { defaultValue: 'Submit platform delivery fee' })}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">#{delivery.order.orderNumber}</Text>
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x-circle" color="#94a3b8" size={22} />
            </Pressable>
          </View>
          <View className="gap-4 px-5 py-5">
            <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
              {t('seller.delivery.fee.description', {
                defaultValue:
                  'After paying the quoted platform logistics fee (bank transfer or mobile wallet), submit your payment reference so admin can confirm dispatch.',
              })}
            </Text>
            <View className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <Text className="font-sans text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">
                {t('seller.delivery.fee.amount_label', { defaultValue: 'Quoted fee' })}
              </Text>
              <Text className="mt-1 font-sans text-lg font-bold text-amber-900 dark:text-amber-100">
                {delivery.platformDeliveryFee}
              </Text>
            </View>
            <View>
              <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                {t('seller.delivery.fee.note_label', { defaultValue: 'Payment note / reference' })}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
                className="min-h-24 rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder={t('seller.delivery.fee.note_placeholder', {
                  defaultValue: 'e.g. KBZ Pay ref 123456789, paid on 9 Jun',
                })}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
          <View className="flex-row gap-3 px-5 pb-5">
            <Pressable onPress={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 dark:border-slate-600">
              <Text className="text-center font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('seller.delivery.actions.cancel', { defaultValue: 'Cancel' })}
              </Text>
            </Pressable>
            <Pressable
              disabled={actionLoading === String(delivery.id)}
              onPress={() => onSubmit(note)}
              className="flex-1 rounded-xl bg-amber-600 py-2.5 disabled:opacity-50"
            >
              <Text className="text-center font-sans text-sm font-semibold text-white">
                {actionLoading === String(delivery.id)
                  ? t('seller.delivery.fee.submitting', { defaultValue: 'Submitting...' })
                  : t('seller.delivery.fee.submit', { defaultValue: 'Submit to admin' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DeliveryManagementNative({ onRefresh }: { onRefresh?: () => Promise<void> }) {
  const { t } = useAppTranslation();
  const [deliveries, setDeliveries] = useState<SellerDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<SellerDelivery | null>(null);
  const [methodDelivery, setMethodDelivery] = useState<SellerDelivery | null>(null);
  const [proofDelivery, setProofDelivery] = useState<SellerDelivery | null>(null);
  const [feeDelivery, setFeeDelivery] = useState<SellerDelivery | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      setDeliveries(await fetchSellerDeliveries());
    } catch (error) {
      setDeliveries([]);
      setMessage({ type: 'error', text: formatApiErrorMessage(error, t('seller.delivery.errors.load_failed', { defaultValue: 'Failed to load deliveries. Please try again.' })) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => ({
    pending: deliveries.filter((item) => item.status === 'pending').length,
    inTransit: deliveries.filter((item) => transitStatuses.includes(item.status)).length,
    delivered: deliveries.filter((item) => item.status === 'delivered').length,
    failed: deliveries.filter((item) => item.status === 'failed').length,
  }), [deliveries]);

  const replaceDelivery = (next: SellerDelivery | null) => {
    if (!next) return;
    setDeliveries((current) => current.map((item) => (String(item.id) === String(next.id) ? next : item)));
    setSelectedDelivery((current) => (current && String(current.id) === String(next.id) ? next : current));
    setFeeDelivery((current) => (current && String(current.id) === String(next.id) ? next : current));
  };

  const updateStatus = async (delivery: SellerDelivery, status: string, notes: string) => {
    setActionLoading(String(delivery.id));
    try {
      const next = await updateSellerDeliveryStatus(delivery.id, status, notes);
      replaceDelivery(next);
      await onRefresh?.();
      setMessage({ type: 'success', text: 'Delivery status updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: formatApiErrorMessage(error, t('seller.delivery.errors.status_failed', { defaultValue: 'Failed to update status' })) });
    } finally {
      setActionLoading(null);
    }
  };

  const chooseMethod = async (method: DeliveryMethod, pickupAddress: string) => {
    if (!methodDelivery) return;
    if (method === 'platform' && !pickupAddress.trim()) {
      setMessage({ type: 'error', text: 'Pickup address is required for platform logistics.' });
      return;
    }
    setActionLoading(String(methodDelivery.id));
    try {
      await setSellerOrderDeliveryMethod(
        methodDelivery.orderId,
        method,
        pickupAddress,
        methodDelivery.packageWeight || 5
      );
      await load();
      await onRefresh?.();
      setMethodDelivery(null);
      setMessage({ type: 'success', text: 'Delivery method updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: formatApiErrorMessage(error, t('seller.delivery.errors.method_failed', { defaultValue: 'Failed to set delivery method' })) });
    } finally {
      setActionLoading(null);
    }
  };

  const uploadProof = async (file: Blob | NativeUploadFile, recipientName: string, recipientPhone: string) => {
    if (!proofDelivery) return;
    setActionLoading(String(proofDelivery.id));
    try {
      const next = await uploadSellerDeliveryProof(proofDelivery.id, file, recipientName, recipientPhone);
      replaceDelivery(next);
      await onRefresh?.();
      setProofDelivery(null);
      setMessage({ type: 'success', text: 'Delivery proof uploaded.' });
    } catch (error) {
      setMessage({ type: 'error', text: formatApiErrorMessage(error, t('seller.delivery.errors.proof_failed', { defaultValue: 'Failed to upload proof' })) });
    } finally {
      setActionLoading(null);
    }
  };

  const submitPlatformFee = async (note: string) => {
    if (!feeDelivery) return;
    setActionLoading(String(feeDelivery.id));
    try {
      const next = await submitSellerDeliveryFee(feeDelivery.id, note);
      replaceDelivery(next);
      await onRefresh?.();
      setFeeDelivery(null);
      setMessage({
        type: 'success',
        text: t('seller.delivery.fee.success', {
          defaultValue: 'Platform delivery fee submitted for admin review.',
        }),
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: formatApiErrorMessage(error, t('seller.delivery.fee.failed', { defaultValue: 'Failed to submit delivery fee.' })),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openFeeSubmit = (delivery: SellerDelivery) => {
    setFeeDelivery(delivery);
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-12">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-semibold text-gray-900 dark:text-white">{t('seller.delivery.title', { defaultValue: 'Delivery Management' })}</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('seller.delivery.subtitle', { defaultValue: 'Choose delivery methods and track your order deliveries' })}
          </Text>
        </View>
        <Pressable onPress={load} className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={16} />
          <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{t('seller.delivery.refresh', { defaultValue: 'Refresh' })}</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <StatCard label={t('seller.delivery.stats.pending', { defaultValue: 'Pending' })} value={stats.pending} icon="clock" tone="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard label={t('seller.delivery.stats.in_transit', { defaultValue: 'In Transit' })} value={stats.inTransit} icon="truck" tone="bg-purple-50 dark:bg-purple-900/20" />
        <StatCard label={t('seller.delivery.stats.delivered', { defaultValue: 'Delivered' })} value={stats.delivered} icon="check-circle" tone="bg-green-50 dark:bg-green-900/20" />
        <StatCard label={t('seller.delivery.stats.failed', { defaultValue: 'Failed' })} value={stats.failed} icon="x-circle" tone="bg-red-50 dark:bg-red-900/20" />
      </View>

      <MessageBanner message={message} onClose={() => setMessage(null)} />

      <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {deliveries.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1216px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { label: t('seller.delivery.table.order_id', { defaultValue: 'Order ID' }), width: 'w-36' },
                  { label: t('seller.delivery.table.customer', { defaultValue: 'Customer' }), width: 'w-52' },
                  { label: t('seller.delivery.table.delivery_method', { defaultValue: 'Delivery Method' }), width: 'w-44' },
                  { label: t('seller.delivery.table.delivery_fee', { defaultValue: 'Delivery Fee' }), width: 'w-36' },
                  { label: t('seller.delivery.table.address', { defaultValue: 'Address' }), width: 'w-56' },
                  { label: t('seller.delivery.table.status', { defaultValue: 'Status' }), width: 'w-40' },
                  { label: t('seller.delivery.table.actions', { defaultValue: 'Actions' }), width: 'w-64' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}
                  >
                    {heading.label}
                  </Text>
                ))}
              </View>
              {deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  actionLoading={actionLoading}
                  onOpen={() => setSelectedDelivery(delivery)}
                  onMethod={() => setMethodDelivery(delivery)}
                  onStatus={(status, notes) => updateStatus(delivery, status, notes)}
                  onProof={() => setProofDelivery(delivery)}
                  onSubmitFee={() => openFeeSubmit(delivery)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center rounded-2xl border border-gray-100 bg-white p-12 dark:border-slate-700 dark:bg-slate-800">
            <Feather name="truck" color="#94a3b8" size={32} />
            <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">No deliveries found.</Text>
          </View>
        )}
      </View>

      <DeliveryMethodModal
        delivery={methodDelivery}
        loading={Boolean(methodDelivery && actionLoading === String(methodDelivery.id))}
        onClose={() => setMethodDelivery(null)}
        onSubmit={chooseMethod}
      />
      <DetailModal
        delivery={selectedDelivery}
        actionLoading={actionLoading}
        onClose={() => setSelectedDelivery(null)}
        onStatus={(status, notes) => selectedDelivery && updateStatus(selectedDelivery, status, notes)}
        onProof={() => {
          setProofDelivery(selectedDelivery);
          setSelectedDelivery(null);
        }}
        onSubmitFee={() => {
          if (selectedDelivery) openFeeSubmit(selectedDelivery);
        }}
      />
      <ProofModal
        delivery={proofDelivery}
        actionLoading={actionLoading}
        onClose={() => setProofDelivery(null)}
        onUpload={uploadProof}
        onMessage={setMessage}
      />
      <FeeSubmitModal
        delivery={feeDelivery}
        actionLoading={actionLoading}
        onClose={() => setFeeDelivery(null)}
        onSubmit={submitPlatformFee}
      />
    </View>
  );
}
