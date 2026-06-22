import { AppState } from './models.js';
import { createSeedState } from './seed.js';

const STORAGE_KEY = 'bb-credential-poc-state-v1';
let fallbackState: AppState | null = null;

function parseState(payload: string): AppState | null {
  try {
    const parsed = JSON.parse(payload) as AppState;
    return parsed;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') {
    if (!fallbackState) {
      fallbackState = createSeedState();
    }
    return structuredClone(fallbackState);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return structuredClone(seeded);
    }
    const parsed = parseState(raw);
    if (!parsed) {
      const seeded = createSeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return structuredClone(seeded);
    }
    return parsed;
  } catch {
    if (!fallbackState) {
      fallbackState = createSeedState();
    }
    return structuredClone(fallbackState);
  }
}

export function saveState(state: AppState): void {
  const serial = JSON.stringify(state);
  if (typeof localStorage === 'undefined') {
    fallbackState = structuredClone(state);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, serial);
  } catch {
    fallbackState = structuredClone(state);
  }
}

export function resetState(): AppState {
  const seeded = createSeedState();
  saveState(seeded);
  return structuredClone(seeded);
}
