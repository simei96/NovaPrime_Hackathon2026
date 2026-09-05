import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLOR_ORANGE = '#D96E32';

export default function CategoryItem({ categoria, active, onPress }) {
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      accessibilityLabel={`Ir a ${categoria.nombre}`}
      onPress={() => onPress && onPress(categoria)}
    >
      <View style={[styles.circle, { backgroundColor: categoria.color || '#fff' }, active && styles.circleActive]}>
        <MaterialCommunityIcons name={categoria.icono} size={26} color={COLOR_ORANGE} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{categoria.nombre}</Text>
      <View style={[styles.indicator, active && styles.indicatorActive]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', marginRight: 20, width: 66 },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLOR_ORANGE,
  },
  circleActive: { borderWidth: 3, borderColor: COLOR_ORANGE },
  label: { fontSize: 9, color: '#000', textAlign: 'center', fontFamily: 'Montserrat-Regular' },
  labelActive: { color: COLOR_ORANGE, fontFamily: 'Montserrat-Bold' },
  indicator: { height: 2, width: 22, borderRadius: 0.5, marginTop: 2, backgroundColor: '#d96e32' },
  indicatorActive: { backgroundColor: COLOR_ORANGE },
});
