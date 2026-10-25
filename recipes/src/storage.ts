import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data, Settings } from './types';

const KEY = 'przepisy:data:v1';

export const CATEGORIES = ['Śniadania', 'Obiady', 'Zupy', 'Kolacje', 'Sałatki', 'Przekąski', 'Desery', 'Ciasta', 'Napoje', 'Inne'];

export const defaultData: Data = {
  recipes: [],
  shopping: [],
  plan: [],
  categories: CATEGORIES,
  settings: { provider: 'groq', apiKey: '', model: 'openai/gpt-oss-120b' },
};

export async function loadData(): Promise<Data> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultData;
    const p = JSON.parse(raw) as Partial<Data>;
    return {
      recipes: p.recipes ?? [],
      shopping: p.shopping ?? [],
      plan: p.plan ?? [],
      categories: p.categories?.length ? p.categories : CATEGORIES,
      settings: { ...defaultData.settings, ...(p.settings as Partial<Settings> | undefined) },
    };
  } catch {
    return defaultData;
  }
}

export async function saveData(data: Data): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // błąd zapisu – dane zostają w pamięci
  }
}
