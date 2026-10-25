export type Term = { name: string; desc: string };

export type Step = { text: string; prompt?: string };

export type Tip = {
  id: string;
  url?: string;
  author?: string;
  thumbnail?: string;
  title: string;
  summary: string;
  tool: string; // główne narzędzie AI, np. ChatGPT
  category: string;
  difficulty: 'łatwe' | 'średnie' | 'trudne';
  steps: Step[];
  prompts: string[];
  keyPoints?: string[]; // najważniejsze informacje z filmu
  terms?: Term[]; // hasła / komendy / ustawienia do użycia
  toolsNeeded: string[];
  tags: string[];
  sourceText: string;
  checked: number[]; // zrobione kroki
  favorite: boolean;
  done: boolean;
  rating: number;
  note: string;
  collectionIds: string[];
  createdAt: number;
};

export type Collection = { id: string; name: string; emoji: string };

export type Provider = 'gemini' | 'claude';

export type Settings = { provider: Provider; apiKey: string; model: string };

export type Data = { tips: Tip[]; collections: Collection[]; categories: string[]; settings: Settings };
