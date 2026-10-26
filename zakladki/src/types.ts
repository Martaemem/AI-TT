export type Category = { id: string; name: string; color: string };

export type Item = {
  id: string;
  /** Link do strony; może go nie być, gdy to sama notatka lub zdjęcie. */
  url?: string;
  title: string;
  note: string;
  /** Zdjęcia zapisane w pamięci aplikacji (adresy file://). */
  photos: string[];
  /** Obrazek podglądu pobrany ze strony. */
  image?: string;
  /** Nazwa strony, np. „pinterest.com”. */
  site?: string;
  /** Kategorie wpisu – może ich być kilka. */
  cats: string[];
  createdAt: string;
  updatedAt: string;
  /** Id zdjęcia w galerii telefonu, gdy wpis pochodzi z importu albumu (zdjęcie nie jest kopiowane). */
  assetId?: string;
  /** Nazwa albumu, z którego zaimportowano zdjęcie. */
  album?: string;
};

export type Data = { items: Item[]; categories: Category[] };

export type Route =
  | { name: 'detail'; id: string }
  | { name: 'edit'; id?: string; url?: string; photos?: string[]; text?: string; cat?: string }
  | { name: 'more' }
  | { name: 'import' }
  | { name: 'sort' };

export type Nav = { push: (r: Route) => void; pop: () => void; replace: (r: Route) => void };
