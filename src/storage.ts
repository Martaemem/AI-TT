import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data } from './types';

const KEY = 'ai-tt:data:v1';

export const defaultData: Data = {
  tips: [],
  collections: [
    { id: 'c-fav', name: 'Do wypróbowania', emoji: '🧪' },
    { id: 'c-work', name: 'Praca', emoji: '💼' },
  ],
  settings: { apiKey: '', model: 'claude-sonnet-5-5' },
};

export async function loadData(): Promise<Data> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<Data>;
    return {
      tips: parsed.tips ?? [],
      collections: parsed.collections ?? defaultData.collections,
      settings: { ...defaultData.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultData;
  }
}

export async function saveData(data: Data): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // brak miejsca / błąd zapisu – dane zostają w pamięci
  }
}
