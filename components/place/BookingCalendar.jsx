//Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function BookingCalendar({ diasDisponibles = [], selectedDate, onSelectDate }) {
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [mesActual, setMesActual] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const dias = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) celdas.push(new Date(year, month, d));
    return celdas;
  }, [mesActual]);

  function esDiaDisponible(fecha) {
    if (fecha < hoy) return false;
    if (diasDisponibles.length === 0) return true;
    return diasDisponibles.includes(DIAS_SEMANA[fecha.getDay()]);
  }

  function cambiarMes(delta) {
    setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={COLOR_TEAL} />
        </TouchableOpacity>
        <Text style={styles.mesTexto}>
          {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLOR_TEAL} />
        </TouchableOpacity>
      </View>

      <View style={styles.semanaRow}>
        {DIAS_CORTOS.map((d, i) => (
          <Text key={i} style={styles.semanaTexto}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {dias.map((fecha, i) => {
          if (!fecha) return <View key={i} style={styles.celda} />;
          const disponible = esDiaDisponible(fecha);
          const seleccionado = selectedDate && fecha.toDateString() === selectedDate.toDateString();
          return (
            <TouchableOpacity
              key={i}
              style={[styles.celda, seleccionado && styles.celdaSeleccionada]}
              disabled={!disponible}
              activeOpacity={0.7}
              onPress={() => onSelectDate(fecha)}
            >
              <Text
                style={[
                  styles.diaTexto,
                  !disponible && styles.diaDeshabilitado,
                  seleccionado && styles.diaSeleccionadoTexto,
                ]}
              >
                {fecha.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDate && (
        <Text style={styles.fechaElegida}>
          Fecha elegida:{' '}
          {selectedDate.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { padding: 6 },
  mesTexto: { fontSize: 14, fontWeight: '700', color: '#222' },
  semanaRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  semanaTexto: { width: 32, textAlign: 'center', fontSize: 11.5, color: COLOR_TEXT_MUTED, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  celdaSeleccionada: { backgroundColor: COLOR_TEAL, borderRadius: 20 },
  diaTexto: { fontSize: 13, color: '#333' },
  diaDeshabilitado: { color: '#D3D8DC' },
  diaSeleccionadoTexto: { color: '#fff', fontWeight: '700' },
  fechaElegida: { marginTop: 10, fontSize: 12.5, color: COLOR_TEAL, fontWeight: '700' },
});