import React from 'react';
import { FlatList, View } from 'react-native';
import { useStore } from '../store';
import { colors, fonts } from '../theme';
import { Header, RecipeCard, Text } from '../components/ui';
import { Art } from '../components/Art';
import { Nav } from '../nav';

export default function List({ nav, filter, title }: { nav: Nav; filter: string; title: string }) {
  const { data } = useStore();
  const items = data.recipes.filter((r) => (filter === 'all' ? true : filter === 'favorites' ? r.favorite : filter.startsWith('cat:') ? r.category === filter.slice(4) : true));
  return (
    <View style={{ flex: 1 }}>
      <Header onBack={nav.pop} />
      <Text style={{ fontSize: 32, fontFamily: fonts.display, color: colors.ink, paddingHorizontal: 20, paddingTop: 16, lineHeight: 40 }}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Art kind="cloche" size={110} />
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 16 }}>Pusto.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 6 }}>
            <RecipeCard recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />
          </View>
        )}
      />
    </View>
  );
}
