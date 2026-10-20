import { getSetting, setSetting } from './settings';

/**
 * The workshop team on this phone: the people who sign off stages, who is
 * using this phone, which bench (production step) it sits at, and whether the
 * Floor build's dark "Night Shift" look is on. Stored per phone in settings.
 */
const STAFF_KEY = 'team.staff';
const OPERATOR_KEY = 'team.operator';
const BENCH_KEY = 'team.bench';
const NIGHT_KEY = 'display.nightShift';

/** Where this phone works. 'all' shows every open job in order of urgency. */
export type Bench = 'all' | 'sample' | 'machining' | 'fabricating' | 'finishing' | 'dispatch' | 'install';

export const BENCHES: { key: Bench; label: string }[] = [
  { key: 'all', label: 'All jobs' },
  { key: 'sample', label: 'Samples' },
  { key: 'machining', label: 'Machining' },
  { key: 'fabricating', label: 'Fabricating' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'install', label: 'Installing' },
];

/** Night Shift: 'auto' turns it on for orders at the Installed stage (installers in store). */
export type NightShift = 'auto' | 'on' | 'off';

export async function getStaff(): Promise<string[]> {
  const raw = await getSetting(STAFF_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string' && n.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export async function setStaff(names: string[]): Promise<void> {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 40);
  await setSetting(STAFF_KEY, JSON.stringify(clean));
}

export async function getOperator(): Promise<string | null> {
  return getSetting(OPERATOR_KEY);
}

export async function setOperator(name: string | null): Promise<void> {
  await setSetting(OPERATOR_KEY, name?.trim() || null);
}

export async function getBench(): Promise<Bench> {
  const value = await getSetting(BENCH_KEY);
  return (BENCHES.find((b) => b.key === value)?.key ?? 'all') as Bench;
}

export async function setBench(bench: Bench): Promise<void> {
  await setSetting(BENCH_KEY, bench);
}

export async function getNightShift(): Promise<NightShift> {
  const value = await getSetting(NIGHT_KEY);
  return value === 'on' || value === 'off' ? value : 'auto';
}

export async function setNightShift(mode: NightShift): Promise<void> {
  await setSetting(NIGHT_KEY, mode);
}
