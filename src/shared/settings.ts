import { DEFAULT_SETTINGS, type Settings } from './types';

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const v = await chrome.storage.sync.get(KEY);
  return { ...DEFAULT_SETTINGS, ...((v[KEY] as Partial<Settings>) ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: { apiBaseUrl: s.apiBaseUrl.replace(/\/+$/, ''), webBaseUrl: s.webBaseUrl.replace(/\/+$/, '') } });
}
