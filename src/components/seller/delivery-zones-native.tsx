import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { getMyanmarStates } from '@/data/myanmar-locations';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import { myanmarLocationsEng, toLocationTree } from '@/utils/myanmarLocationTree';
import {
  fetchSellerDeliveryZones,
  syncSellerDeliveryZones,
  type SellerDeliveryArea,
  type SellerDeliveryZonePayload,
} from '@/utils/native-api';

type FeeConfig = {
  fee: number;
  freeThreshold: number;
  daysMin: number;
  daysMax: number;
};

type LocationCity = {
  city: string;
  engCity: string;
  townships: string[];
  engTownships: string[];
};

type LocationState = {
  state: string;
  engState: string;
  cities: LocationCity[];
};

const defaultFee = (): FeeConfig => ({
  fee: 3000,
  freeThreshold: 0,
  daysMin: 3,
  daysMax: 5,
});

const zoneKey = (area: Pick<SellerDeliveryArea, 'areaType' | 'country' | 'state' | 'city' | 'township'>) =>
  [area.areaType, area.country || 'Myanmar', area.state, area.city, area.township].filter(Boolean).join('|');

const keyFor = (
  areaType: 'country' | 'state' | 'city' | 'township',
  state?: string,
  city?: string,
  township?: string
) => [areaType, 'Myanmar', state, city, township].filter(Boolean).join('|');

const parseKey = (key: string) => {
  const [areaType, country, state, city, township] = key.split('|');
  return {
    area_type: areaType as SellerDeliveryZonePayload['area_type'],
    country: country || 'Myanmar',
    state: state || null,
    city: city || null,
    township: township || null,
  };
};

function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  if (!message) return null;
  const success = tone === 'success';
  return (
    <View className={`flex-row items-center gap-2 rounded-xl border px-4 py-3 ${
      success
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/25'
        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/25'
    }`}>
      <Feather name={success ? 'check-circle' : 'alert-circle'} color={success ? '#15803d' : '#dc2626'} size={17} />
      <Text className={`min-w-0 flex-1 font-sans text-sm font-semibold ${success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {message}
      </Text>
    </View>
  );
}

function CheckMark({ checked, mixed, color = '#16a34a' }: { checked: boolean; mixed?: boolean; color?: string }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded border ${
        checked || mixed ? 'border-transparent' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900'
      }`}
      style={checked || mixed ? { backgroundColor: color } : undefined}
    >
      {checked ? <Feather name="check" color="#fff" size={14} /> : mixed ? <View className="h-0.5 w-2.5 rounded-full bg-white" /> : null}
    </View>
  );
}

function NumberField({
  value,
  onChange,
  suffix,
  width = 82,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  width?: number;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <TextInput
        value={String(value)}
        onChangeText={(text) => onChange(Number(text.replace(/[^\d]/g, '')) || 0)}
        keyboardType="numeric"
        placeholderTextColor="#94a3b8"
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center font-sans text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        style={{ width, minHeight: 34 }}
      />
      {suffix ? <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{suffix}</Text> : null}
    </View>
  );
}

function FeeEditor({
  fee,
  onChange,
}: {
  fee: FeeConfig;
  onChange: (next: FeeConfig) => void;
}) {
  const set = (patch: Partial<FeeConfig>) => onChange({ ...fee, ...patch });

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View className="flex-row items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-slate-950/70">
        <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400" style={{ width: 34 }}>Fee</Text>
        <NumberField value={fee.fee} onChange={(value) => set({ fee: value })} suffix="MMK" />
      </View>
      <View className="flex-row items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-slate-950/70">
        <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400" style={{ width: 34 }}>Days</Text>
        <NumberField value={fee.daysMin} onChange={(value) => set({ daysMin: Math.max(1, value) })} width={48} />
        <Text className="font-sans text-xs text-gray-400">-</Text>
        <NumberField value={fee.daysMax} onChange={(value) => set({ daysMax: Math.max(fee.daysMin, value) })} width={48} />
      </View>
    </View>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'indigo' }) {
  const toneClass = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/35 dark:text-blue-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/35 dark:text-indigo-300',
  }[tone];
  return (
    <View className={`rounded-full px-3 py-1 ${toneClass}`}>
      <Text className="font-sans text-xs font-bold">{value} {label}</Text>
    </View>
  );
}

export function DeliveryZonesNative({ onSaveSuccess }: { onSaveSuccess?: () => void | Promise<void> }) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const { t, language } = useAppTranslation();
  const locations = useMemo<LocationState[]>(
    () => toLocationTree(getMyanmarStates(language), myanmarLocationsEng),
    [language]
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [fees, setFees] = useState<Record<string, FeeConfig>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [wholeMyanmar, setWholeMyanmar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', tone: 'success' as 'success' | 'error' });

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: '', tone }), 3500);
  }, []);

  const getFee = useCallback((key: string) => fees[key] || defaultFee(), [fees]);
  const setFee = (key: string, next: FeeConfig) => setFees((prev) => ({ ...prev, [key]: next }));

  const loadZones = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const zones = await fetchSellerDeliveryZones(signal);
      const nextSelected = new Set<string>();
      const nextFees: Record<string, FeeConfig> = {};

      zones.forEach((zone) => {
        const key = zoneKey(zone);
        nextSelected.add(key);
        nextFees[key] = {
          fee: zone.shippingFeeValue,
          freeThreshold: zone.freeShippingThresholdValue,
          daysMin: zone.estimatedDaysMin || 3,
          daysMax: zone.estimatedDaysMax || 5,
        };
      });

      setSelected(nextSelected);
      setFees(nextFees);
      setWholeMyanmar(nextSelected.has('country|Myanmar'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('seller.delivery_zones.error_load', 'Failed to load delivery zones.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => void loadZones(controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadZones]);

  const stateKeys = useCallback((state: string) => {
    const node = locations.find((item) => item.engState === state);
    if (!node) return [];
    return [
      keyFor('state', state),
      ...node.cities.flatMap((city) => [
        keyFor('city', state, city.engCity),
        ...city.engTownships.map((township) => keyFor('township', state, city.engCity, township)),
      ]),
    ];
  }, [locations]);

  const cityKeys = useCallback((state: string, city: string) => {
    const node = locations.find((item) => item.engState === state);
    const cityNode = node?.cities.find((item) => item.engCity === city);
    if (!cityNode) return [];
    return [
      keyFor('city', state, city),
      ...cityNode.engTownships.map((township) => keyFor('township', state, city, township)),
    ];
  }, [locations]);

  const ensureFees = (keys: string[]) => {
    const missing = keys.filter((key) => !fees[key]);
    if (!missing.length) return;
    setFees((prev) => ({
      ...prev,
      ...Object.fromEntries(missing.map((key) => [key, defaultFee()])),
    }));
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleWholeMyanmar = () => {
    setWholeMyanmar((current) => {
      const next = !current;
      if (next) {
        const key = 'country|Myanmar';
        setSelected(new Set([key]));
        ensureFees([key]);
      } else {
        setSelected(new Set());
      }
      return next;
    });
  };

  const toggleKeys = (keys: string[], parentKey: string) => {
    const isSelected = selected.has(parentKey);
    if (!isSelected) ensureFees(keys);
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => {
        if (isSelected) next.delete(key);
        else next.add(key);
      });
      next.delete('country|Myanmar');
      return next;
    });
    setWholeMyanmar(false);
  };

  const toggleTownship = (state: string, city: string, township: string) => {
    const key = keyFor('township', state, city, township);
    if (!selected.has(key)) ensureFees([key]);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        next.delete(keyFor('city', state, city));
        next.delete(keyFor('state', state));
      } else {
        next.add(key);
        const cityNode = locations.find((item) => item.engState === state)?.cities.find((item) => item.engCity === city);
        if (cityNode?.engTownships.every((item) => next.has(keyFor('township', state, city, item)))) {
          next.add(keyFor('city', state, city));
        }
      }
      next.delete('country|Myanmar');
      return next;
    });
    setWholeMyanmar(false);
  };

  const isMixed = (keys: string[], parentKey: string) => {
    const childKeys = keys.filter((key) => key !== parentKey);
    return childKeys.some((key) => selected.has(key)) && !childKeys.every((key) => selected.has(key));
  };

  const summary = useMemo(() => ({
    states: [...selected].filter((key) => key.startsWith('state|')).length,
    cities: [...selected].filter((key) => key.startsWith('city|')).length,
    townships: [...selected].filter((key) => key.startsWith('township|')).length,
  }), [selected]);

  const selectedCount = selected.size;
  const townshipCardWidth = width >= 1180 ? '32%' : width >= 820 ? '48%' : '100%';
  const cityListSurface = isDark ? '#020617' : '#f8fafc';
  const cityRowSurface = isDark ? '#0f172a' : '#ffffff';
  const selectedCityRowSurface = isDark ? '#172554' : '#eff6ff';
  const cityBorderColor = isDark ? '#1e293b' : '#e5e7eb';
  const townshipListSurface = isDark ? '#020617' : '#f1f5f9';
  const townshipCardSurface = isDark ? '#0f172a' : '#ffffff';
  const selectedTownshipSurface = isDark ? '#312e81' : '#eef2ff';
  const townshipBorderColor = isDark ? '#1e293b' : '#e5e7eb';
  const selectedTownshipBorderColor = isDark ? '#6366f1' : '#a5b4fc';

  const buildPayload = (): SellerDeliveryZonePayload[] => {
    const keys = wholeMyanmar ? ['country|Myanmar'] : [...selected];
    return keys.map((key) => {
      const parsed = parseKey(key);
      const fee = fees[key] || defaultFee();
      return {
        ...parsed,
        shipping_fee: fee.fee,
        free_shipping_threshold: fee.freeThreshold || null,
        estimated_delivery_days_min: Math.max(1, fee.daysMin),
        estimated_delivery_days_max: Math.max(Math.max(1, fee.daysMin), fee.daysMax),
        is_active: true,
      };
    });
  };

  const handleSave = async () => {
    if (!selectedCount) {
      showToast(t('seller.delivery_zones.no_zones', 'Select at least one delivery zone.'), 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await syncSellerDeliveryZones(buildPayload());
      showToast(result.message || t('seller.delivery_zones.saved', 'Delivery zones saved successfully.'));
      await onSaveSuccess?.();
      await loadZones();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('seller.delivery_zones.error_save', 'Failed to save delivery zones.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-900">
        <ActivityIndicator color="#16a34a" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">Loading delivery zones...</Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Feather name="truck" color="#16a34a" size={21} />
            <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
              {t('seller.delivery_zones.title', 'Delivery Zones')}
            </Text>
          </View>
          <Text className="mt-1 font-sans text-sm leading-5 text-gray-500 dark:text-slate-400">
            {t('seller.delivery_zones.subtitle', 'Select where your store can deliver and set shipping fees by region.')}
          </Text>
        </View>
        <Pressable
          disabled={saving || selectedCount === 0}
          onPress={handleSave}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 disabled:opacity-50"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Feather name="save" color="#fff" size={16} />}
          <Text className="font-sans text-sm font-bold text-white">
            {saving ? t('seller.delivery_zones.saving', 'Saving...') : t('seller.delivery_zones.save_zones', 'Save zones')}
          </Text>
        </Pressable>
      </View>

      <Toast message={toast.message} tone={toast.tone} />

      {selectedCount > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          <SummaryPill tone="green" value={summary.states} label={summary.states === 1 ? 'state' : 'states'} />
          <SummaryPill tone="blue" value={summary.cities} label={summary.cities === 1 ? 'city' : 'cities'} />
          <SummaryPill tone="indigo" value={summary.townships} label={summary.townships === 1 ? 'township' : 'townships'} />
        </View>
      ) : null}

      <View className={`rounded-2xl border-2 p-4 ${wholeMyanmar ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/40' : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
        <Pressable onPress={toggleWholeMyanmar} className="gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <CheckMark checked={wholeMyanmar} />
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
              <Feather name="globe" color="#16a34a" size={19} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">{t('seller.delivery_zones.whole_myanmar', 'Whole Myanmar')}</Text>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{t('seller.delivery_zones.whole_myanmar_sub', 'Use one fee and delivery window for all regions.')}</Text>
            </View>
          </View>
        </Pressable>
        {wholeMyanmar ? (
          <View className="mt-4 border-t border-green-200 pt-4 dark:border-green-800/80">
            <FeeEditor fee={getFee('country|Myanmar')} onChange={(next) => setFee('country|Myanmar', next)} />
          </View>
        ) : null}
      </View>

      {!wholeMyanmar ? (
        <View className="gap-3">
          {locations.map((state) => {
            const stateKey = keyFor('state', state.engState);
            const keys = stateKeys(state.engState);
            const stateChecked = selected.has(stateKey);
            const stateMixed = isMixed(keys, stateKey);
            const stateOpen = expanded.has(state.engState);

            return (
              <View key={state.engState} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <Pressable onPress={() => toggleExpand(state.engState)} className={`gap-3 px-4 py-3 ${stateChecked || stateMixed ? 'bg-green-50 dark:bg-green-950/35' : 'bg-white dark:bg-slate-900'}`}>
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => toggleKeys(keys, stateKey)}>
                      <CheckMark checked={stateChecked} mixed={stateMixed} />
                    </Pressable>
                    <Text className="min-w-0 flex-1 font-sans text-sm font-bold text-gray-950 dark:text-slate-100">{state.state}</Text>
                    <Feather name={stateOpen ? 'chevron-down' : 'chevron-right'} color="#94a3b8" size={18} />
                  </View>
                  {stateChecked || stateMixed ? <FeeEditor fee={getFee(stateKey)} onChange={(next) => setFee(stateKey, next)} /> : null}
                </Pressable>

                {stateOpen ? (
                  <View
                    className="border-t"
                    style={{ backgroundColor: cityListSurface, borderColor: cityBorderColor }}
                  >
                    {state.cities.map((city) => {
                      const cityKey = keyFor('city', state.engState, city.engCity);
                      const keysForCity = cityKeys(state.engState, city.engCity);
                      const cityChecked = selected.has(cityKey);
                      const cityMixed = isMixed(keysForCity, cityKey);
                      const cityOpen = expanded.has(cityKey);

                      return (
                        <View
                          key={city.engCity}
                          className="border-b"
                          style={{ borderColor: cityBorderColor }}
                        >
                          <Pressable
                            onPress={() => toggleExpand(cityKey)}
                            className="gap-3 px-5 py-3 sm:px-6"
                            style={{
                              backgroundColor: cityChecked || cityMixed ? selectedCityRowSurface : cityRowSurface,
                            }}
                          >
                            <View className="flex-row items-center gap-3">
                              <Pressable onPress={() => toggleKeys(keysForCity, cityKey)}>
                                <CheckMark checked={cityChecked} mixed={cityMixed} color="#2563eb" />
                              </Pressable>
                              <Text
                                className="min-w-0 flex-1 font-sans text-sm font-semibold"
                                style={{
                                  color:
                                    cityChecked || cityMixed
                                      ? isDark
                                        ? '#bfdbfe'
                                        : '#1e40af'
                                      : isDark
                                        ? '#e2e8f0'
                                        : '#1f2937',
                                }}
                              >
                                {city.city}
                              </Text>
                              <Feather name={cityOpen ? 'chevron-down' : 'chevron-right'} color="#94a3b8" size={16} />
                            </View>
                            {cityChecked || cityMixed ? <FeeEditor fee={getFee(cityKey)} onChange={(next) => setFee(cityKey, next)} /> : null}
                          </Pressable>

                          {cityOpen ? (
                            <View
                              className="flex-row flex-wrap gap-2 px-4 py-3 sm:px-7"
                              style={{ backgroundColor: townshipListSurface }}
                            >
                              {city.townships.map((township, index) => {
                                const engTownship = city.engTownships[index] || township;
                                const townshipKey = keyFor('township', state.engState, city.engCity, engTownship);
                                const checked = selected.has(townshipKey);
                                return (
                                  <View
                                    key={engTownship}
                                    className="rounded-xl border p-3"
                                    style={{
                                      width: townshipCardWidth,
                                      minWidth: width >= 820 ? 260 : undefined,
                                      backgroundColor: checked ? selectedTownshipSurface : townshipCardSurface,
                                      borderColor: checked ? selectedTownshipBorderColor : townshipBorderColor,
                                    }}
                                  >
                                    <Pressable onPress={() => toggleTownship(state.engState, city.engCity, engTownship)} className="flex-row items-center gap-2">
                                      <CheckMark checked={checked} color="#4f46e5" />
                                      <Text
                                        className="min-w-0 flex-1 font-sans text-xs font-semibold"
                                        style={{
                                          color: checked
                                            ? isDark
                                              ? '#e0e7ff'
                                              : '#3730a3'
                                            : isDark
                                              ? '#cbd5e1'
                                              : '#374151',
                                        }}
                                      >
                                        {township}
                                      </Text>
                                    </Pressable>
                                    {checked ? (
                                      <View
                                        className="mt-3 border-t pt-3"
                                        style={{ borderColor: isDark ? '#4f46e5' : '#c7d2fe' }}
                                      >
                                        <FeeEditor fee={getFee(townshipKey)} onChange={(next) => setFee(townshipKey, next)} />
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {selectedCount === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="map-pin" color="#94a3b8" size={30} />
          <Text className="mt-3 font-sans text-sm font-bold text-gray-500 dark:text-slate-400">{t('seller.delivery_zones.no_zones', 'No delivery zones selected')}</Text>
          <Text className="mt-1 text-center font-sans text-xs text-gray-400 dark:text-slate-500">{t('seller.delivery_zones.no_zones_hint', 'Choose Whole Myanmar or expand states to select cities and townships.')}</Text>
        </View>
      ) : (
        <View className="items-end border-t border-gray-200 pt-4 dark:border-slate-800">
          <Pressable disabled={saving} onPress={handleSave} className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 disabled:opacity-50">
            {saving ? <ActivityIndicator color="#fff" /> : <Feather name="check-circle" color="#fff" size={16} />}
            <Text className="font-sans text-sm font-bold text-white">
              {saving ? t('seller.delivery_zones.saving', 'Saving...') : t('seller.delivery_zones.save_n_zones', { count: selectedCount, defaultValue: `Save ${selectedCount} zones` })}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
