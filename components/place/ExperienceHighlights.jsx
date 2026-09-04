//Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';
import { formatCordobas, formatDolares } from '../../utils/currency';

const NIVELES_PARTICIPACION = ['Observación', 'Participación', 'Taller', 'Experiencia práctica'];

// Resumen de la experiencia: categoría (tipo de experiencia), nivel de
// participación, duración del servicio, precio en córdobas con su
// conversión a dólares, y el itinerario de lo que incluye el servicio.
export default function ExperienceHighlights({
  categoria,
  nivelParticipacion,
  duracion,
  precioCordobas,
  incluye = [],
}) {
  const nivelValido = NIVELES_PARTICIPACION.includes(nivelParticipacion) ? nivelParticipacion : null;

  return (
    <View>
      <View style={styles.badgeRow}>
        {categoria ? (
          <View style={[styles.badge, styles.badgeCategoria]}>
            <MaterialCommunityIcons name="shape-outline" size={14} color={COLOR_TEAL} />
            <Text style={styles.badgeText}>{categoria}</Text>
          </View>
        ) : null}
        {nivelValido ? (
          <View style={[styles.badge, styles.badgeNivel]}>
            <MaterialCommunityIcons name="account-group-outline" size={14} color={COLOR_ORANGE} />
            <Text style={[styles.badgeText, { color: COLOR_ORANGE }]}>{nivelValido}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoGrid}>
        {duracion ? (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={COLOR_TEXT_MUTED} />
            <Text style={styles.infoText}>{duracion}</Text>
          </View>
        ) : null}
        {precioCordobas != null ? (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={COLOR_TEXT_MUTED} />
            <Text style={styles.infoText}>
              {formatCordobas(precioCordobas)}{' '}
              <Text style={styles.infoTextMuted}>({formatDolares(precioCordobas)})</Text>
            </Text>
          </View>
        ) : null}
      </View>

      {incluye.length > 0 && (
        <View style={styles.incluyeBox}>
          <Text style={styles.incluyeTitle}>Este servicio incluye</Text>
          {incluye.map((item, i) => (
            <View key={i} style={styles.incluyeRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLOR_TEAL} />
              <Text style={styles.incluyeText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeCategoria: { backgroundColor: '#F1FBF9' },
  badgeNivel: { backgroundColor: '#FFF3E9' },
  badgeText: { marginLeft: 5, fontSize: 12, fontWeight: '700', color: COLOR_TEAL },
  infoGrid: { marginBottom: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 8, fontSize: 13.5, color: '#333', fontWeight: '600' },
  infoTextMuted: { color: COLOR_TEXT_MUTED, fontWeight: '400' },
  incluyeBox: { marginTop: 6, marginBottom: 6 },
  incluyeTitle: { fontSize: 13.5, fontWeight: '700', color: '#222', marginBottom: 8 },
  incluyeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  incluyeText: { marginLeft: 8, fontSize: 13, color: '#444', flexShrink: 1 },
});