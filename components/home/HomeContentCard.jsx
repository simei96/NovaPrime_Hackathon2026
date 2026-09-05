import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FavoriteButton from '../common/FavoriteButton';
import SmartImage from '../common/SmartImage';

const COLOR_ORANGE = '#D96E32';

// Card genérica de contenido: reemplaza a "DestinationCard" para poder
// reutilizarse con cualquier colección normalizada por normalizeContentItem
// (Lugares, Restaurantes, Hoteles, Artesanias, Paquetes, RutasTuristicas...).
// Mantiene EXACTAMENTE el diseño visual del "peekCard" original.
export default function HomeContentCard({
  item,
  width,
  isFavorite,
  onPress,
  onToggleFavorite,
  ctaLabel = 'Ver más',
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      activeOpacity={0.9}
      onPress={() => onPress && onPress(item)}
    >
      <View style={styles.imageWrap}>
        <SmartImage uri={item.image} style={styles.image} backgroundColor="#d96e32" fallbackIconColor="#fff" />

        <FavoriteButton
          isFavorite={isFavorite}
          onPress={() => onToggleFavorite && onToggleFavorite(item)}
          style={styles.favBtn}
        />

        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.info} numberOfLines={1}>
        {item.description}
      </Text>

      <View style={styles.footerRow}>
        {item.metadata?.rating ? (
          <Text style={styles.rating}>★ {item.metadata.rating.toFixed(1)}</Text>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => onPress && onPress(item)}
        >
          <Text style={styles.btnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#d96e32',
    elevation: 2,
    shadowColor: '#d96e32',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  imageWrap: { width: '100%', height: 150, borderRadius: 10, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  favBtn: { position: 'absolute', top: 8, right: 8 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLOR_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#222', fontFamily: 'Montserrat-Bold', marginTop: 8 },
  info: { fontSize: 12, color: '#888', fontFamily: 'Montserrat-Regular', marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rating: { fontSize: 14, fontWeight: 'bold', color: COLOR_ORANGE, fontFamily: 'Montserrat-Bold' },
  btn: { backgroundColor: COLOR_ORANGE, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 11.5, fontFamily: 'Montserrat-Bold' },
});
