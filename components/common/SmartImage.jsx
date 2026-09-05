import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

// Reemplaza el patrón repetido en el Home original de:
//   <Image .../> + estado "cargado" + ActivityIndicator superpuesto
// Mantiene exactamente el mismo comportamiento visual: fondo de color de
// marca mientras carga, spinner encima, y ícono de fallback si no hay URL
// o si la imagen falla.
export default function SmartImage({
  uri,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'image-outline',
  fallbackIconColor = '#c7d0d6',
  backgroundColor = '#eceff1',
  loaderColor = '#2EAD9A',
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return (
      <View style={[style, styles.placeholder, { backgroundColor }]}>
        <MaterialCommunityIcons name={fallbackIcon} size={26} color={fallbackIconColor} />
      </View>
    );
  }

  return (
    <View style={[style, { backgroundColor, overflow: 'hidden' }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.loaderOverlay, { backgroundColor }]}>
          <ActivityIndicator size="small" color={loaderColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  loaderOverlay: { alignItems: 'center', justifyContent: 'center' },
});
