// Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color de la app
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';

const HORIZONTAL_PADDING = 18;
const CARD_GAP = 12;
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// Category Filter Bar
const CATEGORY_CHIPS = [
  { label: "Todos", slug: "todos", icon: "view-grid-outline" },
  { label: "Artesanías", slug: "artesania", icon: "palette" },
  { label: "Gastronomía", slug: "gastronomia", icon: "food" },
  { label: "Naturaleza", slug: "naturaleza", icon: "leaf" },
  { label: "Tradiciones", slug: "tradiciones", icon: "account-group" },
  { label: "Danza y Música", slug: "danza y musica", icon: "music" },
  { label: "Historia", slug: "historia", icon: "book" },
];

// Sugerencias del Empty Search Results State
const EMPTY_SUGGESTIONS = [
  { label: "Naturaleza", icon: "leaf", slug: "naturaleza" },
  { label: "Artesanías", icon: "palette", slug: "artesania" },
  { label: "Gastronomía", icon: "food", slug: "gastronomia" },
  { label: "Tradiciones", icon: "account-group", slug: "tradiciones" },
  { label: "Danza y Música", icon: "music", slug: "danza y musica" },
  { label: "Historia", icon: "book", slug: "historia" },
];

// Datos de respaldo mientras Firestore responde o si "Lugares" está vacío
const FALLBACK_PLACES = [
  {
    id: 'fallback-1',
    name: 'Volcán Masaya',
    type: 'Naturaleza',
    desc: 'Volcán activo con cráter visible de lava',
    rating: 4.9,
    distance: '25 km',
    price: null,
    imageURL:
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'fallback-2',
    name: 'Artesanías de Masaya',
    type: 'Artesanias',
    desc: 'Mercado de artesanías tradicionales',
    rating: 4.6,
    distance: '18 km',
    price: 'Entrada libre',
    imageURL:
      'https://images.unsplash.com/photo-1528277342758-f1d7613953a2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'fallback-3',
    name: 'Festival Cultural',
    type: 'Tradiciones',
    desc: 'Celebración de tradiciones locales',
    rating: 4.7,
    distance: '5 km',
    price: 'C$ 150',
    imageURL:
      'https://images.unsplash.com/photo-1533174072545-7592a814ff77?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'fallback-4',
    name: 'Ruta del Café',
    type: 'Gastronomia',
    desc: 'Recorrido por fincas cafetaleras locales',
    rating: 4.5,
    distance: '30 km',
    price: 'C$ 300',
    imageURL:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80',
  },
];

export default function MapScreen() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [lugares, setLugares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [promoIsla, setPromoIsla] = useState(null);
  
  // Búsqueda por voz: placeholder visual, listo para conectar un motor de reconocimiento de voz (ej. @react-native-voice/voice) más adelante.
  const [listening, setListening] = useState(false);

  // Conexión a Firestore: colección "Lugares"
  useEffect(() => {
    const ref = collection(db, 'Lugares');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        try {
          const mapped = snap.docs.map((d) => {
            const v = d.data();
            return {
              id: d.id,
              name: v.Nombre || v.name || 'Sin nombre',
              type: v.Tipo || v.type || 'Otro',
              desc: v.Descripcion || v.desc || '',
              rating:
                typeof v.Rating === 'number'
                  ? v.Rating
                  : typeof v.rating === 'number'
                    ? v.rating
                    : 0,
              distance: v.Distancia || v.distance || '',
              price: v.Precio || v.precio || null,
              imageURL:
                v.ImagenURL || v.imagen || v.Imagen || v.image || null,
            };
          });
          setLugares(mapped);
        } catch (e) {
          console.error('Error procesando snapshot Lugares:', e);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Snapshot Lugares falló:', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // Promotional Card / CTA Card: usa Promo_004 de firebase
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const promoRef = doc(db, 'Promociones', 'Promo_004');
        const promoSnap = await getDoc(promoRef);
        if (promoSnap.exists()) setPromoIsla(promoSnap.data());
      } catch (e) {
        console.warn('Error cargando Promo_004', e);
      }
    };
    fetchPromo();
  }, []);

  const sourcePlaces = lugares.length ? lugares : FALLBACK_PLACES;

  // Search Suggestions Dropdown
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.trim().toLowerCase();
    return sourcePlaces
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [search, sourcePlaces]);

  const filteredPlaces = sourcePlaces.filter((p) => {
    const matchesFilter =
      activeFilter === 'todos' ||
      (p.type || '').toLowerCase().includes(
        CATEGORY_CHIPS.find((c) => c.slug === activeFilter)?.label
          .toLowerCase()
          .replace('í', 'i')
          .replace('ó', 'o') || '',
      );
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function handlePressSuggestion(item) {
    setSearch(item.name);
    setShowSuggestions(false);
  }

  function handlePressEmptySuggestion(item) {
    setSearch('');
    setActiveFilter(item.slug);
    setShowSuggestions(false);
  }

  function toggleFavorite(id) {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleVoiceSearch() {
    // Para futuro integrar reconocimiento de voz real. Por ahora solo
    // muestra el estado "escuchando" en el ícono del micrófono.
    setListening((prev) => !prev);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header: nombre de sección + subtítulo */}
        <Text style={styles.title}>Búsqueda</Text>
        <Text style={styles.subtitle}>Experiencias culturales por vivir</Text>

        {/* Search Suggestions Dropdown */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar lugares, ej. Granada"
              placeholderTextColor="#999"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setShowSuggestions(text.trim().length > 0);
              }}
              onFocus={() => setShowSuggestions(search.trim().length > 0)}
            />
            <TouchableOpacity
              onPress={toggleVoiceSearch}
              hitSlop={8}
              style={styles.micBtn}
            >
              <MaterialCommunityIcons
                name={listening ? 'microphone' : 'microphone-outline'}
                size={20}
                color={listening ? COLOR_ORANGE : '#888'}
              />
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
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={16}
                    color="#888"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Category Filter Bar / Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORY_CHIPS.map((chip) => {
            const active = activeFilter === chip.slug;
            return (
              <TouchableOpacity
                key={chip.slug}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.85}
                onPress={() => setActiveFilter(chip.slug)}
              >
                <MaterialCommunityIcons
                  name={chip.icon}
                  size={16}
                  color={active ? '#fff' : COLOR_TEAL}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Promotional Card / CTA Card (usa Promo_004) */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaLeft}>
            <Text style={styles.ctaTitle} numberOfLines={2}>
              {promoIsla?.Titulo ||
                promoIsla?.Nombre ||
                'Escapa a la isla de Ometepe'}
            </Text>
            <Text style={styles.ctaDesc} numberOfLines={3}>
              {promoIsla?.Descripcion ||
                'Descubre paisajes volcánicos únicos rodeados de agua dulce.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.ctaBtn}
              onPress={() => router.push('/promotions/Promo_004')}
            >
              <Text style={styles.ctaBtnText}>
                {promoIsla?.CTA || 'Ver oferta'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ctaRight}>
            {promoIsla?.ImagenURL ? (
              <Image
                source={{ uri: promoIsla.ImagenURL }}
                style={styles.ctaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.ctaImage, styles.ctaImagePlaceholder]}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={26}
                  color="#c7d0d6"
                />
              </View>
            )}
          </View>
        </View>

        {/* Results Listing Component */}
        <Text style={styles.sectionTitle}>
          Resultados ({filteredPlaces.length})
        </Text>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLOR_TEAL} />
            <Text style={styles.loadingText}>Cargando lugares...</Text>
          </View>
        )}

        {!loading && filteredPlaces.length > 0 && (
          <View style={styles.resultsGrid}>
            {filteredPlaces.map((p) => (
              <View key={p.id} style={styles.resultCard}>
                <View style={styles.resultImageWrap}>
                  {p.imageURL ? (
                    <Image
                      source={{ uri: p.imageURL }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.resultImage, styles.resultImagePlaceholder]}
                    >
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={22}
                        color="#c7d0d6"
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.favBtn}
                    activeOpacity={0.8}
                    onPress={() => toggleFavorite(p.id)}
                  >
                    <MaterialCommunityIcons
                      name={favorites[p.id] ? 'heart' : 'heart-outline'}
                      size={16}
                      color={favorites[p.id] ? COLOR_ORANGE : '#fff'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.resultBody}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.resultInfoRow}>
                    <Text style={styles.resultType} numberOfLines={1}>
                      {p.type}
                    </Text>
                    {p.price ? (
                      <Text style={styles.resultPrice} numberOfLines={1}>
                        {p.price}
                      </Text>
                    ) : (
                      <View style={styles.resultRatingRow}>
                        <MaterialCommunityIcons
                          name="star"
                          size={12}
                          color="#FFD700"
                        />
                        <Text style={styles.resultRating}>{p.rating}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.resultBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.resultBtnText}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty Search Results State */}
        {!loading && filteredPlaces.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="magnify-close"
              size={40}
              color="#c7d0d6"
            />
            <Text style={styles.emptyTitle}>
              No encontramos resultados{search ? ` para “${search}”` : ''}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tal vez te interese explorar:
            </Text>
            <View style={styles.emptySuggestionsRow}>
              {EMPTY_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s.slug}
                  style={styles.emptySuggestionChip}
                  activeOpacity={0.85}
                  onPress={() => handlePressEmptySuggestion(s)}
                >
                  <Text style={styles.emptySuggestionEmoji}>{s.emoji}</Text>
                  <Text style={styles.emptySuggestionText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafd', paddingBottom: 50, },


  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 18,
    marginLeft: HORIZONTAL_PADDING,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginLeft: HORIZONTAL_PADDING,
    marginBottom: 14,
    fontFamily: 'Montserrat-Regular',
  },

  // Search Suggestions Dropdown
  searchWrapper: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2EAD9A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222',
  },
  micBtn: {
    padding: 6,
    marginLeft: 4,
  },
  suggestionsPanel: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2EAD9A',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#2EAD9A',
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
  suggestionText: {
    fontSize: 13.5,
    color: '#333',
    flex: 1,
  },

  // Category chips
  chipsRow: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLOR_TEAL,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: COLOR_TEAL,
    borderColor: COLOR_TEAL,
  },
  chipText: {
    fontSize: 13,
    color: COLOR_TEAL,
    fontWeight: '600',
    fontFamily: 'Montserrat-Medium',
  },
  chipTextActive: {
    color: '#fff',
  },

  // CTA Card
  ctaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2EAD9A',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  ctaLeft: { flex: 1.3, paddingRight: 12 },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'Regular',
    color: '#D96E32',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
    marginBottom: 12,
    lineHeight: 16,
  },
  ctaBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
  },
  ctaRight: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaImage: { width: '100%', height: '100%' },
  ctaImagePlaceholder: {
    backgroundColor: '#eef2f3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sección de resultados
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: HORIZONTAL_PADDING,
    marginBottom: 17,
    fontFamily: 'Montserrat-Bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: COLOR_TEAL,
    fontSize: 13,
  },

  // Results Listing Component
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  resultCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 25,
    marginTop: -8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2EAD9A",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  resultImageWrap: {
    width: '100%',
    height: 100,
    backgroundColor: '#eceff1',
  },
  resultImage: { width: '100%', height: '100%' },
  resultImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  resultBody: {
    padding: 10,
  },
  resultName: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  resultInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultType: {
    fontSize: 11,
    color: COLOR_TEAL,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 6,
  },
  resultRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultRating: {
    fontSize: 11,
    color: '#888',
    marginLeft: 3,
  },
  resultPrice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLOR_ORANGE,
  },
  resultBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  resultBtnText: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Empty Search Results State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#444',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 14,
  },
  emptySuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  emptySuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e3ea',
    marginBottom: 8,
  },
  emptySuggestionEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  emptySuggestionText: {
    fontSize: 12.5,
    color: '#333',
    fontWeight: '600',
  },
});