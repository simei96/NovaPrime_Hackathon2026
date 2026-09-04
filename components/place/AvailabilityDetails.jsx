//Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Muestra la disponibilidad general del servicio: días, horarios, capacidad
// máxima y temporadas disponibles.
export default function AvailabilityDetails({
  diasDisponibles = [],
  horarios = [],
  capacidadMaxima,
  temporadas = [],
}) {
  const hayAlgo = diasDisponibles.length || horarios.length || capacidadMaxima || temporadas.length;
  if (!hayAlgo) return null;

  return (
    <View>
      {diasDisponibles.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Días disponibles</Text>
          <View style={styles.chipRow}>
            {diasDisponibles.map((d) => (
              <View key={d} style={styles.chip}>
                <Text style={styles.chipText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {horarios.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Horarios</Text>
          {horarios.map((h, i) => (
            <View key={i} style={styles.itemRow}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={15} color={COLOR_TEXT_MUTED} />
              <Text style={styles.itemText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {capacidadMaxima ? (
        <View style={styles.itemRow}>
          <MaterialCommunityIcons name="account-multiple-outline" size={15} color={COLOR_TEXT_MUTED} />
          <Text style={styles.itemText}>Capacidad máxima: {capacidadMaxima} personas</Text>
        </View>
      ) : null}

      {temporadas.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Temporadas disponibles</Text>
          <View style={styles.chipRow}>
            {temporadas.map((t) => (
              <View key={t} style={[styles.chip, styles.chipTemporada]}>
                <Text style={[styles.chipText, { color: '#fff' }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 10 },
  blockTitle: { fontSize: 12.5, fontWeight: '700', color: '#222', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#F1FBF9' },
  chipTemporada: { backgroundColor: COLOR_TEAL },
  chipText: { fontSize: 11.5, fontWeight: '600', color: COLOR_TEAL },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemText: { marginLeft: 8, fontSize: 13, color: '#444' },
});