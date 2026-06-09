/**
 * Myanmar Locations - Export for easy import in React components
 * Use: import { getMyanmarStates } from './myanmar-locations'
 */

import myanmarLocationsEng from './myanmar-locations-eng.json';
import myanmarLocationsMm from './myanmar-locations-mm.json';

export const getMyanmarStates = (language = 'en') => {
  if (language === 'mm' || language.startsWith('my')) {
    return myanmarLocationsMm;
  }
  return myanmarLocationsEng;
};

export const getStatesFromDB = (db) => {
  const stateMap = {};
  db.flats.regions_states.forEach(region => {
    const loc = db.locations.find(l => l.region_state === region);
    if (loc) {
      stateMap[loc.region_state] = loc.cities.map(c => c.city);
    }
  });
  return Object.entries(stateMap).map(([state, cities]) => ({ state, cities }));
};

export const FALLBACK_STATES_EN = getStatesFromDB(myanmarLocationsEng);
export const FALLBACK_STATES_MM = getStatesFromDB(myanmarLocationsMm);

// Default export for backward compatibility
export default getMyanmarStates;

