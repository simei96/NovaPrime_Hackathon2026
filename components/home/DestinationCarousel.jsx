import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import HomeContentCard from './HomeContentCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DestinationCarousel({ items, favoritesMap, onPressItem, onToggleFavorite }) {
  const cardWidth = Math.round(SCREEN_WIDTH * 0.72);
  const cardGap = 14;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + cardGap}
      decelerationRate="fast"
      contentContainerStyle={styles.row}
    >
      {items.map((item, idx) => (
        <View
          key={item.id}
          style={{ marginRight: idx === items.length - 1 ? 0 : cardGap }}
        >
          <HomeContentCard
            item={item}
            width={cardWidth}
            isFavorite={!!favoritesMap[item.id]}
            onPress={onPressItem}
            onToggleFavorite={onToggleFavorite}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14 },
});
