import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { StoreProvider, useStore } from './src/store';
import { C } from './src/theme';
import { Nav, Route } from './src/types';
import { extractUrl } from './src/meta';
import Home from './src/screens/Home';
import Edit from './src/screens/Edit';
import Detail from './src/screens/Detail';
import More from './src/screens/More';
import Import from './src/screens/Import';
import Sort from './src/screens/Sort';

function Root() {
  const { ready } = useStore();
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [stack, setStack] = useState<Route[]>([]);
  const [cat, setCat] = useState('all');
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const nav: Nav = {
    push: (r) => setStack((s) => [...s, r]),
    pop,
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
  };

  // Link lub zdjęcie udostępnione z przeglądarki, Pinteresta, Instagrama, galerii… otwiera nowy wpis
  useEffect(() => {
    if (!ready || !hasShareIntent) return;
    const text = shareIntent.webUrl ?? shareIntent.text ?? '';
    const url = extractUrl(text) ?? undefined;
    const photos = (shareIntent.files ?? [])
      .filter((f) => !f.mimeType || f.mimeType.startsWith('image/'))
      .map((f) => (f.path.startsWith('file://') || f.path.startsWith('content://') ? f.path : 'file://' + f.path));
    if (url || photos.length || text.trim()) {
      setStack([{ name: 'edit', url, photos, text: url ? undefined : text.trim() || undefined }]);
    }
    resetShareIntent();
  }, [ready, hasShareIntent, shareIntent, resetShareIntent]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (cat !== 'all') {
        setCat('all');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, cat, pop]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={C.blue} size="large" />
      </View>
    );
  }

  const top = stack[stack.length - 1];
  let body: React.ReactNode;
  if (!top) body = <Home nav={nav} cat={cat} setCat={setCat} />;
  else if (top.name === 'detail') body = <Detail key={top.id} nav={nav} id={top.id} />;
  else if (top.name === 'edit')
    body = <Edit key={(top.id ?? 'new') + (top.url ?? '') + (top.photos?.join() ?? '')} nav={nav} id={top.id} url={top.url} photos={top.photos} text={top.text} cat={top.cat} />;
  else if (top.name === 'more') body = <More nav={nav} />;
  else if (top.name === 'import') body = <Import nav={nav} />;
  else body = <Sort nav={nav} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>{body}</View>
      {!top && (
        <Pressable style={st.fab} onPress={() => nav.push({ name: 'edit', cat })} accessibilityRole="button" accessibilityLabel="Dodaj nowy wpis">
          <Ionicons name="add" size={36} color={C.text} />
        </Pressable>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
