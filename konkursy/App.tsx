import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import {
  Contest,
  Entry,
  Filters,
  Mine,
  Status,
  daysLeft,
  fetchFeed,
  fmtDate,
  fmtZl,
  isNew,
  loadCachedFeed,
  loadFilters,
  loadMine,
  saveFilters,
  saveMine,
} from './src/data';
import { setupDailyReminder } from './src/notify';
import Shopping from './src/Shopping';
import { loadFound, sameContest, saveFound, searchNew } from './src/search';
import { C, F } from './src/theme';

const STATUS_LABEL: Record<Exclude<Status, ''>, string> = { sent: 'Wysłałam', later: 'Na później', no: 'Nie interesuje mnie' };
const STATUS_COLOR: Record<Exclude<Status, ''>, string> = { sent: C.green, later: C.yellow, no: C.red };
const BUY_OPTS: [Filters['buy'], string][] = [
  ['all', 'Wszystkie'],
  ['free', 'Bez zakupu'],
  ['buy', 'Z zakupem'],
  ['check', 'Do sprawdzenia'],
];
const ST_OPTS: [Filters['status'], string][] = [
  ['todo', 'Do zrobienia'],
  ['later', 'Na później'],
  ['sent', 'Wysłane'],
  ['no', 'Nieinteresujące'],
  ['all', 'Wszystkie'],
  ['hidden', 'Usunięte'],
];

function Logo() {
  return (
    <View style={{ width: 54, height: 48 }}>
      <View style={[styles.dot, { width: 29, height: 29, left: 0, top: 4, backgroundColor: C.blue }]} />
      <View style={[styles.dot, { width: 15, height: 15, left: 31, top: 17, backgroundColor: C.red }]} />
      <View style={[styles.dot, { width: 13, height: 13, left: 32, top: 33, backgroundColor: C.yellow }]} />
      <View style={[styles.dot, { width: 8, height: 8, left: 46, top: 10, backgroundColor: C.green }]} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function ContestCard({
  c,
  entry,
  onStatus,
  onSaveAnswer,
  onHide,
}: {
  c: Contest;
  entry?: Mine[string];
  onStatus: (id: string, s: Exclude<Status, ''>) => void;
  onSaveAnswer: (id: string, text: string) => void;
  onHide: (id: string, hide: boolean) => void;
}) {
  const status = entry?.status ?? '';
  const saved = entry?.answer ?? '';
  const [open, setOpen] = useState(!!saved);
  const [text, setText] = useState(saved);
  const [msg, setMsg] = useState('');
  useEffect(() => setText(saved), [saved]);
  const n = daysLeft(c.end);
  const leftText =
    n === null ? '' : n < 0 ? 'zakończony' : n === 0 ? 'ostatni dzień!' : n === 1 ? 'zostaje 1 dzień' : `zostaje ${n} dni`;
  const leftColor = n !== null && n >= 0 && n <= 3 ? C.red : C.muted;
  const stripe = status ? STATUS_COLOR[status] : C.blue;

  return (
    <View style={[styles.card, { borderLeftColor: stripe }, status === 'no' && { opacity: 0.6 }]}>
      <View style={styles.badges}>
        {isNew(c) && <Text style={[styles.badge, { backgroundColor: C.yellowSoft, color: C.yellowInk }]}>Nowy</Text>}
        {c.purchase === true ? (
          <Text style={[styles.badge, { backgroundColor: C.blueSoft, color: C.blueInk }]}>Z zakupem</Text>
        ) : c.purchase === false ? (
          <Text style={[styles.badge, { backgroundColor: C.greenSoft, color: C.greenInk }]}>Bez zakupu</Text>
        ) : (
          <Text style={[styles.badge, { backgroundColor: C.yellowSoft, color: C.yellowInk }]}>Do sprawdzenia</Text>
        )}
        {c.verified && <Text style={[styles.badge, { backgroundColor: C.greenSoft, color: C.greenInk }]}>✓ Regulamin sprawdzony</Text>}
      </View>
      <Pressable onPress={() => Linking.openURL(c.url).catch(() => setMsg('Nie udało się otworzyć linku.'))} accessibilityRole="link">
        <Text style={styles.title}>
          {c.title} <Ionicons name="open-outline" size={18} color={C.blueInk} />
        </Text>
      </Pressable>
      {!!c.task && <Text style={styles.task}>{c.task}</Text>}
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>NAGRODA</Text>
          <Text style={styles.factValue}>{c.prizes || 'wg regulaminu'}</Text>
        </View>
        <View style={styles.factRow}>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>START</Text>
            <Text style={styles.factValue}>{fmtDate(c.start)}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>KONIEC</Text>
            <Text style={styles.factValue}>{fmtDate(c.end)}</Text>
            {!!leftText && <Text style={[styles.left, { color: leftColor }]}>{leftText}</Text>}
          </View>
        </View>
        {!!c.organizer && (
          <View style={styles.fact}>
            <Text style={styles.factLabel}>ORGANIZATOR</Text>
            <Text style={styles.factValue}>{c.organizer}</Text>
          </View>
        )}
      </View>
      {c.purchase && (c.toBuy || (c.shops && c.shops.length) || c.minSpend) ? (
        <View style={styles.buyBox}>
          <Ionicons name="cart-outline" size={22} color={C.blueInk} />
          <View style={{ flex: 1, gap: 2 }}>
            {!!c.toBuy && <Text style={styles.factValue}>{c.toBuy}</Text>}
            <Text style={styles.small}>
              {c.shops && c.shops.length ? c.shops.join(', ') : entry?.shop ? `${entry.shop} (Twój wybór)` : 'Dowolny sklep'}
              {c.minSpend ? ` · za min. ${fmtZl(c.minSpend)}` : ''}
              {entry?.bought ? ' · kupione ✓' : ''}
            </Text>
          </View>
        </View>
      ) : null}
      {!!c.note && <Text style={styles.note}>{c.note}</Text>}
      {!!c.rulesUrl && (
        <Pressable onPress={() => Linking.openURL(c.rulesUrl!).catch(() => setMsg('Nie udało się otworzyć regulaminu.'))} style={styles.rules}>
          <Ionicons name="document-text-outline" size={18} color={C.blueInk} />
          <Text style={styles.rulesText}>Regulamin</Text>
        </Pressable>
      )}
      {entry?.hidden && (
        <Pressable onPress={() => onHide(c.id, false)} style={styles.restore}>
          <Ionicons name="arrow-undo-outline" size={18} color="#FFFFFF" />
          <Text style={styles.restoreText}>Przywróć na listę</Text>
        </Pressable>
      )}
      <View style={styles.acts}>
        {(Object.keys(STATUS_LABEL) as Exclude<Status, ''>[]).map((s) => {
          const on = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => onStatus(c.id, s)}
              style={[styles.st, on && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.stText, on && { color: s === 'later' ? C.text : '#FFFFFF', fontFamily: F.heavy }]}>{STATUS_LABEL[s]}</Text>
            </Pressable>
          );
        })}
        {!entry?.hidden && (
          <Pressable onPress={() => onHide(c.id, true)} style={styles.del} accessibilityRole="button" accessibilityLabel="Usuń z listy">
            <Ionicons name="trash-outline" size={20} color={C.redInk} />
            <Text style={styles.delText}>Usuń</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.ansToggle}>
        <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={20} color={C.blueInk} />
        <Text style={styles.ansToggleText}>Moja odpowiedź{saved ? ' ✓ zapisana' : ''}</Text>
      </Pressable>
      {open && (
        <View>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setMsg('');
            }}
            placeholder="Wpisz tu swoją odpowiedź konkursową…"
            placeholderTextColor={C.muted}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />
          <View style={styles.ansBar}>
            <Pressable
              style={styles.btn}
              onPress={() => {
                onSaveAnswer(c.id, text);
                setMsg('Zapisano');
              }}
            >
              <Text style={styles.btnText}>Zapisz odpowiedź</Text>
            </Pressable>
            <Pressable
              style={styles.btnGhost}
              onPress={async () => {
                await Clipboard.setStringAsync(text);
                setMsg('Skopiowano');
              }}
            >
              <Text style={styles.btnGhostText}>Kopiuj</Text>
            </Pressable>
            <Text style={styles.small}>
              {text.length} znaków{msg ? ' · ' + msg : text !== saved ? ' · niezapisane' : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function Root() {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [feedList, setContests] = useState<Contest[]>([]);
  const [found, setFound] = useState<Contest[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  // Lista z porannej aktualizacji + konkursy znalezione przyciskiem „Szukaj nowych”, bez powtórzeń
  const contests = useMemo(
    () => [...feedList, ...found.filter((f) => !feedList.some((c) => sameContest(c, f)))],
    [feedList, found],
  );
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [mine, setMine] = useState<Mine>({});
  const [filters, setFilters] = useState<Filters>({ buy: 'all', status: 'todo' });
  const [query, setQuery] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'list' | 'shop'>('list');
  const mineRef = useRef<Mine>({});

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const feed = await fetchFeed();
      setContests(feed.contests);
      setUpdatedAt(feed.updatedAt);
      setError('');
    } catch {
      setError('Nie udało się pobrać nowej listy. Pokazuję ostatnio zapisaną. Sprawdź internet i przeciągnij w dół, żeby spróbować ponownie.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [cached, m, f, fd] = await Promise.all([loadCachedFeed(), loadMine(), loadFilters(), loadFound()]);
      setFound(fd);
      if (cached) {
        setContests(cached.contests);
        setUpdatedAt(cached.updatedAt);
        setLoading(false);
      }
      mineRef.current = m;
      setMine(m);
      if (f) setFilters(f);
      refresh();
      setupDailyReminder();
    })();
  }, [refresh]);

  const update = (next: Mine) => {
    mineRef.current = next;
    setMine(next);
    saveMine(next);
  };
  const onStatus = (id: string, s: Exclude<Status, ''>) => {
    const cur = mineRef.current[id] ?? { status: '' as Status, answer: '' };
    update({ ...mineRef.current, [id]: { ...cur, status: cur.status === s ? '' : s, updatedAt: new Date().toISOString() } });
  };
  const onSaveAnswer = (id: string, text: string) => {
    const cur = mineRef.current[id] ?? { status: '' as Status, answer: '' };
    update({ ...mineRef.current, [id]: { ...cur, answer: text, updatedAt: new Date().toISOString() } });
  };
  const onPatch = (id: string, patch: Partial<Entry>) => {
    const cur = mineRef.current[id] ?? { status: '' as Status, answer: '' };
    update({ ...mineRef.current, [id]: { ...cur, ...patch, updatedAt: new Date().toISOString() } });
  };
  // Gdy poranna lista zawiera konkurs znaleziony wcześniej ręcznie, przenieś status i odpowiedź i usuń duplikat
  useEffect(() => {
    if (!feedList.length || !found.length) return;
    const dupes = found.filter((f) => feedList.some((c) => sameContest(c, f)));
    if (!dupes.length) return;
    let next = mineRef.current;
    dupes.forEach((f) => {
      const target = feedList.find((c) => sameContest(c, f));
      if (target && next[f.id] && !next[target.id]) next = { ...next, [target.id]: next[f.id] };
    });
    if (next !== mineRef.current) update(next);
    const rest = found.filter((f) => !dupes.includes(f));
    setFound(rest);
    saveFound(rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedList, found]);

  const runSearch = async () => {
    if (searching) return;
    setSearching(true);
    setSearchMsg('');
    try {
      const { added, pagesOk } = await searchNew(contests);
      if (!pagesOk) {
        setSearchMsg('Nie udało się połączyć ze stroną z konkursami. Sprawdź internet i spróbuj ponownie.');
        return;
      }
      if (added.length) {
        const next = [...found, ...added];
        setFound(next);
        saveFound(next);
        setF({ ...filters, status: 'todo' });
        setSearchMsg(
          `Dodano ${added.length} ${added.length === 1 ? 'nowy konkurs' : added.length < 5 ? 'nowe konkursy' : 'nowych konkursów'} z plakietką „Nowy”.`,
        );
      } else {
        setSearchMsg('Brak nowych konkursów. Wszystko, co znalazłam, jest już na liście.');
      }
    } catch {
      setSearchMsg('Wyszukiwanie się nie udało. Spróbuj ponownie za chwilę.');
    } finally {
      setSearching(false);
    }
  };

  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const setHidden = (ids: string[], hide: boolean) => {
    let next = { ...mineRef.current };
    ids.forEach((id) => {
      const cur = next[id] ?? { status: '' as Status, answer: '' };
      next = { ...next, [id]: { ...cur, hidden: hide, updatedAt: new Date().toISOString() } };
    });
    update(next);
  };
  const onHide = (id: string, hide: boolean) => {
    setHidden([id], hide);
    if (hide) {
      const t = contests.find((c) => c.id === id)?.title ?? 'konkurs';
      setUndo({ ids: [id], label: `Usunięto „${t}”` });
    } else setUndo(null);
  };
  const hideMany = (ids: string[]) => {
    if (!ids.length) return;
    Alert.alert('Usunąć z listy?', `Usunąć ${ids.length} konkursów widocznych teraz na liście? Znajdziesz je w filtrze „Usunięte”.`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          setHidden(ids, true);
          setUndo({ ids, label: `Usunięto ${ids.length} konkursów` });
        },
      },
    ]);
  };

  const setF = (f: Filters) => {
    setFilters(f);
    saveFilters(f);
  };

  // Usunięte przez Martę nie liczą się nigdzie poza widokiem „Usunięte”
  const active = useMemo(
    () => contests.filter((c) => { const n = daysLeft(c.end); return (n === null || n >= 0) && !mine[c.id]?.hidden; }),
    [contests, mine],
  );
  const counts = useMemo(() => {
    const k = { todo: 0, later: 0, sent: 0, no: 0 };
    active.forEach((c) => {
      const s = mine[c.id]?.status || 'todo';
      k[s as keyof typeof k]++;
    });
    return k;
  }, [active, mine]);
  const newCount = useMemo(() => active.filter(isNew).length, [active]);
  const hiddenCount = useMemo(() => contests.filter((c) => mine[c.id]?.hidden).length, [contests, mine]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests
      .filter((c) => {
        const st = mine[c.id]?.status || '';
        const hidden = !!mine[c.id]?.hidden;
        const n = daysLeft(c.end);
        if (filters.status === 'hidden') {
          if (!hidden) return false;
        } else {
          if (hidden) return false;
          if (!showOld && n !== null && n < 0) return false;
          if (filters.status === 'todo' && st) return false;
          if (filters.status !== 'todo' && filters.status !== 'all' && st !== filters.status) return false;
        }
        if (filters.buy === 'free' && c.purchase !== false) return false;
        if (filters.buy === 'buy' && c.purchase !== true) return false;
        if (filters.buy === 'check' && c.purchase != null) return false;
        if (q && !`${c.title} ${c.organizer ?? ''} ${c.task ?? ''} ${c.prizes ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a.end || '9999').localeCompare(b.end || '9999'));
  }, [contests, mine, filters, query, showOld]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator color={C.blue} size="large" />
      </View>
    );
  }

  const updText = updatedAt
    ? 'Aktualizacja: ' +
      new Date(updatedAt).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : 'Lista aktualizuje się codziennie rano.';

  const top = (
    <View style={{ gap: 14 }}>
      <View style={styles.header}>
        <Logo />
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Konkursownik</Text>
          <Text style={styles.small}>{updText}</Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {(
          [
            ['list', 'Konkursy', 'trophy-outline'],
            ['shop', 'Lista zakupów', 'cart-outline'],
          ] as const
        ).map(([k, l, icon]) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={[styles.tab, on && styles.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={icon} size={20} color={on ? '#FFFFFF' : C.text} />
              <Text style={[styles.tabText, on && { color: '#FFFFFF' }]}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  if (tab === 'shop') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[C.blue, C.red, C.yellow, C.green]} />}
        >
          {top}
          <Shopping contests={contests} mine={mine} onPatch={onPatch} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      {top}
      <View style={styles.stats}>
        <Text style={styles.stat}>{active.length} aktywnych</Text>
        <Text style={styles.stat}>{counts.todo} do zrobienia</Text>
        <Text style={styles.stat}>{counts.later} na później</Text>
        <Text style={styles.stat}>{counts.sent} wysłanych</Text>
        {newCount > 0 && <Text style={[styles.stat, { backgroundColor: C.yellowSoft }]}>{newCount} nowych</Text>}
      </View>
      <Pressable onPress={runSearch} disabled={searching} style={[styles.searchBtn, searching && { opacity: 0.7 }]} accessibilityRole="button">
        {searching ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="search" size={22} color="#FFFFFF" />}
        <Text style={styles.searchBtnText}>{searching ? 'Szukam nowych konkursów…' : 'Szukaj nowych konkursów'}</Text>
      </Pressable>
      {!!searchMsg && <Text style={styles.searchMsg}>{searchMsg}</Text>}
      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Zakup</Text>
        <View style={styles.chips}>
          {BUY_OPTS.map(([k, l]) => (
            <Chip key={k} label={l} active={filters.buy === k} onPress={() => setF({ ...filters, buy: k })} />
          ))}
        </View>
        <Text style={styles.panelLabel}>Status</Text>
        <View style={styles.chips}>
          {ST_OPTS.map(([k, l]) => (
            <Chip key={k} label={l} active={filters.status === k} onPress={() => setF({ ...filters, status: k })} />
          ))}
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj: sklep, marka, nagroda…"
          placeholderTextColor={C.muted}
          style={styles.search}
        />
        <View style={styles.switchRow}>
          <Switch value={showOld} onValueChange={setShowOld} trackColor={{ true: C.blue, false: C.line }} thumbColor="#FFFFFF" />
          <Text style={styles.small}>Pokaż zakończone</Text>
        </View>
        {filters.status !== 'hidden' && rows.length > 0 && (filters.status !== 'todo' || filters.buy !== 'all' || !!query.trim() || showOld) && (
          <Pressable onPress={() => hideMany(rows.map((c) => c.id))} style={styles.bulk} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={C.redInk} />
            <Text style={styles.bulkText}>Usuń wszystkie widoczne ({rows.length})</Text>
          </Pressable>
        )}
        {filters.status === 'hidden' && rows.length > 0 && (
          <Pressable
            onPress={() => {
              setHidden(
                rows.map((c) => c.id),
                false,
              );
              setUndo(null);
            }}
            style={styles.bulk}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-undo-outline" size={18} color={C.blueInk} />
            <Text style={[styles.bulkText, { color: C.blueInk }]}>Przywróć wszystkie ({rows.length})</Text>
          </Pressable>
        )}
        {hiddenCount > 0 && filters.status !== 'hidden' && <Text style={styles.small}>Usunięte: {hiddenCount} (filtr „Usunięte” pozwala je przywrócić)</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[C.blue, C.red, C.yellow, C.green]} />}
        renderItem={({ item }) => <ContestCard c={item} entry={mine[item.id]} onStatus={onStatus} onSaveAnswer={onSaveAnswer} onHide={onHide} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.blue} size="large" />
              <Text style={styles.small}>Pobieram konkursy…</Text>
            </View>
          ) : (
            <Text style={styles.empty}>
              {contests.length
                ? 'Brak konkursów dla tych filtrów. Zmień zakup lub status albo wyczyść wyszukiwanie.'
                : 'Na razie nie ma tu konkursów. Przeciągnij w dół, żeby odświeżyć.'}
            </Text>
          )
        }
        ListFooterComponent={
          <Text style={[styles.small, { marginTop: 10 }]}>
            Pomijam konkursy z publicznym komentowaniem na Facebooku i Instagramie. Przed zgłoszeniem sprawdź regulamin u organizatora.
          </Text>
        }
      />
      {undo && (
        <View style={styles.undo}>
          <Text style={styles.undoText} numberOfLines={2}>
            {undo.label}
          </Text>
          <Pressable
            onPress={() => {
              setHidden(undo.ids, false);
              setUndo(null);
            }}
            style={styles.undoBtn}
            accessibilityRole="button"
          >
            <Text style={styles.undoBtnText}>Cofnij</Text>
          </Pressable>
          <Pressable onPress={() => setUndo(null)} accessibilityLabel="Zamknij">
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  rules: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  rulesText: { fontFamily: F.heavy, fontSize: 15, color: C.blueInk, textDecorationLine: 'underline' },
  restore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.blue, borderRadius: 10, paddingVertical: 10 },
  restoreText: { fontFamily: F.heavy, fontSize: 15, color: '#FFFFFF' },
  del: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  delText: { fontFamily: F.bold, fontSize: 16, color: C.redInk },
  bulk: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingVertical: 10, marginTop: 2 },
  bulkText: { fontFamily: F.heavy, fontSize: 15, color: C.redInk },
  undo: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 6,
  },
  undoText: { flex: 1, fontFamily: F.bold, fontSize: 15, color: '#FFFFFF' },
  undoBtn: { backgroundColor: C.yellow, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  undoBtnText: { fontFamily: F.heavy, fontSize: 15, color: C.text },
  dot: { position: 'absolute', borderRadius: 999 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  h1: { fontFamily: F.heavy, fontSize: 30, color: C.text, lineHeight: 36 },
  small: { fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  searchBtnText: { fontFamily: F.heavy, fontSize: 17, color: '#FFFFFF' },
  searchMsg: { fontFamily: F.bold, fontSize: 15, color: C.text, backgroundColor: C.greenSoft, padding: 10, borderRadius: 10, overflow: 'hidden' },
  tabs: { flexDirection: 'row', gap: 8, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  tabOn: { backgroundColor: C.blue },
  tabText: { fontFamily: F.heavy, fontSize: 16, color: C.text },
  buyBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: C.blueSoft, borderRadius: 10, padding: 10 },
  stat: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  error: { fontFamily: F.bold, fontSize: 15, color: C.text, backgroundColor: '#FCE8E6', padding: 10, borderRadius: 10, overflow: 'hidden' },
  panel: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, gap: 8 },
  panelLabel: { fontFamily: F.heavy, fontSize: 14, color: C.muted, letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontFamily: F.bold, fontSize: 16, color: C.text },
  chipTextOn: { color: '#FFFFFF', fontFamily: F.heavy },
  search: {
    fontFamily: F.body,
    fontSize: 17,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.bg,
    marginTop: 4,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, borderLeftWidth: 6, padding: 16, gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { fontFamily: F.heavy, fontSize: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  title: { fontFamily: F.heavy, fontSize: 21, lineHeight: 27, color: C.blueInk, textDecorationLine: 'underline' },
  task: { fontFamily: F.body, fontSize: 17, lineHeight: 25, color: C.text },
  facts: { gap: 8 },
  factRow: { flexDirection: 'row', gap: 18 },
  fact: { flexShrink: 1 },
  factLabel: { fontFamily: F.heavy, fontSize: 12, color: C.muted, letterSpacing: 0.6 },
  factValue: { fontFamily: F.bold, fontSize: 17, color: C.text },
  left: { fontFamily: F.heavy, fontSize: 15 },
  note: { fontFamily: F.bold, fontSize: 15, color: C.text, backgroundColor: C.yellowSoft, padding: 8, borderRadius: 8, overflow: 'hidden' },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  st: { borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  stText: { fontFamily: F.bold, fontSize: 16, color: C.text },
  ansToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed' },
  ansToggleText: { fontFamily: F.heavy, fontSize: 17, color: C.blueInk },
  input: {
    fontFamily: F.body,
    fontSize: 17,
    lineHeight: 24,
    color: C.text,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    padding: 10,
    backgroundColor: C.bg,
    marginTop: 8,
  },
  ansBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  btn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { fontFamily: F.heavy, fontSize: 16, color: '#FFFFFF' },
  btnGhost: { borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnGhostText: { fontFamily: F.heavy, fontSize: 16, color: C.blueInk },
  empty: {
    fontFamily: F.bold,
    fontSize: 17,
    color: C.muted,
    textAlign: 'center',
    padding: 28,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
});
