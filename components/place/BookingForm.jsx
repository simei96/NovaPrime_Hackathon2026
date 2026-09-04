import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Formulario de reserva: stepper de personas + switches de transporte y conductor asignado.
export default function BookingForm({
  personas,
  onChangePersonas,
  minPersonas = 1,
  maxPersonas = 20,
  transporte,
  onToggleTransporte,
  conductorAsignado,
  onToggleConductor,
}) {
  function decrement() {
    if (personas > minPersonas) onChangePersonas(personas - 1);
  }
  function increment() {
    if (personas < maxPersonas) onChangePersonas(personas + 1);
  }

  return (
    <View>
      <Text style={styles.label}>Cantidad de personas</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.8} onPress={decrement}>
          <MaterialCommunityIcons name="minus" size={18} color={COLOR_TEAL} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{personas}</Text>
        <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.8} onPress={increment}>
          <MaterialCommunityIcons name="plus" size={18} color={COLOR_TEAL} />
        </TouchableOpacity>
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>¿Deseas transporte?</Text>
          <Text style={styles.helperText}>Te recogemos en un punto acordado</Text>
        </View>
        <Switch
          value={transporte}
          onValueChange={onToggleTransporte}
          trackColor={{ false: '#E7ECEF', true: COLOR_TEAL }}
          thumbColor="#fff"
        />
      </View>

      {transporte && (
        <View style={[styles.switchRow, { borderTopWidth: 0, paddingTop: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>¿Conductor asignado?</Text>
            <Text style={styles.helperText}>Un conductor te acompaña durante el recorrido</Text>
          </View>
          <Switch
            value={conductorAsignado}
            onValueChange={onToggleConductor}
            trackColor={{ false: '#E7ECEF', true: COLOR_TEAL }}
            thumbColor="#fff"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13.5, fontWeight: '700', color: '#333', marginBottom: 2 },
  helperText: { fontSize: 11.5, color: COLOR_TEXT_MUTED },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '700', color: '#222', marginHorizontal: 18 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F3',
  },
});