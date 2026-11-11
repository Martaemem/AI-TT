import AsyncStorage from '@react-native-async-storage/async-storage';
import { Data, Settings, Tip } from './types';
import { CATEGORIES, DEFAULT_TOOLS } from './theme';

const KEY = 'ai-tt:data:v1';

export const defaultData: Data = {
  tips: [],
  collections: [
    { id: 'c-fav', name: 'Do wypróbowania', emoji: '🧪' },
    { id: 'c-work', name: 'Praca', emoji: '💼' },
  ],
  categories: CATEGORIES,
  tools: DEFAULT_TOOLS,
  settings: { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash' },
};

/** Stare porady miały jedną notatkę tekstową – zamieniamy ją na listę notatek. */
const migrateTip = (t: Tip): Tip =>
  t.notes || !t.note?.trim()
    ? { ...t, notes: t.notes ?? [] }
    : { ...t, note: '', notes: [{ id: `n-${t.id}`, text: t.note.trim(), createdAt: t.createdAt }] };

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
    const tips = (parsed.tips ?? []).map(migrateTip);
    // lista narzędzi: zapisana + te, które już występują w poradach
    const tools = [...(parsed.tools?.length ? parsed.tools : DEFAULT_TOOLS)];
    for (const t of tips) if (t.tool && !tools.includes(t.tool)) tools.push(t.tool);
    return {
      tips,
      collections: parsed.collections ?? defaultData.collections,
      categories: parsed.categories?.length ? parsed.categories : CATEGORIES,
      tools,
      settings,
    };
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
