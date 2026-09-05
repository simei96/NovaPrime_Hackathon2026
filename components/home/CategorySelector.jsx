import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import CategoryItem from './CategoryItem';

export default function CategorySelector({ categories, selectedId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((categoria) => (
        <CategoryItem
          key={categoria.id}
          categoria={categoria}
          active={selectedId === categoria.id}
          onPress={onSelect}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, marginTop: 20, marginBottom: 8 },
});
