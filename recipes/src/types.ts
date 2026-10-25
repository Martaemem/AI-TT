export type Ingredient = { amount?: number; unit?: string; name: string };

export type Step = { text: string; minutes?: number };

export type Recipe = {
  id: string;
  title: string;
  url?: string;
  author?: string;
  image?: string;
  servings: number;
  time?: number; // minuty
  category: string;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  note: string;
  sourceText: string;
  favorite: boolean;
  rating: number;
  cookedCount: number;
  createdAt: number;
};

export type ShoppingItem = {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  checked: boolean;
  recipeTitle?: string;
  key?: string;
  /** z jakich przepisów pochodzi pozycja (ilości w oryginalnych jednostkach) */
  sources?: { title: string; amount?: number; unit?: string }[];
};

export type PlanEntry = { id: string; date: string; recipeId: string }; // date: YYYY-MM-DD

export type Provider = 'gemini' | 'groq' | 'claude';

export type Settings = { provider: Provider; apiKey: string; model: string };

export type Data = {
  recipes: Recipe[];
  shopping: ShoppingItem[];
  plan: PlanEntry[];
  categories: string[];
  settings: Settings;
};
