import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { extractTikTokUrl } from './src/ai';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';
import { Nav, Route } from './src/nav';
import Home from './src/screens/Home';
import AddTip from './src/screens/AddTip';
import Detail from './src/screens/Detail';
import Steps from './src/screens/Steps';
import List from './src/screens/List';
import Tools from './src/screens/Tools';
import Prompts from './src/screens/Prompts';
import More from './src/screens/More';

type Tab = 'home' | 'tools' | 'prompts' | 'more';

function Root() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const nav: Nav = {
    push: (r) => setStack((s) => [...s, r]),
    pop,
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
  };

  // Link udostępniony z TikToka (Udostępnij → Porady AI) otwiera import i startuje go od razu
  useEffect(() => {
    if (!ready || !hasShareIntent) return;
    const url = extractTikTokUrl(shareIntent.webUrl ?? shareIntent.text ?? '');
    if (url) setStack([{ name: 'add', url, auto: true }]);
    resetShareIntent();
  }, [ready, hasShareIntent, shareIntent, resetShareIntent]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  if (!ready) return <View style={st.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  const top = stack[stack.length - 1];
  let body: React.ReactNode;
  if (top) {
    switch (top.name) {
      case 'detail': body = <Detail key={top.id} nav={nav} id={top.id} />; break;
      case 'steps': body = <Steps key={top.id} nav={nav} id={top.id} />; break;
      case 'add': body = <AddTip key={top.url} nav={nav} initialUrl={top.url} autoStart={top.auto} />; break;
      case 'list': body = <List nav={nav} collectionId={top.collectionId} title={top.title} />; break;
    }
  } else {
    body = tab === 'home' ? <Home nav={nav} /> : tab === 'tools' ? <Tools /> : tab === 'prompts' ? <Prompts /> : <More />;
  }

  const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'home', label: 'Porady', icon: 'bulb' },
    { id: 'tools', label: 'Narzędzia', icon: 'construct' },
    { id: 'prompts', label: 'Prompty', icon: 'chatbubble-ellipses' },
    { id: 'more', label: 'Więcej', icon: 'menu' },
  ];
  const TabBtn = ({ t }: { t: (typeof tabs)[number] }) => (
    <Pressable style={st.tab} onPress={() => { setStack([]); setTab(t.id); }}>
      <Ionicons name={t.icon} size={26} color={tab === t.id ? colors.primary : colors.muted} />
      <Text style={[st.tabLabel, tab === t.id && { color: colors.primary }]}>{t.label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>{body}</View>
      <View style={st.bar}>
        <TabBtn t={tabs[0]} />
        <TabBtn t={tabs[1]} />
        <Pressable style={st.fab} onPress={() => nav.push({ name: 'add' })}>
          <Ionicons name="add" size={38} color="#fff" />
        </Pressable>
        <TabBtn t={tabs[2]} />
        <TabBtn t={tabs[3]} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ShareIntentProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -26, marginHorizontal: 6, elevation: 6 },
});
