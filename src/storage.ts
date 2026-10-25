import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data, Settings } from './types';

const KEY = 'ai-tt:data:v1';

export const defaultData: Data = {
  tips: [],
  collections: [
    { id: 'c-fav', name: 'Do wypróbowania', emoji: '🧪' },
    { id: 'c-work', name: 'Praca', emoji: '💼' },
  ],
  settings: { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash' },
};

export async function loadData(): Promise<Data> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<Data>;
    const saved = (parsed.settings ?? {}) as Partial<Settings>;
    // starsze wersje miały tylko klucz Claude'a, bez pola provider
    const settings: Settings = saved.provider
      ? { ...defaultData.settings, ...saved }
      : saved.apiKey
        ? { provider: 'claude', apiKey: saved.apiKey, model: saved.model || 'claude-sonnet-5-5' }
        : defaultData.settings;
    return { tips: parsed.tips ?? [], collections: parsed.collections ?? defaultData.collections, settings };
  } catch {
    return defaultData;
  }
}

export async function saveData(data: Data): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // brak miejsca / błąd zapisu – ignorujemy, dane zostają w pamięci
  }
}
