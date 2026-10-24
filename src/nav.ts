export type Route =
  | { name: 'detail'; id: string }
  | { name: 'steps'; id: string }
  | { name: 'add'; url?: string }
  | { name: 'list'; collectionId: string; title: string }; // collectionId: id zbioru, 'all' lub 'favorites'

export type Nav = { push: (r: Route) => void; pop: () => void; replace: (r: Route) => void };
