// components/product/DeliveryZoneDisplay.jsx
// Displays seller delivery zones on the product detail page.
// Groups saved delivery areas by region/state and shows township chips,
// with full language support (EN ↔ Myanmar script).
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon,
  TruckIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import myanmarLocationsEng from '../../data/myanmar-locations-eng.json';
import myanmarLocationsMm  from '../../data/myanmar-locations-mm.json';

// ─── Name lookup ──────────────────────────────────────────────────────────────
// Builds a one-time map of canonical English name → Myanmar-script name
// so we can localise any value that came out of the DB (which always stores English).
const buildNameLookup = () => {
  const state    = {};
  const city     = {};
  const township = {};

  const engLocs = myanmarLocationsEng.locations || [];
  const mmLocs  = myanmarLocationsMm.locations  || [];

  engLocs.forEach((engRegion, rIdx) => {
    const mmRegion = mmLocs[rIdx];
    if (engRegion.region_state && mmRegion?.region_state) {
      state[engRegion.region_state] = mmRegion.region_state;
    }
    (engRegion.cities || []).forEach((engCity, cIdx) => {
      const mmCity = mmRegion?.cities?.[cIdx];
      if (engCity.city && mmCity?.city) city[engCity.city] = mmCity.city;
      (engCity.townships || []).forEach((engTs, tIdx) => {
        const mmTs = mmCity?.townships?.[tIdx];
        if (engTs && mmTs) township[engTs] = mmTs;
      });
    });
  });

  return { state, city, township };
};

// Singleton — built once, reused across renders
const NAME_LOOKUP = buildNameLookup();

// ─── Data helpers ─────────────────────────────────────────────────────────────
/**
 * Given the flat array of delivery area records from the API, produces a
 * structured representation:
 *   { type: 'country', zone }          — whole-Myanmar zone
 *   { type: 'regions', groups: [...] } — per-region breakdown
 *
 * Each group: { state, coversAll, stateZone, items: [area, ...] }
 * (items are city- or township-level zones under that state)
 */
const groupAreas = (areas) => {
  const countryZone = areas.find((a) => a.area_type === 'country');
  if (countryZone) return { type: 'country', zone: countryZone };

  const regionMap = new Map();

  areas.forEach((area) => {
    const stateKey = area.state || '—';
    if (!regionMap.has(stateKey)) {
      regionMap.set(stateKey, { state: stateKey, coversAll: false, stateZone: null, items: [] });
    }
    const group = regionMap.get(stateKey);

    if (area.area_type === 'state') {
      group.coversAll  = true;
      group.stateZone  = area;
    } else if (area.area_type === 'township' || area.area_type === 'city') {
      group.items.push(area);
    }
  });

  return { type: 'regions', groups: Array.from(regionMap.values()) };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const formatFee  = (n) => Number(n || 0).toLocaleString();
const formatDays = (min, max) => (min && max ? `${min}–${max}` : (min || max || ''));

/** Pill badge for a single township / city */
const ZonePill = ({ label }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                   bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300
                   border border-green-200 dark:border-green-800 whitespace-nowrap">
    {label}
  </span>
);

/** Fee + days row shown under a region or township group */
const ZoneMeta = ({ zone, t }) => {
  if (!zone) return null;
  const fee  = Number(zone.shipping_fee || 0);
  const dMin = zone.estimated_delivery_days_min;
  const dMax = zone.estimated_delivery_days_max;
  const days = formatDays(dMin, dMax);
  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-slate-400">
      <span className="flex items-center gap-1">
        <TruckIcon className="h-3.5 w-3.5 flex-shrink-0" />
        {formatFee(fee)} {t('productDetail.delivery_mmk', 'MMK')}
      </span>
      {days && (
        <span>
          {t('productDetail.delivery_days', { min: dMin, max: dMax, defaultValue: `${days} days` })}
        </span>
      )}
    </div>
  );
};

/** One region row: name + township chips */
const RegionRow = ({ group, isMM, t }) => {
  const [expanded, setExpanded] = useState(false);
  const CHIP_LIMIT = 6;

  const displayState = isMM
    ? (NAME_LOOKUP.state[group.state] || group.state)
    : group.state;

  // Build the list of pills from child zones
  const pills = group.items.map((area) => {
    const raw   = area.township || area.city || '—';
    const label = isMM
      ? (NAME_LOOKUP.township[raw] || NAME_LOOKUP.city[raw] || raw)
      : raw;
    return { key: raw, label };
  });

  const visible  = expanded ? pills : pills.slice(0, CHIP_LIMIT);
  const overflow = pills.length - CHIP_LIMIT;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700
                    bg-white dark:bg-slate-800 p-4 space-y-2.5">

      {/* Region header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-snug">
            {displayState}
          </span>
        </div>

        {/* "All townships" badge when the entire state is covered */}
        {group.coversAll && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                           font-semibold bg-green-600 text-white flex-shrink-0">
            <CheckCircleIcon className="h-3 w-3" />
            {t('productDetail.delivery_all_townships', 'All townships')}
          </span>
        )}
      </div>

      {/* Township chips (only when NOT coversAll, or coversAll but extra city/township rows exist) */}
      {!group.coversAll && pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((p) => <ZonePill key={p.key} label={p.label} />)}

          {/* Expand / collapse */}
          {overflow > 0 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                         font-medium bg-gray-100 dark:bg-slate-700
                         text-gray-600 dark:text-slate-300 hover:bg-gray-200
                         dark:hover:bg-slate-600 transition-colors"
            >
              <ChevronDownIcon className="h-3 w-3" />
              {t('productDetail.delivery_show_more', { count: overflow, defaultValue: `+${overflow} more` })}
            </button>
          )}
          {expanded && overflow > 0 && (
            <button
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                         font-medium bg-gray-100 dark:bg-slate-700
                         text-gray-600 dark:text-slate-300 hover:bg-gray-200
                         dark:hover:bg-slate-600 transition-colors"
            >
              <ChevronUpIcon className="h-3 w-3" />
              {t('productDetail.delivery_show_less', 'Show less')}
            </button>
          )}
        </div>
      )}

      {/* Fee / days — prefer per-region state-zone if available, else first child zone */}
      <ZoneMeta zone={group.stateZone || group.items[0] || null} t={t} />
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Props:
 *   areas   — array of delivery area objects from the API
 *   loading — boolean
 *   language — i18n.language string ('en' | 'my' | …)
 */
const DeliveryZoneDisplay = ({ areas = [], loading = false, language = 'en' }) => {
  const { t } = useTranslation();
  const isMM  = language === 'my' || language.startsWith('my');

  const grouped = useMemo(() => groupAreas(areas), [areas]);

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────
  if (!areas.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-slate-400 italic">
        {t('productDetail.delivery_not_set', 'Delivery zones not provided by this seller yet.')}
      </p>
    );
  }

  // ── Whole Myanmar ──────────────────────────────────────────────────────
  if (grouped.type === 'country') {
    const zone = grouped.zone;
    return (
      <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-600 flex items-center justify-center">
            <GlobeAltIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-900 dark:text-green-200">
              {t('productDetail.delivery_whole_myanmar', 'Whole Myanmar')}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              {t('productDetail.delivery_whole_myanmar_sub', 'Delivers to all regions and townships')}
            </p>
          </div>
        </div>
        <ZoneMeta zone={zone} t={t} />
      </div>
    );
  }

  // ── Per-region list ────────────────────────────────────────────────────
  const { groups } = grouped;
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <RegionRow key={group.state} group={group} isMM={isMM} t={t} />
      ))}

      {/* Total zones footer */}
      <p className="text-xs text-gray-400 dark:text-slate-500 text-right pt-1">
        {t('productDetail.delivery_zones_count', {
          count: groups.length,
          defaultValue: `${groups.length} region${groups.length === 1 ? '' : 's'} covered`,
        })}
      </p>
    </div>
  );
};

export default DeliveryZoneDisplay;