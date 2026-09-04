//Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Muestra los datos de ubicación jerárquicos del lugar
export default function LocationDetails({
  departamento,
  municipio,
  comunidad,
  direccion,
  puntoReferencia,
  latitude,
  longitude,
}) {
  const filas = [
    { label: 'Departamento', value: departamento },
    { label: 'Municipio', value: municipio },
    { label: 'Comunidad/localidad', value: comunidad },
    { label: 'Dirección', value: direccion },
    { label: 'Punto de referencia', value: puntoReferencia },
  ].filter((f) => f.value);

  const hayMapa = !!((latitude && longitude) || direccion);
  if (filas.length === 0 && !hayMapa) return null;

  function abrirMapa() {
    if (latitude && longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    } else if (direccion) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`);
    }
  }

  return (
    <View>
      {filas.map((f) => (
        <View key={f.label} style={styles.row}>
          <Text style={styles.label}>{f.label}</Text>
          <Text style={styles.value}>{f.value}</Text>
        </View>
      ))}
      {hayMapa && (
        <TouchableOpacity style={styles.mapBtn} activeOpacity={0.85} onPress={abrirMapa}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={COLOR_ORANGE} />
          <Text style={styles.mapBtnText}>Ver ubicación en el mapa</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12.5, color: COLOR_TEXT_MUTED },
  value: { fontSize: 13, color: '#222', fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7ECEF',
  },
  mapBtnText: { marginLeft: 6, fontSize: 12.5, fontWeight: '700', color: COLOR_TEAL },
});