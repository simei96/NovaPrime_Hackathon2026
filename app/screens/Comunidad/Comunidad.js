import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';
const COLOR_DISLIKE = '#FF5252';

const STORY_SIZE = 64;
const STORY_RING = 3;

// Motivos seleccionables al presionar "no me gusta"
const DISLIKE_REASONS = [
  { id: 'noInteresa', label: 'No me interesa este lugar' },
  { id: 'infoIncorrecta', label: 'Información incorrecta o desactualizada' },
  { id: 'malaCalidad', label: 'Fotos o contenido de baja calidad' },
  { id: 'yaLoConozco', label: 'Ya conozco este lugar' },
  { id: 'noSeguro', label: 'No parece seguro o accesible' },
  { id: 'otro', label: 'Otro motivo' },
];

// Devuelve el valor solo si es un string renderizable; si es un GeoPoint,
// Timestamp u otro objeto de Firestore, devuelve '' en vez de romper el render.
function safeText(value) {
  return typeof value === 'string' ? value : '';
}

// Formatea un GeoPoint de Firestore a texto legible ("12.1234, -86.1234")
function formatGeoPoint(geoPoint) {
  if (
    geoPoint &&
    typeof geoPoint === 'object' &&
    typeof geoPoint.latitude === 'number' &&
    typeof geoPoint.longitude === 'number'
  ) {
    return `${geoPoint.latitude.toFixed(4)}, ${geoPoint.longitude.toFixed(4)}`;
  }
  return '';
}

const FALLBACK_STORIES = [
  {
    id: 'story-1',
    name: 'Granada',
    imageURL:
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'story-2',
    name: 'Masaya',
    imageURL:
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'story-3',
    name: 'Ometepe',
    imageURL:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'story-4',
    name: 'San Juan del Sur',
    imageURL:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
  },
];

export default function CalendarScreen() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser || null);

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  // Visor de historias
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [loadingStoryDetail, setLoadingStoryDetail] = useState(false);

  // Interacciones sobre las historias 
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [savedStories, setSavedStories] = useState({});
  const [savingStory, setSavingStory] = useState(false);

  // Modal de "no me gusta" con motivos seleccionables y comentario
  const [dislikeModalVisible, setDislikeModalVisible] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState({});
  const [dislikeComment, setDislikeComment] = useState('');
  const [submittingDislike, setSubmittingDislike] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  // Stories Carousel: reutiliza la colección "Lugares" (misma que Home/Búsqueda)
  useEffect(() => {
    const ref = collection(db, 'Lugares');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const mapped = snap.docs
          .map((d) => {
            const v = d.data();
            return {
              id: d.id,
              name:
                safeText(v.nombre) ||
                safeText(v.Ciudad) ||
                safeText(v.Nombre) ||
                safeText(v.name) ||
                'Destino',
              imageURL:
                v.imagenPortadaURL || v.ImagenURL || v.imagen || v.Imagen || null,
            };
          })
          .filter((s) => !!s.imageURL);
        setStories(mapped);
        setLoadingStories(false);
      },
      (err) => {
        console.warn('Error cargando historias (Lugares):', err);
        setLoadingStories(false);
      },
    );
    return () => unsub();
  }, []);

  const storiesSource = stories.length ? stories : FALLBACK_STORIES;

  const headerDisplayName = user
    ? user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
    : 'Inicia sesión';

  // Abre la historia a pantalla completa y trae los datos del lugar
  async function openStory(story) {
    setActiveStory(story);
    setStoryModalVisible(true);
    setLoadingStoryDetail(true);
    try {
      const ref = doc(db, 'Lugares', story.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const v = snap.data();
        setActiveStory((prev) =>
          prev && prev.id === story.id
            ? {
                ...prev,
                descripcion: safeText(v.descripcion) || safeText(v.Descripcion),
                // "direccion" es texto; "coordenadas" es un GeoPoint y NUNCA
                // debe pasarse directo a un <Text> (por eso se formatea aparte).
                ubicacion:
                  safeText(v.direccion) ||
                  safeText(v.Ubicacion) ||
                  safeText(v.ubicacion) ||
                  formatGeoPoint(v.coordenadas) ||
                  prev.name,
                categoria: safeText(v.categoria) || safeText(v.Categoria),
              }
            : prev,
        );
      }
    } catch (e) {
      console.warn('Error cargando datos del lugar:', e);
    } finally {
      setLoadingStoryDetail(false);
    }
  }

  function closeStory() {
    setStoryModalVisible(false);
    setActiveStory(null);
  }

  function toggleStoryLike(id) {
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) setDisliked((d) => ({ ...d, [id]: false }));
      return next;
    });
  }

  // Al presionar el pulgar abajo: si ya estaba marcado, se quita directo;
  // si se va a marcar, primero se piden los motivos en un modal.
  function onPressDislike(story) {
    if (!story) return;
    if (disliked[story.id]) {
      setDisliked((prev) => ({ ...prev, [story.id]: false }));
      return;
    }
    setSelectedReasons({});
    setDislikeComment('');
    setDislikeModalVisible(true);
  }

  function toggleReasonOption(reasonId) {
    setSelectedReasons((prev) => ({ ...prev, [reasonId]: !prev[reasonId] }));
  }

  function closeDislikeModal() {
    setDislikeModalVisible(false);
  }

  // Guarda el motivo del "no me gusta" en Firestore, colección "InteraccionesLugares"
  async function submitDislike() {
    if (!activeStory) return;
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para calificar historias.');
      setDislikeModalVisible(false);
      router.push('/login');
      return;
    }

    const motivos = Object.keys(selectedReasons).filter((k) => selectedReasons[k]);
    if (motivos.length === 0 && !dislikeComment.trim()) {
      Alert.alert('Selecciona un motivo', 'Elige al menos una opción o escribe un comentario.');
      return;
    }

    setSubmittingDislike(true);
    try {
      await addDoc(collection(db, 'InteraccionesLugares'), {
        lugarId: activeStory.id,
        userId: user.uid,
        tipo: 'noMeGusta',
        motivos,
        comentario: dislikeComment.trim(),
        creadoEn: new Date(),
      });
      setDisliked((prev) => ({ ...prev, [activeStory.id]: true }));
      setLiked((prev) => ({ ...prev, [activeStory.id]: false }));
      setDislikeModalVisible(false);
    } catch (e) {
      console.warn('Error guardando el motivo de no me gusta:', e);
      Alert.alert('Error', 'No se pudo guardar tu respuesta. Intenta de nuevo.');
    } finally {
      setSubmittingDislike(false);
    }
  }

  // Guardar la historia como favorito con estado "porReservar"
  async function saveStoryAsFavorito(story) {
    if (!story) return;
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para guardar historias.');
      router.push('/login');
      return;
    }
    if (savedStories[story.id] || savingStory) return;

    setSavingStory(true);
    try {
      await addDoc(collection(db, 'Favoritos'), {
        UsuarioId: user.uid,
        Nombre: story.name,
        Categoria: story.categoria || '',
        Lugar: story.ubicacion || story.name,
        ImagenURL: story.imageURL,
        Estado: 'porReservar',
        CreadoEn: new Date(),
      });
      setSavedStories((prev) => ({ ...prev, [story.id]: true }));
    } catch (e) {
      console.warn('Error guardando favorito:', e);
      Alert.alert('Error', 'No se pudo guardar la historia en favoritos.');
    } finally {
      setSavingStory(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header: espacio vacío a la izquierda, "Comunidad" centrado, usuario a la derecha */}
      <View style={styles.headerFixed}>
        <View style={styles.headerSpacer} />

        <Text style={styles.headerTitle}>Comunidad</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (!user) router.push('/login');
          }}
          style={styles.headerUserWrap}
        >
          <Text style={styles.headerUserText} numberOfLines={1}>
            {headerDisplayName}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Stories Carousel */}
        <View style={styles.storiesSection}>
          {loadingStories ? (
            <ActivityIndicator
              size="small"
              color={COLOR_TEAL}
              style={{ marginVertical: 12 }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesRow}
            >
              {storiesSource.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  style={styles.storyItem}
                  onPress={() => openStory(s)}
                >
                  <View style={styles.storyRingOuter}>
                    <View style={styles.storyRingInner}>
                      <Image
                        source={{ uri: s.imageURL }}
                        style={styles.storyImage}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                  <Text style={styles.storyName} numberOfLines={1}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Visor de historias a pantalla completa */}
      <Modal
        visible={storyModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={closeStory}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.storyViewerContainer}>
          {activeStory && (
            <>
              <Image
                source={{ uri: activeStory.imageURL }}
                style={styles.storyViewerImage}
                resizeMode="cover"
              />
              <View style={styles.storyViewerTopOverlay} />
              <View style={styles.storyViewerBottomOverlay} />

              {/* Barra de progreso, estilo historia única */}
              <View style={styles.storyProgressRow}>
                <View style={styles.storyProgressBarBg}>
                  <View style={styles.storyProgressBarFill} />
                </View>
              </View>

              {/* Encabezado: avatar + nombre + cerrar */}
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyViewerHeaderLeft}>
                  <View style={styles.storyViewerAvatarRing}>
                    <Image
                      source={{ uri: activeStory.imageURL }}
                      style={styles.storyViewerAvatar}
                    />
                  </View>
                  <Text style={styles.storyViewerName} numberOfLines={1}>
                    {activeStory.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeStory}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Datos del lugar */}
              <View style={styles.storyViewerInfo} pointerEvents="none">
                {!!activeStory.ubicacion && (
                  <View style={styles.storyViewerLocationRow}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
                    <Text style={styles.storyViewerLocationText} numberOfLines={1}>
                      {activeStory.ubicacion}
                    </Text>
                  </View>
                )}
                {loadingStoryDetail ? (
                  <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
                ) : !!activeStory.descripcion ? (
                  <Text style={styles.storyViewerDesc} numberOfLines={3}>
                    {activeStory.descripcion}
                  </Text>
                ) : null}
                {savedStories[activeStory.id] && (
                  <Text style={styles.storyViewerSavedLabel}>
                    Guardado en Favoritos · Por reservar
                  </Text>
                )}
              </View>

              {/* Acciones: me gusta, no me gusta, guardar */}
              <View style={styles.storyViewerActions}>
                <TouchableOpacity
                  style={styles.storyViewerActionBtn}
                  onPress={() => toggleStoryLike(activeStory.id)}
                >
                  <MaterialCommunityIcons
                    name={liked[activeStory.id] ? 'heart' : 'heart-outline'}
                    size={26}
                    color={liked[activeStory.id] ? COLOR_ORANGE : '#fff'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.storyViewerActionBtn}
                  onPress={() => onPressDislike(activeStory)}
                >
                  <MaterialCommunityIcons
                    name={disliked[activeStory.id] ? 'thumb-down' : 'thumb-down-outline'}
                    size={24}
                    color={disliked[activeStory.id] ? COLOR_DISLIKE : '#fff'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.storyViewerActionBtn}
                  onPress={() => saveStoryAsFavorito(activeStory)}
                >
                  {savingStory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons
                      name={savedStories[activeStory.id] ? 'bookmark' : 'bookmark-outline'}
                      size={26}
                      color={savedStories[activeStory.id] ? COLOR_TEAL : '#fff'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Modal: motivos de "no me gusta" + comentario */}
      <Modal
        visible={dislikeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDislikeModal}
      >
        <KeyboardAvoidingView
          style={styles.dislikeBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dislikeSheet}>
            <View style={styles.dislikeHandle} />
            <Text style={styles.dislikeTitle}>¿Por qué no te gustó?</Text>
            <Text style={styles.dislikeSubtitle}>
              Selecciona una o varias opciones. Tu respuesta nos ayuda a mejorar.
            </Text>

            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {DISLIKE_REASONS.map((reason) => {
                const isSelected = !!selectedReasons[reason.id];
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={styles.reasonRow}
                    activeOpacity={0.8}
                    onPress={() => toggleReasonOption(reason.id)}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={isSelected ? COLOR_TEAL : '#9AA3A8'}
                    />
                    <Text style={styles.reasonLabel}>{reason.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.dislikeCommentInput}
              placeholder="Cuéntanos más (opcional)"
              placeholderTextColor="#9AA3A8"
              value={dislikeComment}
              onChangeText={setDislikeComment}
              multiline
            />

            <View style={styles.dislikeActionsRow}>
              <TouchableOpacity
                style={styles.dislikeCancelBtn}
                onPress={closeDislikeModal}
                disabled={submittingDislike}
              >
                <Text style={styles.dislikeCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dislikeSubmitBtn}
                onPress={submitDislike}
                disabled={submittingDislike}
              >
                {submittingDislike ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.dislikeSubmitText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafd' },

  // Header
  headerFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e3ea',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR_OLIVE,
    fontFamily: 'Montserrat-Bold',
  },
  headerUserWrap: {
    width: 90,
    alignItems: 'flex-end',
  },
  headerUserText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR_OLIVE,
  },

  // Stories Carousel
  storiesSection: {
    paddingVertical: 14,
    borderBottomWidth: 6,
    borderBottomColor: '#f0f3f4',
  },
  storiesRow: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: STORY_SIZE + 16,
  },
  storyRingOuter: {
    width: STORY_SIZE + STORY_RING * 2,
    height: STORY_SIZE + STORY_RING * 2,
    borderRadius: (STORY_SIZE + STORY_RING * 2) / 2,
    backgroundColor: COLOR_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingInner: {
    width: STORY_SIZE + STORY_RING,
    height: STORY_SIZE + STORY_RING,
    borderRadius: (STORY_SIZE + STORY_RING) / 2,
    backgroundColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImage: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyName: {
    fontSize: 11.5,
    color: '#333',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },

  // Visor de historias (pantalla completa)
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyViewerTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  storyViewerBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  storyProgressRow: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
  },
  storyProgressBarBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  storyProgressBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 28,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyViewerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  storyViewerAvatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 8,
    overflow: 'hidden',
  },
  storyViewerAvatar: {
    width: '100%',
    height: '100%',
  },
  storyViewerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  storyViewerInfo: {
    position: 'absolute',
    left: 16,
    right: 90,
    bottom: 36,
  },
  storyViewerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  storyViewerLocationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  storyViewerDesc: {
    color: '#f0f0f0',
    fontSize: 13,
    lineHeight: 18,
  },
  storyViewerSavedLabel: {
    color: COLOR_TEAL,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  storyViewerActions: {
    position: 'absolute',
    right: 14,
    bottom: 36,
    alignItems: 'center',
  },
  storyViewerActionBtn: {
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal de motivos de "no me gusta"
  dislikeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dislikeSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  dislikeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e3ea',
    alignSelf: 'center',
    marginBottom: 14,
  },
  dislikeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  dislikeSubtitle: {
    fontSize: 12.5,
    color: '#7A8489',
    marginBottom: 14,
    lineHeight: 17,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  dislikeCommentInput: {
    borderWidth: 1,
    borderColor: '#E7ECEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#333',
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  dislikeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  dislikeCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dislikeCancelText: {
    color: COLOR_TEAL,
    fontWeight: '700',
    fontSize: 14,
  },
  dislikeSubmitBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  dislikeSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});