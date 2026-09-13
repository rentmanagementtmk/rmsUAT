// Static house/building reference data — ported unchanged from assets/js/app.js.
export const BUILDINGS = ['Jalanidhi', 'Spatika', 'Manikya', 'Vaidurya', 'Aparanji'] as const;

export type Floor = 'GF' | 'FF' | 'SF';

export interface HouseRef {
  id: string;
  building: string;
  floor: Floor;
  num: string;
  displayNum: number;
}

export const FLOOR_LABELS: Record<Floor, string> = {
  GF: 'Ground Floor',
  FF: 'First Floor',
  SF: 'Second Floor',
};

export const HOUSES: HouseRef[] = [
  { id: 'JLN-GF-01', building: 'Jalanidhi', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'JLN-GF-02', building: 'Jalanidhi', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'JLN-FF-01', building: 'Jalanidhi', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'JLN-FF-02', building: 'Jalanidhi', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'JLN-SF-01', building: 'Jalanidhi', floor: 'SF', num: '01', displayNum: 5 },
  { id: 'JLN-SF-02', building: 'Jalanidhi', floor: 'SF', num: '02', displayNum: 6 },
  { id: 'SPT-GF-01', building: 'Spatika', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'SPT-GF-02', building: 'Spatika', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'SPT-FF-01', building: 'Spatika', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'SPT-FF-02', building: 'Spatika', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'MNK-GF-01', building: 'Manikya', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'MNK-GF-02', building: 'Manikya', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'MNK-FF-01', building: 'Manikya', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'MNK-FF-02', building: 'Manikya', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'VDR-GF-01', building: 'Vaidurya', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'VDR-GF-02', building: 'Vaidurya', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'VDR-FF-01', building: 'Vaidurya', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'VDR-FF-02', building: 'Vaidurya', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'APR-GF-01', building: 'Aparanji', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'APR-GF-02', building: 'Aparanji', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'APR-FF-01', building: 'Aparanji', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'APR-FF-02', building: 'Aparanji', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'APR-SF-01', building: 'Aparanji', floor: 'SF', num: '01', displayNum: 5 },
  { id: 'APR-SF-02', building: 'Aparanji', floor: 'SF', num: '02', displayNum: 6 },
];

/** House <select> option label + disabled state — mirrors app.js's _renderHouseSelect() per-option logic */
export function houseSelectOption(h: HouseRef, cached: { IsActive?: boolean | string; TenantName?: string } | undefined) {
  const base = `${h.building} ${h.displayNum}`;
  const active = cached ? (cached.IsActive === true || String(cached.IsActive).toUpperCase() === 'TRUE') : true;
  const tenant = cached?.TenantName || '';
  if (!active) return { label: `${base} — Vacant`, disabled: true };
  if (!tenant) return { label: `${base} ⚠️`, disabled: false };
  return { label: `${base} - ${tenant}`, disabled: false };
}

