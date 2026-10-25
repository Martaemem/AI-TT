export type Route =
  | { name: 'detail'; id: string }
  | { name: 'cook'; id: string; servings: number }
  | { name: 'edit'; id?: string; draft?: boolean }
  | { name: 'add'; url?: string; auto?: boolean }
  | { name: 'list'; filter: string; title: string }; // filter: 'all' | 'favorites' | 'cat:Nazwa'

export type Nav = { push: (r: Route) => void; pop: () => void; replace: (r: Route) => void };
