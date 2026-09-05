import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeSkeleton() {
  const PEEK_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.72);

  return (
    <View style={styles.container}>
      {/* header placeholder */}
      <View style={styles.headerRow}>
        <SkeletonLoader height={18} width={130} style={{ borderRadius: 6 }} />
        <View style={{ flex: 1 }} />
        <SkeletonLoader height={30} width={100} style={{ borderRadius: 6 }} />
      </View>

      {/* CTA card placeholder */}
      <View style={styles.ctaRow}>
        <View style={{ flex: 1.3, paddingRight: 10 }}>
          <SkeletonLoader height={18} width="90%" style={{ borderRadius: 6, marginBottom: 8 }} />
          <SkeletonLoader height={12} width="100%" style={{ borderRadius: 6, marginBottom: 6 }} />
          <SkeletonLoader height={12} width="80%" style={{ borderRadius: 6, marginBottom: 12 }} />
          <SkeletonLoader height={30} width={110} style={{ borderRadius: 16 }} />
        </View>
        <SkeletonLoader height={110} width={110} style={{ borderRadius: 14 }} />
      </View>

      {/* título placeholder */}
      <SkeletonLoader height={18} width={200} style={{ borderRadius: 6, marginTop: 18, marginBottom: 10 }} />

      {/* carrusel placeholder */}
      <View style={{ flexDirection: 'row' }}>
        <SkeletonLoader height={220} width={PEEK_CARD_WIDTH} style={{ borderRadius: 16, marginRight: 12 }} />
      </View>

      {/* categorías placeholder */}
      <View style={styles.categoriesRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ alignItems: 'center', marginRight: 14, marginBottom: 10 }}>
            <SkeletonLoader height={54} width={54} borderRadius={999} />
            <SkeletonLoader height={10} width={40} style={{ borderRadius: 6, marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* timeline placeholder */}
      <SkeletonLoader height={64} width={320} style={{ marginTop: 12, borderRadius: 12 }} />
      <SkeletonLoader height={64} width={320} style={{ marginTop: 10, borderRadius: 12 }} />

      {/* cultura del día placeholder */}
      <SkeletonLoader height={150} width={320} style={{ marginTop: 20, borderRadius: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 14, marginTop: 12 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, marginBottom: 8, justifyContent: 'center' },
});
