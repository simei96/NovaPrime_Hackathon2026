import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SmartImage from '../common/SmartImage';

const COLOR_ORANGE = '#D96E32';

// NOTA: en el código original estas dos etiquetas usaban color "#0000",
// que en RN es RGBA con alpha 0 (texto invisible). Se corrige aquí a un
// gris oscuro legible ("#222"), asumiendo que era un error de tipeo
// ("#000" con un 0 de más) y no una decisión de diseño de ocultar el texto.
const COLOR_TEXT_DARK = '#222';

export default function PromotionalCard({ promotion, onPress }) {
  const titulo = promotion?.titulo || 'Vive una experiencia única';
  const descripcion = promotion?.descripcion || 'Descubre tours y paquetes pensados para ti.';
  const cta = promotion?.cta || 'Ver oferta';

  return (
    <View style={styles.ctaCard}>
      <View style={styles.ctaLeft}>
        <Text style={styles.ctaTitle} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={styles.ctaDesc} numberOfLines={3}>
          {descripcion}
        </Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.ctaBtn} onPress={onPress}>
          <Text style={styles.ctaBtnText}>{cta}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.ctaRight}>
        <SmartImage
          uri={promotion?.imagenURL}
          style={styles.ctaImage}
          backgroundColor="#d96e32"
          fallbackIconColor="#fff"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d96e32',
    elevation: 2,
    shadowColor: '#d96e32',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  ctaLeft: { flex: 1, paddingRight: 12 },
  ctaTitle: {
    fontSize: 19,
    color: COLOR_TEXT_DARK,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 12.5,
    color: COLOR_TEXT_DARK,
    fontFamily: 'Montserrat-Regular',
    marginBottom: 12,
    lineHeight: 17,
  },
  ctaBtn: {
    backgroundColor: COLOR_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 12.5, fontFamily: 'Montserrat-Bold' },
  ctaRight: { width: 100, height: 100, borderRadius: 14, overflow: 'hidden' },
  ctaImage: { width: '100%', height: '100%' },
});
