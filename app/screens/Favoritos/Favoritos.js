import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color de la app
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';
const COLOR_TEAL_SOFT = '#D9F0EC';
const COLOR_TEXT_DARK = '#222';
const COLOR_TEXT_MUTED = '#7A8489';

const HORIZONTAL_PADDING = 18;
const CARD_GAP = 12;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const CAROUSEL_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.6);
const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 24;

// Chips de categoría para la búsqueda
const CATEGORY_CHIPS = [
  { label: 'Todos', slug: 'todos', icon: 'view-grid-outline' },
  { label: 'Artesanías', slug: 'artesania', icon: 'palette' },
  { label: 'Gastronomía', slug: 'gastronomia', icon: 'food' },
  { label: 'Naturaleza', slug: 'naturaleza', icon: 'leaf' },
  { label: 'Tradición', slug: 'tradiciones', icon: 'account-group' },
];

// Chips de estado (los 5 filtros originales de esta pantalla)
const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos', icon: 'view-grid-outline' },
  { key: 'reservados', label: 'Reservados', icon: 'check-circle-outline' },
  { key: 'guardados', label: 'Guardados', icon: 'heart-outline' },
  { key: 'enProceso', label: 'En proceso', icon: 'progress-clock' },
  { key: 'porReservar', label: 'Por reservar', icon: 'calendar-plus' },
];
const STATUS_CATEGORY_FILTERS = STATUS_FILTERS.filter((f) => f.key !== 'todos');

function actionLabelFor(categoryKey) {
  switch (categoryKey) {
    case 'reservados':
      return 'Ver detalles';
    case 'enProceso':
      return 'Ver estado';
    case 'porReservar':
      return 'Reservar';
    case 'guardados':
    default:
      return 'Ver detalles';
  }
}

function badgeColorFor(estado) {
  if (estado === 'Confirmada') return { bg: '#eafaf1', border: '#219653', text: '#219653' };
  if (estado === 'Pendiente') return { bg: '#fffbe6', border: '#B49B0E', text: '#B49B0E' };
  return { bg: '#eceff1', border: '#9AA3A8', text: '#607d8b' };
}

export default function FavoritosScreen() {
  const navigation = useNavigation();

  const [userId, setUserId] = useState(auth.currentUser?.uid || null);
  const [userName, setUserName] = useState(
    auth.currentUser
      ? auth.currentUser.displayName ||
          (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'Usuario')
      : 'Invitado',
  );

  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeStatusFilter, setActiveStatusFilter] = useState('todos');

  const [reservas, setReservas] = useState([]);
  const [loadingReservas, setLoadingReservas] = useState(true);
  const [favoritos, setFavoritos] = useState([]);
  const [loadingFavoritos, setLoadingFavoritos] = useState(true);
  const [heartOn, setHeartOn] = useState({});

  const [promo, setPromo] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setUserName(
        user
          ? user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
          : 'Invitado',
      );
    });
    return () => unsubAuth();
  }, []);

  // Reservas: misma lógica dual (UsuarioId legacy / userId nuevo)
  useEffect(() => {
    if (!userId) {
      setReservas([]);
      setLoadingReservas(false);
      return;
    }
    const reservasRef = collection(db, 'Reservas');
    const qLegacy = query(reservasRef, where('UsuarioId', '==', userId));
    const qNew = query(reservasRef, where('userId', '==', userId));

    let snapLegacy = [];
    let snapNew = [];

    const combineAndSet = () => {
      const map = new Map();
      [...snapLegacy, ...snapNew].forEach((d) => map.set(d.id, d));
      const merged = Array.from(map.values()).map((docItem) => {
        const d = docItem.data();
        const titulo = d.Titulo || d.title || d.titulo || d.nombre || 'Reserva';
        const tipo = d.Tipo || d.tipo || d.Type || 'Paquete';
        const estado = d.Estado || d.status || d.estado || 'Pendiente';
        let fecha = '';
        if (d.FechaReserva && d.FechaReserva.toDate)
          fecha = d.FechaReserva.toDate().toLocaleDateString();
        else if (d.reserveDate && typeof d.reserveDate === 'string')
          fecha = d.reserveDate.split(' ')[0];
        else if (d.reserveDate && d.reserveDate.toDate)
          fecha = d.reserveDate.toDate().toLocaleDateString();
        const lugar = d.Lugar || d.lugar || d.place || '';
        const precio = d.Precio || d.price || 0;
        const imagenURL = d.ImagenURL || d.imagen || d.Imagen || null;
        return { id: docItem.id, titulo, tipo, estado, fecha, lugar, precio, imagenURL };
      });
      setReservas(merged);
      setLoadingReservas(false);
    };

    const unsubLegacy = onSnapshot(qLegacy, (snapshot) => {
      snapLegacy = snapshot.docs;
      combineAndSet();
    });
    const unsubNew = onSnapshot(qNew, (snapshot) => {
      snapNew = snapshot.docs;
      combineAndSet();
    });

    return () => {
      unsubLegacy();
      unsubNew();
    };
  }, [userId]);

  // Favoritos: colección "Favoritos"
  useEffect(() => {
    if (!userId) {
      setFavoritos([]);
      setLoadingFavoritos(false);
      return;
    }
    const ref = collection(db, 'Favoritos');
    const q = query(ref, where('UsuarioId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mapped = snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            nombre: v.Nombre || v.nombre || 'Elemento guardado',
            categoria: v.Categoria || v.categoria || '',
            lugar: v.Lugar || v.lugar || '',
            precio: v.Precio || v.precio || null,
            imagenURL: v.ImagenURL || v.imagenURL || null,
            estadoFavorito: v.Estado || v.estado || 'guardado',
          };
        });
        setFavoritos(mapped);
        setLoadingFavoritos(false);
      },
      (err) => {
        console.warn('Error cargando Favoritos:', err);
        setLoadingFavoritos(false);
      },
    );
    return () => unsub();
  }, [userId]);

  // Tarjeta promocional / CTA — igual patrón que la de Búsqueda, otro documento
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const promoRef = doc(db, 'Promociones', 'Promo_005');
        const promoSnap = await getDoc(promoRef);
        if (promoSnap.exists()) setPromo(promoSnap.data());
      } catch (e) {
        console.warn('Error cargando promoción de Favoritos', e);
      }
    };
    fetchPromo();
  }, []);

  function normalizeReserva(r, categoryKey) {
    return {
      id: r.id,
      categoryKey,
      name: r.titulo,
      imageURL: r.imagenURL,
      secondary: [r.lugar, r.fecha].filter(Boolean).join(' • '),
      price: r.precio ? `C$ ${r.precio}` : null,
      badge: r.estado,
      category: (r.tipo || '').toLowerCase(),
    };
  }

  function normalizeFavorito(f, categoryKey) {
    return {
      id: f.id,
      categoryKey,
      name: f.nombre,
      imageURL: f.imagenURL,
      secondary: f.categoria || f.lugar || '',
      price: f.precio ? `C$ ${f.precio}` : null,
      badge: null,
      category: (f.categoria || '').toLowerCase(),
    };
  }

  const sections = useMemo(() => {
    const reservados = reservas
      .filter((r) => r.estado === 'Confirmada')
      .map((r) => normalizeReserva(r, 'reservados'));
    const enProceso = reservas
      .filter((r) => r.estado === 'Pendiente')
      .map((r) => normalizeReserva(r, 'enProceso'));
    const guardados = favoritos
      .filter((f) => f.estadoFavorito !== 'porReservar')
      .map((f) => normalizeFavorito(f, 'guardados'));
    const porReservar = favoritos
      .filter((f) => f.estadoFavorito === 'porReservar')
      .map((f) => normalizeFavorito(f, 'porReservar'));
    return { reservados, guardados, enProceso, porReservar };
  }, [reservas, favoritos]);

  const allItems = useMemo(
    () => [
      ...sections.reservados,
      ...sections.guardados,
      ...sections.enProceso,
      ...sections.porReservar,
    ],
    [sections],
  );

  const term = search.trim().toLowerCase();

  const categoryChipLabelNormalized = (slug) => {
    const chip = CATEGORY_CHIPS.find((c) => c.slug === slug);
    return chip ? chip.label.toLowerCase().replace('í', 'i').replace('ó', 'o') : '';
  };

  function matchesSearchAndCategory(item) {
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      (item.secondary || '').toLowerCase().includes(term);
    const matchesCategory =
      activeCategory === 'todos' ||
      (item.category || '').includes(categoryChipLabelNormalized(activeCategory));
    return matchesSearch && matchesCategory;
  }

  const filteredSections = {
    reservados: sections.reservados.filter(matchesSearchAndCategory),
    guardados: sections.guardados.filter(matchesSearchAndCategory),
    enProceso: sections.enProceso.filter(matchesSearchAndCategory),
    porReservar: sections.porReservar.filter(matchesSearchAndCategory),
  };

  // Sugerencias del dropdown de búsqueda
  const suggestions = useMemo(() => {
    if (!term) return [];
    return allItems.filter((i) => i.name.toLowerCase().includes(term)).slice(0, 5);
  }, [term, allItems]);

  const loading = loadingReservas || loadingFavoritos;
  const allEmpty =
    !loading && Object.values(filteredSections).every((arr) => arr.length === 0);

  const activeItems =
    activeStatusFilter !== 'todos' ? filteredSections[activeStatusFilter] : [];

  function openDetail(item) {
    setSelectedItem(item);
    setShowModal(true);
  }

  function toggleHeart(id) {
    setHeartOn((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function verifyPayment(item) {
    if (!item || item.categoryKey !== 'enProceso') return;
    setVerifying(true);
    try {
      const reservaDoc = doc(db, 'Reservas', item.id);
      await updateDoc(reservaDoc, { Estado: 'Confirmada', PagoVerificado: true });
      Alert.alert('Pago verificado', 'La reserva fue marcada como confirmada.');
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo verificar el pago: ' + (e.message || String(e)));
    } finally {
      setVerifying(false);
    }
  }

  function goExplore() {
    // Navega a la pestaña de Búsqueda (React Navigation, no Expo Router)
    navigation.navigate('Busqueda');
  }

  function handlePressSuggestion(item) {
    setSearch(item.name);
    setShowSuggestions(false);
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="compass-outline" size={34} color={COLOR_TEAL} />
        </View>
        <Text style={styles.emptyTitle}>Todavía no hay nada aquí</Text>
        <Text style={styles.emptySubtitle}>
          Hay tanto por descubrir de nuestra cultura y tradiciones
        </Text>
        <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={goExplore}>
          <Text style={styles.emptyBtnText}>Ir a Búsqueda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderCarouselCard(item) {
    const badge = badgeColorFor(item.badge);
    const isFav = !!heartOn[item.id];
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.carouselCard}
        activeOpacity={0.9}
        onPress={() => openDetail(item)}
      >
        <View style={styles.carouselImageWrap}>
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.carouselImage} resizeMode="cover" />
          ) : (
            <View style={[styles.carouselImage, styles.imagePlaceholder]}>
              <MaterialCommunityIcons name="image-outline" size={24} color="#c7d0d6" />
            </View>
          )}
          {item.badge ? (
            <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>{item.badge}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.favBtn}
            activeOpacity={0.8}
            onPress={() => toggleHeart(item.id)}
          >
            <MaterialCommunityIcons
              name={isFav ? 'heart' : 'heart-outline'}
              size={16}
              color={isFav ? COLOR_ORANGE : '#fff'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.carouselBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {!!item.secondary && (
            <Text style={styles.cardSecondary} numberOfLines={1}>{item.secondary}</Text>
          )}
          <View style={styles.cardFooterRow}>
            {item.price ? <Text style={styles.cardPrice}>{item.price}</Text> : <View />}
            <TouchableOpacity style={styles.cardActionBtn} onPress={() => openDetail(item)}>
              <Text style={styles.cardActionBtnText}>{actionLabelFor(item.categoryKey)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderGridCard(item, index) {
    const badge = badgeColorFor(item.badge);
    const isLeftColumn = index % 2 === 0;
    const isFav = !!heartOn[item.id];
    return (
      <View key={item.id} style={[styles.gridCard, isLeftColumn && { marginRight: CARD_GAP }]}>
        <View style={styles.gridImageWrap}>
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.gridImage} resizeMode="cover" />
          ) : (
            <View style={[styles.gridImage, styles.imagePlaceholder]}>
              <MaterialCommunityIcons name="image-outline" size={22} color="#c7d0d6" />
            </View>
          )}
          {item.badge ? (
            <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>{item.badge}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.favBtn}
            activeOpacity={0.8}
            onPress={() => toggleHeart(item.id)}
          >
            <MaterialCommunityIcons
              name={isFav ? 'heart' : 'heart-outline'}
              size={16}
              color={isFav ? COLOR_ORANGE : '#fff'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.gridBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.gridInfoRow}>
            <Text style={styles.cardSecondary} numberOfLines={1}>{item.secondary || ' '}</Text>
            {item.price && <Text style={styles.cardPrice}>{item.price}</Text>}
          </View>
          <TouchableOpacity style={styles.gridActionBtn} activeOpacity={0.85} onPress={() => openDetail(item)}>
            <Text style={styles.cardActionBtnText}>{actionLabelFor(item.categoryKey)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSection(filterMeta) {
    const items = filteredSections[filterMeta.key];
    if (!items || items.length === 0) return null;
    return (
      <View key={filterMeta.key} style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{filterMeta.label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselRow}
        >
          {items.map(renderCarouselCard)}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header: nombre de usuario + subtítulo */}
          <Text style={styles.title}>{userName}</Text>
          <Text style={styles.subtitle}>Mira tus reservas</Text>

          {/* Barra de búsqueda con dropdown de sugerencias */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9AA3A8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar en tus favoritos y reservas..."
                placeholderTextColor="#999"
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setShowSuggestions(text.trim().length > 0);
                }}
                onFocus={() => setShowSuggestions(search.trim().length > 0)}
              />
              <TouchableOpacity hitSlop={8} style={styles.micBtn}>
                <MaterialCommunityIcons name="microphone-outline" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsPanel}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionRow}
                    activeOpacity={0.7}
                    onPress={() => handlePressSuggestion(item)}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#888" style={{ marginRight: 8 }} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Chips de categoría */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScrollView}
            contentContainerStyle={styles.chipsRow}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const active = activeCategory === chip.slug;
              return (
                <TouchableOpacity
                  key={chip.slug}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                  onPress={() => setActiveCategory(chip.slug)}
                >
                  <MaterialCommunityIcons
                    name={chip.icon}
                    size={16}
                    color={active ? '#fff' : COLOR_TEAL}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tarjeta promocional / CTA */}
          <View style={styles.ctaCard}>
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaTitle} numberOfLines={2}>
                {promo?.Titulo || promo?.Nombre || 'Aprovecha nuestras promociones'}
              </Text>
              <Text style={styles.ctaDesc} numberOfLines={3}>
                {promo?.Descripcion || 'Encuentra ofertas especiales para tu próxima experiencia.'}
              </Text>
              <TouchableOpacity activeOpacity={0.85} style={styles.ctaBtn} onPress={goExplore}>
                <Text style={styles.ctaBtnText}>{promo?.CTA || 'Ver promociones'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ctaRight}>
              {promo?.ImagenURL ? (
                <Image source={{ uri: promo.ImagenURL }} style={styles.ctaImage} resizeMode="cover" />
              ) : (
                <View style={[styles.ctaImage, styles.ctaImagePlaceholder]}>
                  <MaterialCommunityIcons name="image-outline" size={26} color="#c7d0d6" />
                </View>
              )}
            </View>
          </View>

          {/* Chips de estado */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScrollView}
            contentContainerStyle={styles.chipsRow}
          >
            {STATUS_FILTERS.map((f) => {
              const active = activeStatusFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                  onPress={() => setActiveStatusFilter(f.key)}
                >
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={16}
                    color={active ? '#fff' : COLOR_TEAL}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Contenido principal */}
          {!userId ? (
            renderEmptyState()
          ) : loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLOR_TEAL} />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : activeStatusFilter === 'todos' ? (
            allEmpty ? renderEmptyState() : STATUS_CATEGORY_FILTERS.map((f) => renderSection(f))
          ) : activeItems.length > 0 ? (
            <View style={styles.resultsGrid}>
              {activeItems.map((item, idx) => renderGridCard(item, idx))}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
      </View>

      {/* Modal de detalle */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedItem ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedItem.name}</Text>
                  <TouchableOpacity
                    onPress={() => setShowModal(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#888" />
                  </TouchableOpacity>
                </View>

                {selectedItem.badge ? (
                  <View
                    style={[
                      styles.modalBadge,
                      {
                        backgroundColor: badgeColorFor(selectedItem.badge).bg,
                        borderColor: badgeColorFor(selectedItem.badge).border,
                      },
                    ]}
                  >
                    <Text style={[styles.modalBadgeText, { color: badgeColorFor(selectedItem.badge).text }]}>
                      {selectedItem.badge}
                    </Text>
                  </View>
                ) : null}

                {!!selectedItem.secondary && <Text style={styles.modalSub}>{selectedItem.secondary}</Text>}
                {selectedItem.price ? <Text style={styles.modalPrice}>{selectedItem.price}</Text> : null}

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalBtnNeutral}>
                    <Text style={styles.modalBtnNeutralText}>Cerrar</Text>
                  </TouchableOpacity>
                  {selectedItem.categoryKey === 'enProceso' && (
                    <TouchableOpacity
                      onPress={() => verifyPayment(selectedItem)}
                      style={styles.modalBtnPrimary}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalBtnPrimaryText}>Verificar pago</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
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

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLOR_TEXT_DARK,
    marginTop: 12,
    marginLeft: HORIZONTAL_PADDING,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: COLOR_TEXT_MUTED,
    marginLeft: HORIZONTAL_PADDING,
    marginBottom: 14,
    fontFamily: 'Montserrat-Regular',
  },

  // Búsqueda + sugerencias
  searchWrapper: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLOR_TEXT_DARK },
  micBtn: { padding: 6, marginLeft: 4 },
  suggestionsPanel: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLOR_TEAL,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f4',
  },
  suggestionText: { fontSize: 13.5, color: '#333', flex: 1 },

  // Chips (categoría y estado comparten estilo)
  chipsScrollView: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: 16 },
  chipsRow: { paddingHorizontal: HORIZONTAL_PADDING, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLOR_TEAL,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: COLOR_TEAL, borderColor: COLOR_TEAL },
  chipText: { fontSize: 13, color: COLOR_TEAL, fontWeight: '600', fontFamily: 'Montserrat-Medium' },
  chipTextActive: { color: '#fff' },

  // CTA Card
  ctaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  ctaLeft: { flex: 1.3, paddingRight: 12 },
  ctaTitle: { fontSize: 16, color: COLOR_ORANGE, fontFamily: 'Montserrat-Bold', marginBottom: 6 },
  ctaDesc: { fontSize: 12, color: '#666', fontFamily: 'Montserrat-Regular', marginBottom: 12, lineHeight: 16 },
  ctaBtn: { backgroundColor: COLOR_TEAL, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Montserrat-Bold' },
  ctaRight: { width: 90, height: 90, borderRadius: 14, overflow: 'hidden' },
  ctaImage: { width: '100%', height: '100%' },
  ctaImagePlaceholder: { backgroundColor: '#eef2f3', alignItems: 'center', justifyContent: 'center' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginLeft: 8, color: COLOR_TEAL, fontSize: 13 },

  // Secciones (carruseles snap/peek)
  sectionBlock: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR_TEXT_DARK,
    marginLeft: HORIZONTAL_PADDING,
    marginBottom: 12,
    fontFamily: 'Montserrat-Bold',
  },
  carouselRow: { paddingHorizontal: HORIZONTAL_PADDING, gap: CARD_GAP },
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
  carouselImageWrap: { width: '100%', height: 130, backgroundColor: '#eceff1' },
  carouselImage: { width: '100%', height: '100%' },
  carouselBody: { padding: 12 },

  // Grid de resultados
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: CARD_GAP,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  gridImageWrap: { width: '100%', height: 100, backgroundColor: '#eceff1' },
  gridImage: { width: '100%', height: '100%' },
  gridBody: { padding: 10 },
  gridInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  gridActionBtn: { backgroundColor: COLOR_TEAL, borderRadius: 10, paddingVertical: 7, alignItems: 'center' },

  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardName: { fontSize: 13.5, fontWeight: 'bold', color: COLOR_TEXT_DARK, fontFamily: 'Montserrat-Bold', marginBottom: 3 },
  cardSecondary: { fontSize: 11.5, color: COLOR_TEXT_MUTED, marginBottom: 6 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { fontSize: 12.5, fontWeight: '700', color: COLOR_ORANGE },
  cardActionBtn: { backgroundColor: COLOR_TEAL, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  cardActionBtnText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 36, paddingBottom: 24 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLOR_TEAL_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center', marginTop: 12, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13,
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 300,
  },
  emptyBtn: { backgroundColor: COLOR_ORANGE, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modal de detalle
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLOR_TEXT_DARK, flex: 1, paddingRight: 12 },
  modalCloseBtn: { padding: 4, marginTop: -2 },
  modalBadge: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 10 },
  modalBadgeText: { fontSize: 12, fontWeight: '700' },
  modalSub: { color: COLOR_TEXT_MUTED, marginTop: 10, lineHeight: 19 },
  modalPrice: { color: COLOR_ORANGE, fontWeight: '700', fontSize: 15, marginTop: 10 },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  modalBtnPrimary: { backgroundColor: COLOR_TEAL, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  modalBtnNeutral: { paddingHorizontal: 12, paddingVertical: 11 },
  modalBtnNeutralText: { color: COLOR_TEAL, fontWeight: '700' },
});