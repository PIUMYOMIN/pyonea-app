import myanmarLocationsEng from '@/data/myanmar-locations-eng.json';
import myanmarLocationsMm from '@/data/myanmar-locations-mm.json';
import type { SupportedLanguage } from '@/i18n';
import type { SellerDeliveryArea } from '@/utils/native-api';

type DeliveryLabel = {
  region: string;
  city?: string;
  township?: string;
};

type NameLookup = {
  state: Record<string, string>;
  city: Record<string, string>;
  township: Record<string, string>;
};

const buildDeliveryNameLookup = (): NameLookup => {
  const state: Record<string, string> = {};
  const city: Record<string, string> = {};
  const township: Record<string, string> = {};

  const engLocs = myanmarLocationsEng.locations || [];
  const mmLocs = myanmarLocationsMm.locations || [];

  engLocs.forEach((engRegion, regionIndex) => {
    const mmRegion = mmLocs[regionIndex];
    if (!mmRegion) return;

    const engStateName = engRegion.region_state;
    const mmStateName = mmRegion.region_state;
    if (engStateName && mmStateName) state[engStateName] = mmStateName;

    (engRegion.cities || []).forEach((engCity, cityIndex) => {
      const mmCity = mmRegion?.cities?.[cityIndex];
      if (!mmCity) return;

      const engCityName = engCity.city;
      const mmCityName = mmCity.city;
      if (engCityName && mmCityName) city[engCityName] = mmCityName;

      (engCity.townships || []).forEach((engTownship, townshipIndex) => {
        const mmTownship = mmCity?.townships?.[townshipIndex];
        if (!engTownship || !mmTownship) return;
        township[engTownship] = mmTownship;
      });
    });
  });

  return { state, city, township };
};

const DELIVERY_NAME_LOOKUP = buildDeliveryNameLookup();

export function localizeDeliveryPlaceName(
  type: 'state' | 'city' | 'township',
  value: string,
  language: SupportedLanguage,
): string {
  if (language !== 'my' || !value) return value;
  return DELIVERY_NAME_LOOKUP[type]?.[value] || value;
}

export function buildProductDeliveryLabels(
  areas: SellerDeliveryArea[],
  language: SupportedLanguage,
  wholeMyanmarLabel: string,
): DeliveryLabel[] {
  return areas
    .map((area) => {
      if (area.areaType === 'country') {
        return { region: wholeMyanmarLabel };
      }

      const region = area.state || '';
      if (!region) return null;

      return {
        region: localizeDeliveryPlaceName('state', region, language),
        city: area.city
          ? localizeDeliveryPlaceName('city', area.city, language)
          : undefined,
        township: area.township
          ? localizeDeliveryPlaceName('township', area.township, language)
          : undefined,
      };
    })
    .filter((label): label is DeliveryLabel => label != null);
}

export type { DeliveryLabel };
