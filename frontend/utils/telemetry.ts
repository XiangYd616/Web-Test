type TelemetryState = {
  counters: Record<string, number>;
  durations: Record<string, { totalMs: number; count: number }>;
  lastEventAt: Record<string, number>;
  timers: Record<string, number>;
};

type TrackOptions = {
  throttleMs?: number;
};

type DurationSnapshot = {
  totalMs: number;
  count: number;
  avgMs: number;
};

type TelemetrySnapshot = {
  counters: Record<string, number>;
  durations: Record<string, DurationSnapshot>;
};

const STORAGE_KEY = 'test_ops_telemetry';

const readState = (): TelemetryState => {
  if (typeof window === 'undefined') {
    return { counters: {}, durations: {}, lastEventAt: {}, timers: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { counters: {}, durations: {}, lastEventAt: {}, timers: {} };
    }
    const parsed = JSON.parse(raw) as TelemetryState;
    return {
      counters: parsed?.counters ?? {},
      durations: parsed?.durations ?? {},
      lastEventAt: parsed?.lastEventAt ?? {},
      timers: parsed?.timers ?? {},
    };
  } catch {
    return { counters: {}, durations: {}, lastEventAt: {}, timers: {} };
  }
};

const writeState = (state: TelemetryState) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
};

const updateState = (updater: (state: TelemetryState) => TelemetryState) => {
  const next = updater(readState());
  writeState(next);
  return next;
};

export const trackCounter = (key: string, options?: TrackOptions) => {
  const now = Date.now();
  updateState(state => {
    const throttleMs = options?.throttleMs ?? 0;
    const lastAt = state.lastEventAt[key] ?? 0;
    if (throttleMs > 0 && now - lastAt < throttleMs) {
      return state;
    }
    const nextCounters = { ...state.counters };
    nextCounters[key] = (nextCounters[key] ?? 0) + 1;
    return {
      ...state,
      counters: nextCounters,
      lastEventAt: { ...state.lastEventAt, [key]: now },
    };
  });
};

export const startTimer = (name: string, id: string) => {
  if (!id) {
    return;
  }
  updateState(state => ({
    ...state,
    timers: { ...state.timers, [`${name}:${id}`]: Date.now() },
  }));
};

export const finishTimer = (name: string, id: string) => {
  if (!id) {
    return;
  }
  updateState(state => {
    const key = `${name}:${id}`;
    const startedAt = state.timers[key];
    if (!startedAt) {
      return state;
    }
    const duration = Math.max(0, Date.now() - startedAt);
    const prev = state.durations[name] ?? { totalMs: 0, count: 0 };
    const nextDurations = {
      ...state.durations,
      [name]: { totalMs: prev.totalMs + duration, count: prev.count + 1 },
    };
    const nextTimers = { ...state.timers };
    delete nextTimers[key];
    return {
      ...state,
      durations: nextDurations,
      timers: nextTimers,
    };
  });
};

export const finishTimersForTest = (id: string, types: string[] = ['run', 'rerun']) => {
  types.forEach(type => finishTimer(type, id));
};

export const getTelemetrySnapshot = (): TelemetrySnapshot => {
  const state = readState();
  const durations: Record<string, DurationSnapshot> = {};
  Object.entries(state.durations).forEach(([key, value]) => {
    const count = value.count || 0;
    durations[key] = {
      totalMs: value.totalMs || 0,
      count,
      avgMs: count > 0 ? value.totalMs / count : 0,
    };
  });
  return {
    counters: state.counters,
    durations,
  };
};
