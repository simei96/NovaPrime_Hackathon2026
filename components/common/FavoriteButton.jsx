import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

const COLOR_ORANGE = '#D96E32';

export default function FavoriteButton({ isFavorite, onPress, size = 18, style }) {
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      activeOpacity={0.8}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress && onPress();
      }}
    >
      <MaterialCommunityIcons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? COLOR_ORANGE : '#fff'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
