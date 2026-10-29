import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contest, Entry, Mine, daysLeft, fmtDate, fmtZl, loadCustomShops, saveCustomShops, shopKey } from './data';
import { C, F } from './theme';

/** Sklepy podpowiadane zawsze, nawet gdy dziś nie ma w nich konkursu. */
const COMMON = ['Biedronka', 'Lidl', 'Żabka', 'Dino', 'Kaufland', 'Auchan', 'Carrefour', 'Rossmann', 'Hebe', 'Aldi', 'Netto', 'Stokrotka'];

type Props = {
  contests: Contest[];
  mine: Mine;
  onPatch: (id: string, patch: Partial<Entry>) => void;
};

export default function Shopping({ contests, mine, onPatch }: Props) {
  const [shop, setShop] = useState<string>('');
  const [typed, setTyped] = useState('');
  const [custom, setCustom] = useState<string[]>([]);
  useEffect(() => {
    loadCustomShops().then(setCustom);
  }, []);

  // Konkursy z zakupem, które wciąż trwają i nie są odrzucone ani wysłane
  const relevant = useMemo(
    () =>
      contests.filter((c) => {
        if (c.purchase !== true || mine[c.id]?.hidden) return false;
        const n = daysLeft(c.end);
        if (n !== null && n < 0) return false;
        const st = mine[c.id]?.status;
        return st !== 'no' && st !== 'sent';
      }),
    [contests, mine],
  );

  const shopsOf = (c: Contest): string[] => {
    if (c.shops && c.shops.length) return c.shops;
    const own = mine[c.id]?.shop;
    return own ? [own] : [];
  };

  // Lista sklepów: z konkursów + własne wpisane + popularne, z liczbą rzeczy do kupienia
  const shopList = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    const add = (name: string, n: number) => {
      const k = shopKey(name);
      if (!k) return;
      const cur = map.get(k);
      if (cur) cur.count += n;
      else map.set(k, { name, count: n });
    };
    relevant.forEach((c) => shopsOf(c).forEach((s) => add(s, mine[c.id]?.bought ? 0 : 1)));
    [...custom, ...COMMON].forEach((s) => add(s, 0));
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevant, mine, custom]);

  const anyStore = relevant.filter((c) => !c.shops || !c.shops.length);
  const unassigned = anyStore.filter((c) => !mine[c.id]?.shop);

  const choose = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setShop(clean);
    setTyped('');
    if (!shopList.some((s) => shopKey(s.name) === shopKey(clean))) {
      const next = [...custom, clean];
      setCustom(next);
      saveCustomShops(next);
    }
  };

  if (!shop) {
    return (
      <View style={{ gap: 14 }}>
        <View style={styles.panel}>
          <Text style={styles.h2}>W którym sklepie robisz zakupy?</Text>
          <Text style={styles.small}>Wybierz sklep, a zobaczysz, co kupić do konkursów i za ile.</Text>
          <View style={styles.chips}>
            {shopList.map((s) => (
              <Pressable key={s.name} onPress={() => choose(s.name)} style={[styles.shopChip, s.count > 0 && styles.shopChipHas]}>
                <Text style={[styles.shopChipText, s.count > 0 && { color: '#FFFFFF' }]}>{s.name}</Text>
                {s.count > 0 && <Text style={styles.count}>{s.count}</Text>}
              </Pressable>
            ))}
          </View>
          <View style={styles.typeRow}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={() => choose(typed)}
              placeholder="Wpisz inny sklep…"
              placeholderTextColor={C.muted}
              style={styles.input}
              returnKeyType="go"
            />
            <Pressable style={styles.btn} onPress={() => choose(typed)}>
              <Text style={styles.btnText}>Pokaż</Text>
            </Pressable>
          </View>
        </View>
        {unassigned.length > 0 && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={22} color={C.blueInk} />
            <Text style={[styles.small, { flex: 1, color: C.text }]}>
              {unassigned.length} {unassigned.length === 1 ? 'konkurs pozwala' : 'konkursów pozwala'} kupić w dowolnym sklepie. Po wybraniu
              sklepu możesz je dopisać do jego listy.
            </Text>
          </View>
        )}
      </View>
    );
  }

  const k = shopKey(shop);
  const items = relevant
    .filter((c) => shopsOf(c).some((s) => shopKey(s) === k))
    .sort((a, b) => Number(!!mine[a.id]?.bought) - Number(!!mine[b.id]?.bought) || (a.end || '9').localeCompare(b.end || '9'));
  const left = items.filter((c) => !mine[c.id]?.bought);
  const sum = left.reduce((s, c) => s + (c.minSpend ?? 0), 0);
  const canAdd = unassigned;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.shopHead}>
        <Pressable onPress={() => setShop('')} style={styles.back} accessibilityRole="button" accessibilityLabel="Wróć do wyboru sklepu">
          <Ionicons name="arrow-back" size={24} color={C.blueInk} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h2}>{shop}</Text>
          <Text style={styles.small}>
            {left.length ? `Do kupienia: ${left.length}` : 'Wszystko kupione'}
            {sum > 0 ? ` · razem minimum ${fmtZl(sum)}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.receipt}>
        <Ionicons name="receipt-outline" size={20} color={C.yellowInk} />
        <Text style={[styles.small, { color: C.text, flex: 1 }]}>Zachowaj paragony! Przy kwocie minimalnej kupuj na jednym paragonie.</Text>
      </View>

      {items.length === 0 && (
        <Text style={styles.empty}>W tym sklepie nie ma teraz nic do kupienia do konkursów.{canAdd.length ? ' Możesz dopisać konkursy poniżej.' : ''}</Text>
      )}

      {items.map((c) => {
        const bought = !!mine[c.id]?.bought;
        const n = daysLeft(c.end);
        const own = !c.shops || !c.shops.length;
        return (
          <View key={c.id} style={[styles.item, bought && { opacity: 0.55 }]}>
            <Pressable
              onPress={() => onPatch(c.id, { bought: !bought })}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: bought }}
            >
              <Ionicons name={bought ? 'checkbox' : 'square-outline'} size={30} color={bought ? C.green : C.muted} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.what, bought && { textDecorationLine: 'line-through' }]}>{c.toBuy || c.task}</Text>
                {c.minSpend ? <Text style={styles.amount}>za min. {fmtZl(c.minSpend)}</Text> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(c.url).catch(() => {})}>
              <Text style={styles.contest}>{c.title}</Text>
            </Pressable>
            <Text style={[styles.small, n !== null && n <= 3 && { color: C.redInk, fontFamily: F.heavy }]}>
              Koniec: {fmtDate(c.end)}
              {n !== null ? (n === 0 ? ' · ostatni dzień!' : n === 1 ? ' · zostaje 1 dzień' : ` · zostaje ${n} dni`) : ''}
            </Text>
            {c.shops && c.shops.length > 1 && <Text style={styles.small}>Też w: {c.shops.filter((s) => shopKey(s) !== k).join(', ')}</Text>}
            {own && (
              <Pressable onPress={() => onPatch(c.id, { shop: '' })}>
                <Text style={styles.link}>Usuń z listy {shop}</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {canAdd.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={styles.h3}>Do kupienia w dowolnym sklepie</Text>
          <Text style={styles.small}>Dopisz do listy {shop} to, co tam kupisz.</Text>
          {canAdd.map((c) => (
            <View key={c.id} style={styles.suggest}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.whatSmall}>{c.toBuy || c.task}</Text>
                <Text style={styles.small}>
                  {c.title} · do {fmtDate(c.end)}
                  {c.minSpend ? ` · min. ${fmtZl(c.minSpend)}` : ''}
                </Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => onPatch(c.id, { shop })} accessibilityLabel={`Dopisz do listy ${shop}`}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  h2: { fontFamily: F.heavy, fontSize: 24, color: C.text, lineHeight: 30 },
  h3: { fontFamily: F.heavy, fontSize: 19, color: C.text, marginTop: 6 },
  small: { fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.card,
  },
  shopChipHas: { backgroundColor: C.blue, borderColor: C.blue },
  shopChipText: { fontFamily: F.heavy, fontSize: 17, color: C.text },
  count: {
    fontFamily: F.heavy,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.yellow,
    borderRadius: 999,
    minWidth: 24,
    textAlign: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  typeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    fontFamily: F.body,
    fontSize: 17,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  btn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  btnText: { fontFamily: F.heavy, fontSize: 16, color: '#FFFFFF' },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: C.blueSoft, borderRadius: 12, padding: 12 },
  shopHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { padding: 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  receipt: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.yellowSoft, borderRadius: 10, padding: 10 },
  empty: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.muted,
    textAlign: 'center',
    padding: 22,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
  },
  item: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, borderLeftWidth: 6, borderLeftColor: C.green, padding: 14, gap: 6 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  what: { fontFamily: F.heavy, fontSize: 19, lineHeight: 25, color: C.text },
  whatSmall: { fontFamily: F.heavy, fontSize: 17, lineHeight: 23, color: C.text },
  amount: { fontFamily: F.heavy, fontSize: 16, color: C.blueInk },
  contest: { fontFamily: F.bold, fontSize: 15, color: C.blueInk, textDecorationLine: 'underline', marginLeft: 40 },
  link: { fontFamily: F.bold, fontSize: 15, color: C.redInk, marginLeft: 40 },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    padding: 12,
  },
  addBtn: { backgroundColor: C.green, borderRadius: 999, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
