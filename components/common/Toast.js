import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Toast simple y controlado por el padre: se le pasa visible/message/type
// y se autooculta solo, avisando al padre mediante onHide para que
// resetee su estado. Pensado para errores no bloqueantes (red, guardado
// fallido de una acción optimista), no para validaciones de formularios.
const PALETTE = {
  error: { bg: '#D9483C', icon: 'alert-circle-outline' },
  success: { bg: '#2EAD9A', icon: 'check-circle-outline' },
  info: { bg: '#333', icon: 'information-outline' },
};

export default function Toast({ visible, message, type = 'error', onHide, duration = 2800 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    let hideTimer;
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      hideTimer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide && onHide());
      }, duration);
    }
    return () => hideTimer && clearTimeout(hideTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  if (!visible) return null;

  const palette = PALETTE[type] || PALETTE.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { backgroundColor: palette.bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <MaterialCommunityIcons name={palette.icon} size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
});