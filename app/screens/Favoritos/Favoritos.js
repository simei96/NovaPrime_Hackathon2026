import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
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
    Dimensions,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_TEAL_SOFT = '#D9F0EC';
const COLOR_TEXT_DARK = '#222';
const COLOR_TEXT_MUTED = '#7A8489';

const HORIZONTAL_PADDING = 18;
const CAROUSEL_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.6);
const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 24;

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
  Gastronomía: '#D96E32', 
  Historia: '#6a4c93',
  Artesanías: '#8d6e63',
  Música: '#c2185b',
  Tradiciones: '#2EAD9A',
  Naturaleza: '#8FB32E',
};

function fechaKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generarDiasDelMes(year, month) {
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const dias = [];

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

  const [userName, setUserName] = useState(
    auth.currentUser
      ? auth.currentUser.displayName ||
          (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'Usuario')
      : 'Invitado',
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUserName(
        user
          ? user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
          : 'Invitado',
      );
    });
    return () => unsubAuth();
  }, []);

  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth());
  const [anioActual, setAnioActual] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  const [showMenu, setShowMenu] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: nombre de usuario + mes actual*/}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Agenda de {userName}</Text>
              <Text style={styles.subtitle}>{MESES[mesActual]} {anioActual}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn} hitSlop={8}>
              <MaterialCommunityIcons name="menu" size={24} color={COLOR_TEXT_DARK} />
            </TouchableOpacity>
          </View>

          {/* Filtro activo*/}
          <View style={styles.chipsScrollViewSingle}>
            <View style={[styles.chip, styles.chipActive, styles.filtroChip]}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.chipText, styles.chipTextActive]}>{departamentoFiltro}</Text>
            </View>
          </View>

          {/* Eventos próximos */}
          {eventosProximos.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Eventos próximos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselRow}
              >
                {eventosProximos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.carouselCard}
                    activeOpacity={0.9}
                    onPress={() => {
                      setMesActual(item.fechaJS.getMonth());
                      setAnioActual(item.fechaJS.getFullYear());
                      setDiaSeleccionado(item.fechaJS);
                      setEventoSeleccionado(item);
                    }}
                  >
                    <View style={styles.carouselImageWrap}>
                      {item.imagen ? (
                        <Image source={{ uri: item.imagen }} style={styles.carouselImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.carouselImage, styles.imagePlaceholder]}>
                          <MaterialCommunityIcons name="image-outline" size={24} color="#c7d0d6" />
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: (CATEGORIAS[item.categoria] || COLOR_TEAL) + '22', borderColor: CATEGORIAS[item.categoria] || COLOR_TEAL }]}>
                        <Text style={[styles.statusBadgeText, { color: CATEGORIAS[item.categoria] || COLOR_TEAL }]}>{item.categoria}</Text>
                      </View>
                    </View>
                    <View style={styles.carouselBody}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.cardSecondary} numberOfLines={1}>
                        {item.fechaJS.getDate()} de {MESES[item.fechaJS.getMonth()]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Separador entre meses / navegación */}
          <View style={styles.navMesRow}>
            <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.navMesBtn}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={COLOR_TEAL} />
            </TouchableOpacity>
            <Text style={styles.navMesTexto}>{MESES[mesActual]} {anioActual}</Text>
            <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.navMesBtn}>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLOR_TEAL} />
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
                        <View key={i} style={[styles.puntoEvento, { backgroundColor: CATEGORIAS[cat] || COLOR_TEAL }]} />
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
          <View style={{ marginHorizontal: HORIZONTAL_PADDING, marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>
              {eventosDelDiaSeleccionado.length > 0 ? 'Evento del día' : 'Sin eventos este día'}
            </Text>

            {eventoSeleccionado ? (
              <View style={styles.eventoCard}>
                {eventoSeleccionado.imagen ? (
                  <Image source={{ uri: eventoSeleccionado.imagen }} style={styles.eventoImagen} />
                ) : null}

                <View style={{ padding: 16 }}>
                  <View style={[styles.statusBadge, styles.badgeInline, { backgroundColor: (CATEGORIAS[eventoSeleccionado.categoria] || COLOR_TEAL) + '22', borderColor: CATEGORIAS[eventoSeleccionado.categoria] || COLOR_TEAL }]}>
                    <Text style={[styles.statusBadgeText, { color: CATEGORIAS[eventoSeleccionado.categoria] || COLOR_TEAL }]}>
                      {eventoSeleccionado.categoria}
                    </Text>
                  </View>

                  <Text style={styles.eventoNombre}>{eventoSeleccionado.nombre}</Text>

                  <View style={styles.eventoInfoRow}>
                    <MaterialCommunityIcons name="calendar" size={18} color={COLOR_TEAL} />
                    <Text style={styles.eventoInfoTexto}>
                      {eventoSeleccionado.fechaJS.getDate()} de {MESES[eventoSeleccionado.fechaJS.getMonth()]}
                    </Text>
                  </View>

                  {(eventoSeleccionado.horaInicio || eventoSeleccionado.horaFin) && (
                    <View style={styles.eventoInfoRow}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color={COLOR_TEAL} />
                      <Text style={styles.eventoInfoTexto}>
                        {eventoSeleccionado.horaInicio}{eventoSeleccionado.horaFin ? ` – ${eventoSeleccionado.horaFin}` : ''}
                      </Text>
                    </View>
                  )}

                  {eventoSeleccionado.ubicacion && (
                    <View style={styles.eventoInfoRow}>
                      <MaterialCommunityIcons name="map-marker" size={18} color={COLOR_TEAL} />
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
                    activeOpacity={0.85}
                    onPress={() => router.push(`/evento/${eventoSeleccionado.id}`)}
                  >
                    <Text style={styles.verDetallesTexto}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={30} color={COLOR_TEAL} />
                </View>
                <Text style={styles.emptyTitle}>No hay eventos este día</Text>
                <Text style={styles.emptySubtitle}>Elige otra fecha en el calendario para ver qué hay disponible</Text>
              </View>
            )}

            {eventosDelDiaSeleccionado.length > 1 && (
              <View style={{ marginTop: 12 }}>
                {eventosDelDiaSeleccionado.filter((e) => e.id !== eventoSeleccionado?.id).map((e) => (
                  <TouchableOpacity key={e.id} style={styles.otroEventoRow} onPress={() => setEventoSeleccionado(e)}>
                    <View style={[styles.puntoEvento, { backgroundColor: CATEGORIAS[e.categoria] || COLOR_TEAL, marginRight: 8 }]} />
                    <Text style={styles.otroEventoTexto} numberOfLines={1}>{e.nombre}</Text>
                    <Text style={styles.otroEventoHora}>{e.horaInicio}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Menú de opciones */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalBackdropBottom} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowDeptModal(true); }}>
              <MaterialCommunityIcons name="filter-variant" size={20} color={COLOR_TEAL} />
              <Text style={styles.menuItemTexto}>Filtrar por departamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/mis-reservas'); }}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color={COLOR_TEAL} />
              <Text style={styles.menuItemTexto}>Mis reservas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/eventos-favoritos'); }}>
              <MaterialCommunityIcons name="heart-outline" size={20} color={COLOR_TEAL} />
              <Text style={styles.menuItemTexto}>Eventos favoritos</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de filtro por departamento */}
      <Modal visible={showDeptModal} transparent animationType="slide" onRequestClose={() => setShowDeptModal(false)}>
        <TouchableOpacity style={styles.modalBackdropBottom} activeOpacity={1} onPress={() => setShowDeptModal(false)}>
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
                    color={COLOR_TEAL}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f6fafd',
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : 0,
  },
  container: { flex: 1, backgroundColor: '#f6fafd' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 12,
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR_TEXT_DARK,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: COLOR_TEXT_MUTED,
    marginTop: 2,
    fontFamily: 'Montserrat-Regular',
  },
  menuBtn: { padding: 4, marginTop: 2 },

  // Chips
  chipsScrollViewSingle: { paddingHorizontal: HORIZONTAL_PADDING, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLOR_TEAL,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: COLOR_TEAL, borderColor: COLOR_TEAL },
  chipText: { fontSize: 13, color: COLOR_TEAL, fontWeight: '600', fontFamily: 'Montserrat-Medium' },
  chipTextActive: { color: '#fff' },
  filtroChip: {},

  sectionBlock: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_TEXT_DARK,
    marginLeft: HORIZONTAL_PADDING,
    marginBottom: 12,
    fontFamily: 'Montserrat-Bold',
  },

  carouselRow: { paddingHorizontal: HORIZONTAL_PADDING, gap: 12 },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  carouselImageWrap: { width: '100%', height: 110, backgroundColor: '#eceff1' },
  carouselImage: { width: '100%', height: '100%' },
  carouselBody: { padding: 12 },

  navMesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 20,
  },
  navMesBtn: {
    backgroundColor: COLOR_TEAL_SOFT,
    borderRadius: 20,
    padding: 6,
  },
  navMesTexto: {
    fontFamily: 'Montserrat-Bold',
    color: COLOR_TEXT_DARK,
    fontSize: 15,
    minWidth: 150,
    textAlign: 'center',
  },

  calendarioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: HORIZONTAL_PADDING,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  filaDias: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  diaSemanaTexto: { width: `${100 / 7}%`, textAlign: 'center', color: COLOR_TEXT_MUTED, fontSize: 12, fontFamily: 'Montserrat-Medium' },

  gridDias: { flexDirection: 'row', flexWrap: 'wrap' },
  celdaDia: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  celdaDiaSeleccionada: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
  },
  numeroDia: { color: COLOR_TEXT_DARK, fontSize: 14, fontFamily: 'Montserrat-Regular' },
  numeroDiaSeleccionado: { color: '#fff', fontFamily: 'Montserrat-Bold' },
  numeroDiaHoy: { color: COLOR_ORANGE, fontFamily: 'Montserrat-Bold' },

  puntosRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  puntoEvento: { width: 5, height: 5, borderRadius: 3 },

  leyendaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaPunto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: COLOR_TEXT_MUTED, fontSize: 11, fontFamily: 'Montserrat-Regular' },

  eventoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  eventoImagen: { width: '100%', height: 150 },
  eventoNombre: { fontFamily: 'Montserrat-Bold', color: COLOR_TEXT_DARK, fontSize: 17, marginBottom: 10, marginTop: 8 },
  eventoInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eventoInfoTexto: { color: '#444', fontSize: 14, fontFamily: 'Montserrat-Regular' },

  miniMapaContenedor: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
  },

  verDetallesBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  verDetallesTexto: { color: '#fff', fontFamily: 'Montserrat-Bold', fontSize: 15 },

  // Badges de categoría
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700', fontFamily: 'Montserrat-Bold' },
  badgeInline: { position: 'relative', top: 0, left: 0, alignSelf: 'flex-start', marginBottom: 4 },

  cardName: { fontSize: 13.5, fontWeight: 'bold', color: COLOR_TEXT_DARK, fontFamily: 'Montserrat-Bold', marginBottom: 3 },
  cardSecondary: { fontSize: 11.5, color: COLOR_TEXT_MUTED, fontFamily: 'Montserrat-Regular' },

  otroEventoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    padding: 10,
    marginBottom: 6,
  },
  otroEventoTexto: { flex: 1, color: '#444', fontSize: 13, fontFamily: 'Montserrat-Regular' },
  otroEventoHora: { color: COLOR_TEXT_MUTED, fontSize: 12, fontFamily: 'Montserrat-Regular' },

  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  // Empty state 
  emptyState: { alignItems: 'center', paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 24, paddingBottom: 12 },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLOR_TEAL_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#333', textAlign: 'center', marginTop: 10, marginBottom: 4, fontFamily: 'Montserrat-Bold' },
  emptySubtitle: { fontSize: 12.5, color: COLOR_TEXT_MUTED, textAlign: 'center', lineHeight: 18, maxWidth: 280, fontFamily: 'Montserrat-Regular' },

  // Modales
  modalBackdropBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  menuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuItemTexto: { color: COLOR_TEXT_DARK, fontSize: 15, fontFamily: 'Montserrat-Medium' },

  deptCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '70%',
  },
  deptTitulo: { fontFamily: 'Montserrat-Bold', color: COLOR_TEXT_DARK, fontSize: 16, marginBottom: 10 },
  deptItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  deptItemTexto: { color: '#333', fontSize: 14, fontFamily: 'Montserrat-Regular' },
});