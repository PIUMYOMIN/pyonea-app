/**
 * Myanmar location hierarchy for Pyonea.
 * Display names follow the active locale DB; state/city/township VALUES sent to the API
 * must always use English canonical keys (engState / engCity / engTownships).
 */
import myanmarLocationsEng from '../data/myanmar-locations-eng.json';

const pickCityName = (cityObj) => {
  if (!cityObj || typeof cityObj !== 'object') return null;
  if (typeof cityObj.city === 'string' && cityObj.city.trim()) return cityObj.city.trim();
  const fallbackKey = Object.keys(cityObj).find(
    (k) => k !== 'townships' && k !== 'mmName' && typeof cityObj[k] === 'string',
  );
  return fallbackKey ? String(cityObj[fallbackKey]).trim() : null;
};

/**
 * @param {object} db - localized locations JSON (from getMyanmarStates)
 * @param {object} engDb - myanmar-locations-eng.json (canonical keys)
 */
export function toLocationTree(db, engDb) {
  const locations = Array.isArray(db?.locations) ? db.locations : [];
  const engLocations = Array.isArray(engDb?.locations) ? engDb.locations : [];

  return locations
    .map((rs, rIdx) => {
      const state = typeof rs.region_state === 'string' ? rs.region_state.trim() : null;
      const engRs = engLocations[rIdx];
      const engState = typeof engRs?.region_state === 'string' ? engRs.region_state.trim() : state;
      const cities = Array.isArray(rs.cities) ? rs.cities : [];

      return {
        state,
        engState,
        cities: cities
          .map((c, cIdx) => {
            const engCityObj = engRs?.cities?.[cIdx];
            const engCity =
              typeof engCityObj?.city === 'string'
                ? engCityObj.city.trim()
                : pickCityName(c) ?? '';
            const townships = Array.isArray(c?.townships) ? c.townships.filter(Boolean) : [];
            const engTownships = Array.isArray(engCityObj?.townships)
              ? engCityObj.townships.filter(Boolean)
              : townships;
            return {
              city: pickCityName(c),
              engCity,
              townships,
              engTownships,
            };
          })
          .filter((c) => !!c.city),
      };
    })
    .filter((x) => !!x.state);
}

/**
 * Rows for State / City <select>s at checkout. Option **values** are always English;
 * labels are localized when available.
 *
 * @param {Array<{ state: string, cities: string[] }>|null|undefined} apiStates from GET /checkout-locations
 * @param {ReturnType<typeof toLocationTree>} displayTree
 */
export function buildCheckoutLocationRows(apiStates, displayTree) {
  const full = (displayTree || []).map((node) => ({
    engState: node.engState,
    label: node.state,
    cities: node.cities.map((c) => ({
      engCity: c.engCity,
      label: c.city,
    })),
  }));

  if (!apiStates?.length) return full;

  const byEngState = new Map(full.map((r) => [r.engState, r]));

  const out = [];
  for (const row of apiStates) {
    const direct = byEngState.get(row.state);
    if (direct) {
      const wanted = new Set(row.cities || []);
      const cities = direct.cities.filter(
        (c) => wanted.has(c.engCity) || wanted.has(c.label),
      );
      out.push({
        engState: direct.engState,
        label: direct.label,
        cities: cities.length ? cities : direct.cities,
      });
      continue;
    }

    const fuzzy = full.find((n) => n.label === row.state || n.engState === row.state);
    if (fuzzy) {
      const wanted = new Set(row.cities || []);
      const cities = fuzzy.cities.filter(
        (c) => wanted.has(c.engCity) || wanted.has(c.label),
      );
      out.push({
        engState: fuzzy.engState,
        label: fuzzy.label,
        cities: cities.length ? cities : fuzzy.cities,
      });
    } else {
      out.push({
        engState: row.state,
        label: row.state,
        cities: (row.cities || []).map((c) => ({ engCity: c, label: c })),
      });
    }
  }
  return out.length ? out : full;
}

/**
 * Map stored user/seller profile values (possibly legacy localized strings) to canonical English.
 */
export function resolveCanonicalLocation(tree, savedState, savedCity, savedTownship) {
  if (!tree?.length) {
    return {
      engState: savedState || '',
      engCity: savedCity || '',
      engTownship: savedTownship || '',
    };
  }

  let node =
    tree.find((n) => n.engState === savedState || n.state === savedState) ||
    tree.find((n) => n.cities.some((c) => c.engCity === savedCity || c.city === savedCity));

  if (!node) {
    return {
      engState: savedState || '',
      engCity: savedCity || '',
      engTownship: savedTownship || '',
    };
  }

  const cityObj =
    node.cities.find((c) => c.engCity === savedCity || c.city === savedCity) ||
    node.cities[0];

  if (!cityObj) {
    return { engState: node.engState, engCity: '', engTownship: '' };
  }

  let engTownship = '';
  if (savedTownship) {
    const i = cityObj.engTownships.indexOf(savedTownship);
    if (i >= 0) engTownship = cityObj.engTownships[i];
    else {
      const j = cityObj.townships.indexOf(savedTownship);
      engTownship = j >= 0 ? cityObj.engTownships[j] : savedTownship;
    }
  }

  return {
    engState: node.engState,
    engCity: cityObj.engCity,
    engTownship,
  };
}

export { myanmarLocationsEng };
