import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../../firebaseConfig';

// ──────────────────────────────────────────────────────────────
// AJUSTA ESTO si tus campos de Firestore tienen otro nombre.
// Colección asumida: "eventos"
//   nombre        (string)
//   categoria     (string) -> una de CATEGORIAS
//   fecha         (Timestamp)
//   horaInicio    (string, ej. "6:00 PM")
//   horaFin       (string, ej. "10:00 PM")
//   ubicacion     (string)
//   departamento  (string)
//   lat, lng      (number)
//   imagen        (string url, opcional)
// ──────────────────────────────────────────────────────────────

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const DEPARTAMENTOS_NI = [
  'Todos',
  'Boaco', 'Carazo', 'Chinandega', 'Chontales', 'Estelí',
  'Granada', 'Jinotega', 'León', 'Madriz', 'Managua',
  'Masaya', 'Matagalpa', 'Nueva Segovia', 'Río San Juan', 'Rivas',
  'Región Autónoma de la Costa Caribe Norte',
  'Región Autónoma de la Costa Caribe Sur',
];

const CATEGORIAS = {
  Gastronomía: '#e65100',
  Historia: '#6a1b9a',
  Artesanías: '#8d6e63',
  Música: '#c2185b',
  Tradiciones: '#00838f',
  Naturaleza: '#2e7d32',
};

function fechaKey(date) {
  // yyyy-mm-dd local, sin problemas de zona horaria
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generarDiasDelMes(year, month) {
  // month: 0-indexado
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const dias = [];

  // relleno inicial para alinear con el día de la semana
  for (let i = 0; i < primerDia.getDay(); i++) {
    dias.push(null);
  }
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(year, month, d));
  }
  return dias;
}

export default function AgendaScreen() {
  const router = useRouter();

  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth());
  const [anioActual, setAnioActual] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  const [showMenu, setShowMenu] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // ── Carga de eventos del mes desde Firestore ────────────────
  useEffect(() => {
    const inicioMes = new Date(anioActual, mesActual, 1, 0, 0, 0);
    const finMes = new Date(anioActual, mesActual + 1, 0, 23, 59, 59);

    let q = query(
      collection(db, 'eventos'),
      where('fecha', '>=', Timestamp.fromDate(inicioMes)),
      where('fecha', '<=', Timestamp.fromDate(finMes)),
      orderBy('fecha', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fechaJS: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
        };
      });
      setEventos(lista);
    }, (err) => {
      console.log('Error cargando eventos:', err);
    });

    return () => unsubscribe();
  }, [mesActual, anioActual]);

  const eventosFiltrados = useMemo(() => {
    if (departamentoFiltro === 'Todos') return eventos;
    return eventos.filter((e) => e.departamento === departamentoFiltro);
  }, [eventos, departamentoFiltro]);

  // Mapa de día -> categorías presentes (para los puntos de color)
  const eventosPorDia = useMemo(() => {
    const mapa = {};
    eventosFiltrados.forEach((e) => {
      const key = fechaKey(e.fechaJS);
      if (!mapa[key]) mapa[key] = new Set();
      mapa[key].add(e.categoria);
    });
    return mapa;
  }, [eventosFiltrados]);

  const eventosDelDiaSeleccionado = useMemo(() => {
    const key = fechaKey(diaSeleccionado);
    return eventosFiltrados.filter((e) => fechaKey(e.fechaJS) === key);
  }, [eventosFiltrados, diaSeleccionado]);

  useEffect(() => {
    setEventoSeleccionado(eventosDelDiaSeleccionado[0] || null);
  }, [eventosDelDiaSeleccionado]);

  const eventosProximos = useMemo(() => {
    return [...eventosFiltrados]
      .filter((e) => e.fechaJS >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
      .sort((a, b) => a.fechaJS - b.fechaJS)
      .slice(0, 6);
  }, [eventosFiltrados]);

  const diasDelMes = useMemo(() => generarDiasDelMes(anioActual, mesActual), [anioActual, mesActual]);

  const cambiarMes = (delta) => {
    let nuevoMes = mesActual + delta;
    let nuevoAnio = anioActual;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio -= 1;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio += 1;
    }
    setMesActual(nuevoMes);
    setAnioActual(nuevoAnio);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.appBarTitle}>Agenda</Text>
          <Text style={styles.appBarSubtitle}>{MESES[mesActual]} {anioActual}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
          <MaterialCommunityIcons name="menu" size={26} color="#283593" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filtro activo */}
        <View style={styles.filtroChipRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#1976d2" />
          <Text style={styles.filtroChipText}>{departamentoFiltro}</Text>
        </View>

        {/* Eventos próximos */}
        {eventosProximos.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.seccionTitulo}>Eventos próximos</Text>
            <FlatList
              data={eventosProximos}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.proximoCard, { borderLeftColor: CATEGORIAS[item.categoria] || '#1976d2' }]}
                  onPress={() => {
                    setMesActual(item.fechaJS.getMonth());
                    setAnioActual(item.fechaJS.getFullYear());
                    setDiaSeleccionado(item.fechaJS);
                    setEventoSeleccionado(item);
                  }}
                >
                  <Text style={styles.proximoFecha}>{item.fechaJS.getDate()} {MESES[item.fechaJS.getMonth()].slice(0, 3)}</Text>
                  <Text style={styles.proximoNombre} numberOfLines={2}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Separador entre meses / navegación */}
        <View style={styles.navMesRow}>
          <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.navMesBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1976d2" />
          </TouchableOpacity>
          <Text style={styles.navMesTexto}>{MESES[mesActual]} {anioActual}</Text>
          <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.navMesBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#1976d2" />
          </TouchableOpacity>
        </View>

        {/* Calendario mensual */}
        <View style={styles.calendarioCard}>
          <View style={styles.filaDias}>
            {DIAS_SEMANA.map((d, idx) => (
              <Text key={idx} style={styles.diaSemanaTexto}>{d}</Text>
            ))}
          </View>
          <View style={styles.gridDias}>
            {diasDelMes.map((fecha, idx) => {
              if (!fecha) {
                return <View key={idx} style={styles.celdaDia} />;
              }
              const key = fechaKey(fecha);
              const categoriasDelDia = eventosPorDia[key] ? Array.from(eventosPorDia[key]) : [];
              const esSeleccionado = fechaKey(diaSeleccionado) === key;
              const esHoy = fechaKey(hoy) === key;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.celdaDia,
                    esSeleccionado && styles.celdaDiaSeleccionada,
                  ]}
                  onPress={() => setDiaSeleccionado(fecha)}
                >
                  <Text style={[
                    styles.numeroDia,
                    esSeleccionado && styles.numeroDiaSeleccionado,
                    esHoy && !esSeleccionado && styles.numeroDiaHoy,
                  ]}>
                    {fecha.getDate()}
                  </Text>
                  <View style={styles.puntosRow}>
                    {categoriasDelDia.slice(0, 3).map((cat, i) => (
                      <View key={i} style={[styles.puntoEvento, { backgroundColor: CATEGORIAS[cat] || '#1976d2' }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Leyenda de categorías */}
          <View style={styles.leyendaRow}>
            {Object.entries(CATEGORIAS).map(([nombre, color]) => (
              <View key={nombre} style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: color }]} />
                <Text style={styles.leyendaTexto}>{nombre}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tarjeta del evento seleccionado */}
        <View style={{ marginHorizontal: 12, marginTop: 12, marginBottom: 24 }}>
          <Text style={styles.seccionTitulo}>
            {eventosDelDiaSeleccionado.length > 0 ? 'Evento del día' : 'Sin eventos este día'}
          </Text>

          {eventoSeleccionado ? (
            <View style={styles.eventoCard}>
              {eventoSeleccionado.imagen ? (
                <Image source={{ uri: eventoSeleccionado.imagen }} style={styles.eventoImagen} />
              ) : null}

              <View style={{ padding: 14 }}>
                <View style={[styles.categoriaBadge, { backgroundColor: (CATEGORIAS[eventoSeleccionado.categoria] || '#1976d2') + '22' }]}>
                  <Text style={[styles.categoriaBadgeTexto, { color: CATEGORIAS[eventoSeleccionado.categoria] || '#1976d2' }]}>
                    {eventoSeleccionado.categoria}
                  </Text>
                </View>

                <Text style={styles.eventoNombre}>{eventoSeleccionado.nombre}</Text>

                <View style={styles.eventoInfoRow}>
                  <MaterialCommunityIcons name="calendar" size={18} color="#1976d2" />
                  <Text style={styles.eventoInfoTexto}>
                    {eventoSeleccionado.fechaJS.getDate()} de {MESES[eventoSeleccionado.fechaJS.getMonth()]}
                  </Text>
                </View>

                {(eventoSeleccionado.horaInicio || eventoSeleccionado.horaFin) && (
                  <View style={styles.eventoInfoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#1976d2" />
                    <Text style={styles.eventoInfoTexto}>
                      {eventoSeleccionado.horaInicio}{eventoSeleccionado.horaFin ? ` – ${eventoSeleccionado.horaFin}` : ''}
                    </Text>
                  </View>
                )}

                {eventoSeleccionado.ubicacion && (
                  <View style={styles.eventoInfoRow}>
                    <MaterialCommunityIcons name="map-marker" size={18} color="#1976d2" />
                    <Text style={styles.eventoInfoTexto}>{eventoSeleccionado.ubicacion}</Text>
                  </View>
                )}

                {/* Mini mapa 3D */}
                {eventoSeleccionado.lat && eventoSeleccionado.lng && (
                  <View style={styles.miniMapaContenedor}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={{ flex: 1 }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      showsBuildings
                      initialCamera={{
                        center: { latitude: eventoSeleccionado.lat, longitude: eventoSeleccionado.lng },
                        pitch: 60,
                        heading: 20,
                        altitude: 800,
                        zoom: 17,
                      }}
                    >
                      <Marker
                        coordinate={{ latitude: eventoSeleccionado.lat, longitude: eventoSeleccionado.lng }}
                        title={eventoSeleccionado.nombre}
                      />
                    </MapView>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.verDetallesBtn}
                  onPress={() => router.push(`/evento/${eventoSeleccionado.id}`)}
                >
                  <Text style={styles.verDetallesTexto}>Ver detalles</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.sinEventoCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={30} color="#bbb" />
              <Text style={{ color: '#888', fontSize: 13, marginTop: 6 }}>No hay eventos para el día seleccionado.</Text>
            </View>
          )}

          {eventosDelDiaSeleccionado.length > 1 && (
            <View style={{ marginTop: 10 }}>
              {eventosDelDiaSeleccionado.filter((e) => e.id !== eventoSeleccionado?.id).map((e) => (
                <TouchableOpacity key={e.id} style={styles.otroEventoRow} onPress={() => setEventoSeleccionado(e)}>
                  <View style={[styles.puntoEvento, { backgroundColor: CATEGORIAS[e.categoria] || '#1976d2', marginRight: 8 }]} />
                  <Text style={styles.otroEventoTexto} numberOfLines={1}>{e.nombre}</Text>
                  <Text style={styles.otroEventoHora}>{e.horaInicio}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Menú de opciones */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowDeptModal(true); }}>
              <MaterialCommunityIcons name="filter-variant" size={20} color="#283593" />
              <Text style={styles.menuItemTexto}>Filtrar por departamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/mis-reservas'); }}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="#283593" />
              <Text style={styles.menuItemTexto}>Mis reservas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/eventos-favoritos'); }}>
              <MaterialCommunityIcons name="heart-outline" size={20} color="#283593" />
              <Text style={styles.menuItemTexto}>Eventos favoritos</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de filtro por departamento */}
      <Modal visible={showDeptModal} transparent animationType="slide" onRequestClose={() => setShowDeptModal(false)}>
        <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPress={() => setShowDeptModal(false)}>
          <View style={styles.deptCard}>
            <Text style={styles.deptTitulo}>Filtrar por departamento</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {DEPARTAMENTOS_NI.map((dep) => (
                <TouchableOpacity
                  key={dep}
                  style={styles.deptItem}
                  onPress={() => { setDepartamentoFiltro(dep); setShowDeptModal(false); }}
                >
                  <MaterialCommunityIcons
                    name={departamentoFiltro === dep ? 'radiobox-marked' : 'radiobox-blank'}
                    size={18}
                    color="#1976d2"
                  />
                  <Text style={styles.deptItemTexto}>{dep}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafd' },

  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  appBarTitle: { fontFamily: 'Montserrat-Bold', color: '#283593', fontSize: 18 },
  appBarSubtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  menuBtn: { padding: 6 },

  filtroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    marginTop: 12,
    gap: 6,
  },
  filtroChipText: { color: '#1976d2', fontFamily: 'Montserrat-SemiBold', fontSize: 13 },

  seccionTitulo: {
    fontFamily: 'Montserrat-SemiBold',
    color: '#283593',
    fontSize: 15,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
  },

  proximoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    width: 130,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  proximoFecha: { color: '#888', fontSize: 12, marginBottom: 4, fontFamily: 'Montserrat-SemiBold' },
  proximoNombre: { color: '#222', fontSize: 13, fontFamily: 'Montserrat-SemiBold' },

  navMesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  navMesBtn: {
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    padding: 6,
  },
  navMesTexto: {
    fontFamily: 'Montserrat-Bold',
    color: '#283593',
    fontSize: 16,
    minWidth: 150,
    textAlign: 'center',
  },

  calendarioCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filaDias: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  diaSemanaTexto: { width: `${100 / 7}%`, textAlign: 'center', color: '#888', fontSize: 12, fontFamily: 'Montserrat-SemiBold' },

  gridDias: { flexDirection: 'row', flexWrap: 'wrap' },
  celdaDia: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  celdaDiaSeleccionada: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
  },
  numeroDia: { color: '#333', fontSize: 14 },
  numeroDiaSeleccionado: { color: '#fff', fontFamily: 'Montserrat-Bold' },
  numeroDiaHoy: { color: '#1976d2', fontFamily: 'Montserrat-Bold' },

  puntosRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  puntoEvento: { width: 5, height: 5, borderRadius: 3 },

  leyendaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaPunto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: '#666', fontSize: 11 },

  eventoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eventoImagen: { width: '100%', height: 150 },
  categoriaBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  categoriaBadgeTexto: { fontFamily: 'Montserrat-SemiBold', fontSize: 12 },
  eventoNombre: { fontFamily: 'Montserrat-Bold', color: '#222', fontSize: 17, marginBottom: 10 },
  eventoInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eventoInfoTexto: { color: '#444', fontSize: 14 },

  miniMapaContenedor: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 12,
  },

  verDetallesBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  verDetallesTexto: { color: '#fff', fontFamily: 'Montserrat-SemiBold', fontSize: 15 },

  sinEventoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  otroEventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  otroEventoTexto: { flex: 1, color: '#444', fontSize: 13 },
  otroEventoHora: { color: '#888', fontSize: 12 },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  menuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuItemTexto: { color: '#283593', fontSize: 15, fontFamily: 'Montserrat-SemiBold' },

  deptCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '70%',
  },
  deptTitulo: { fontFamily: 'Montserrat-Bold', color: '#283593', fontSize: 16, marginBottom: 10 },
  deptItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  deptItemTexto: { color: '#333', fontSize: 14 },
});