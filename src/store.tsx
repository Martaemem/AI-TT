import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Collection, Data, Settings, Tip } from './types';
import { defaultData, loadData, saveData } from './storage';

type Store = {
  ready: boolean;
  data: Data;
  addTip: (tip: Tip) => void;
  updateTip: (id: string, patch: Partial<Tip>) => void;
  deleteTip: (id: string) => void;
  addCollection: (c: Collection) => void;
  deleteCollection: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  addTool: (name: string) => void;
  deleteTool: (name: string) => void;
  removeDuplicates: () => number;
  setSettings: (s: Settings) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(defaultData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveData(data);
  }, [data]);

  const addTip = useCallback((tip: Tip) => setData((d) => ({ ...d, tips: [tip, ...d.tips] })), []);
  const updateTip = useCallback(
    (id: string, patch: Partial<Tip>) => setData((d) => ({ ...d, tips: d.tips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    [],
  );
  const deleteTip = useCallback((id: string) => setData((d) => ({ ...d, tips: d.tips.filter((t) => t.id !== id) })), []);
  const addCollection = useCallback((c: Collection) => setData((d) => ({ ...d, collections: [...d.collections, c] })), []);
  const deleteCollection = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        collections: d.collections.filter((c) => c.id !== id),
        tips: d.tips.map((t) => ({ ...t, collectionIds: t.collectionIds.filter((x) => x !== id) })),
      })),
    [],
  );
  const addCategory = useCallback(
    (name: string) => setData((d) => (d.categories.includes(name) ? d : { ...d, categories: [...d.categories, name] })),
    [],
  );
  // porady z usuwanej kategorii trafiają do „Inne”
  const deleteCategory = useCallback(
    (name: string) =>
      setData((d) => ({
        ...d,
        categories: d.categories.filter((c) => c !== name),
        tips: d.tips.map((t) => (t.category === name ? { ...t, category: 'Inne' } : t)),
      })),
    [],
  );
  const addTool = useCallback(
    (name: string) => setData((d) => (d.tools.some((t) => t.toLowerCase() === name.toLowerCase()) ? d : { ...d, tools: [...d.tools, name] })),
    [],
  );
  // porady z usuwanego narzędzia dostają ogólne „AI”
  const deleteTool = useCallback(
    (name: string) =>
      setData((d) => ({
        ...d,
        tools: d.tools.filter((t) => t !== name),
        tips: d.tips.map((t) => (t.tool === name ? { ...t, tool: 'AI' } : t)),
      })),
    [],
  );
  /** Zostawia po jednej poradzie z każdego linku (tę z największym wkładem użytkownika), reszta znika. Zwraca liczbę usuniętych. */
  const removeDuplicates = useCallback(() => {
    const drop = new Set<string>();
    const score = (t: Tip) => (t.notes?.length ?? 0) + (t.photos?.length ?? 0) + (t.favorite ? 1 : 0) + (t.done ? 1 : 0) + (t.rating > 0 ? 1 : 0) + t.collectionIds.length;
    const byUrl = new Map<string, Tip[]>();
    for (const t of dataRef.current.tips) if (t.url) byUrl.set(t.url, [...(byUrl.get(t.url) ?? []), t]);
    for (const group of byUrl.values()) {
      if (group.length < 2) continue;
      const keep = [...group].sort((a, b) => score(b) - score(a) || a.createdAt - b.createdAt)[0];
      group.forEach((t) => t !== keep && drop.add(t.id));
    }
    if (drop.size > 0) setData((d) => ({ ...d, tips: d.tips.filter((t) => !drop.has(t.id)) }));
    return drop.size;
  }, []);
  const setSettings = useCallback((settings: Settings) => setData((d) => ({ ...d, settings })), []);

  return (
    <Ctx.Provider value={{ ready, data, addTip, updateTip, deleteTip, addCollection, deleteCollection, addCategory, deleteCategory, addTool, deleteTool, removeDuplicates, setSettings }}>{children}</Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore poza StoreProvider');
  return s;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
