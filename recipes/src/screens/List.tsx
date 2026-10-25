import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { Header, RecipeCard } from '../components/ui';
import { Nav } from '../nav';

export default function List({ nav, filter, title }: { nav: Nav; filter: string; title: string }) {
  const { data } = useStore();
  const items = data.recipes.filter((r) => (filter === 'all' ? true : filter === 'favorites' ? r.favorite : filter.startsWith('cat:') ? r.category === filter.slice(4) : true));
  return (
    <View style={{ flex: 1 }}>
      <Header onBack={nav.pop} />
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, paddingHorizontal: 20, marginBottom: 12 }}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Pusto.</Text>}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
            <RecipeCard recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />
          </View>
        )}
      />
    </View>
  );
}
