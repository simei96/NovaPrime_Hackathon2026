import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot,
  orderBy, query, where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Modal,
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import DislikeReasonModal from '../../../components/community/DislikeReasonModal';
import PostCard from '../../../components/community/PostCard';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';

const STORY_SIZE = 64;
const STORY_RING = 3;

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

  // Historias (colección "Lugares") — sin cambios respecto a la versión anterior
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [loadingStoryDetail, setLoadingStoryDetail] = useState(false);
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [savedStories, setSavedStories] = useState({});
  const [savingStory, setSavingStory] = useState(false);

  // Feed de publicaciones (colección "Comunidad")
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  // {publicacionId: {meGusta, noMeGusta}} — contado desde InteraccionesPublicaciones
  const [likeCounts, setLikeCounts] = useState({});
  // {publicacionId: {docId, tipo}} — interacción del usuario actual
  const [interactionsMap, setInteractionsMap] = useState({});
  // {publicacionId: favoritoDocId} — publicaciones guardadas por el usuario actual
  const [savedPostsMap, setSavedPostsMap] = useState({});

  // Modal de "no me gusta" compartido entre historias y publicaciones
  const [dislikeModalVisible, setDislikeModalVisible] = useState(false);
  const [dislikeTarget, setDislikeTarget] = useState(null); // { type: 'story' | 'post', item }
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

  // Publicaciones activas de la comunidad, en tiempo real, más recientes primero.
  // Requiere un índice compuesto (estado + creadoEn) — Firestore te dará el link
  // para crearlo automáticamente la primera vez que corras esta consulta.
  useEffect(() => {
    const q = query(
      collection(db, 'Comunidad'),
      where('estado', '==', 'activo'),
      orderBy('creadoEn', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mapped = snap.docs.map((d) => ({ publicacionId: d.id, ...d.data() }));
        setPosts(mapped);
        setLoadingPosts(false);
      },
      (err) => {
        console.warn('Error cargando publicaciones de Comunidad:', err);
        setLoadingPosts(false);
      },
    );
    return () => unsub();
  }, []);

  // Todas las interacciones: sirve para contar me gusta / no me gusta por
  // publicación y para saber cuál es la reacción del usuario actual.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'InteraccionesPublicaciones'),
      (snap) => {
        const counts = {};
        const mine = {};
        snap.docs.forEach((d) => {
          const v = d.data();
          if (!v.publicacionId) return;
          if (!counts[v.publicacionId]) counts[v.publicacionId] = { meGusta: 0, noMeGusta: 0 };
          if (v.tipo === 'meGusta') counts[v.publicacionId].meGusta += 1;
          if (v.tipo === 'noMeGusta') counts[v.publicacionId].noMeGusta += 1;
          if (user && v.usuarioId === user.uid) {
            mine[v.publicacionId] = { docId: d.id, tipo: v.tipo };
          }
        });
        setLikeCounts(counts);
        setInteractionsMap(mine);
      },
      (err) => console.warn('Error cargando interacciones de publicaciones:', err),
    );
    return () => unsub();
  }, [user]);

  // Publicaciones que el usuario actual ya guardó en Favoritos
  useEffect(() => {
    if (!user) {
      setSavedPostsMap({});
      return;
    }
    const q = query(
      collection(db, 'Favoritos'),
      where('usuarioId', '==', user.uid),
      where('tipo', '==', 'publicacion'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          const v = d.data();
          if (v.publicacionId) map[v.publicacionId] = d.id;
        });
        setSavedPostsMap(map);
      },
      (err) => console.warn('Error cargando favoritos de publicaciones:', err),
    );
    return () => unsub();
  }, [user]);

  const storiesSource = stories.length ? stories : FALLBACK_STORIES;

  const headerDisplayName = user
    ? user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
    : 'Inicia sesión';

  // ---------- Historias (sin cambios funcionales) ----------

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

  function onPressStoryDislike(story) {
    if (!story) return;
    if (disliked[story.id]) {
      setDisliked((prev) => ({ ...prev, [story.id]: false }));
      return;
    }
    setDislikeTarget({ type: 'story', item: story });
    setSelectedReasons({});
    setDislikeComment('');
    setDislikeModalVisible(true);
  }

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

  // ---------- Feed de publicaciones (Comunidad) ----------

  async function togglePostLike(post) {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar me gusta.');
      router.push('/login');
      return;
    }
    const existing = interactionsMap[post.publicacionId];
    try {
      if (existing) {
        await deleteDoc(doc(db, 'InteraccionesPublicaciones', existing.docId));
      }
      if (!existing || existing.tipo !== 'meGusta') {
        await addDoc(collection(db, 'InteraccionesPublicaciones'), {
          publicacionId: post.publicacionId,
          usuarioId: user.uid,
          tipo: 'meGusta',
          creadoEn: new Date(),
        });
      }
    } catch (e) {
      console.warn('Error actualizando me gusta:', e);
      Alert.alert('Error', 'No se pudo actualizar tu reacción.');
    }
  }

  function onPressPostDislike(post) {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para calificar publicaciones.');
      router.push('/login');
      return;
    }
    const existing = interactionsMap[post.publicacionId];
    if (existing && existing.tipo === 'noMeGusta') {
      deleteDoc(doc(db, 'InteraccionesPublicaciones', existing.docId)).catch((e) =>
        console.warn('Error quitando no me gusta:', e),
      );
      return;
    }
    setDislikeTarget({ type: 'post', item: post });
    setSelectedReasons({});
    setDislikeComment('');
    setDislikeModalVisible(true);
  }

  async function togglePostSave(post) {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para guardar publicaciones.');
      router.push('/login');
      return;
    }
    const existingDocId = savedPostsMap[post.publicacionId];
    try {
      if (existingDocId) {
        await deleteDoc(doc(db, 'Favoritos', existingDocId));
      } else {
        await addDoc(collection(db, 'Favoritos'), {
          usuarioId: user.uid,
          tipo: 'publicacion',
          publicacionId: post.publicacionId,
          creadoEn: new Date(),
        });
      }
    } catch (e) {
      console.warn('Error actualizando favorito:', e);
      Alert.alert('Error', 'No se pudo actualizar tus favoritos.');
    }
  }

  // ---------- Modal de "no me gusta" (compartido) ----------

  function toggleReasonOption(reasonId) {
    setSelectedReasons((prev) => ({ ...prev, [reasonId]: !prev[reasonId] }));
  }

  function closeDislikeModal() {
    setDislikeModalVisible(false);
  }

  async function submitDislike() {
    if (!dislikeTarget) return;
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para calificar.');
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
      if (dislikeTarget.type === 'post') {
        const post = dislikeTarget.item;
        const existing = interactionsMap[post.publicacionId];
        if (existing) {
          await deleteDoc(doc(db, 'InteraccionesPublicaciones', existing.docId));
        }
        await addDoc(collection(db, 'InteraccionesPublicaciones'), {
          publicacionId: post.publicacionId,
          usuarioId: user.uid,
          tipo: 'noMeGusta',
          motivos,
          comentario: dislikeComment.trim(),
          creadoEn: new Date(),
        });
      } else {
        // Historia (Lugares) — mismo comportamiento de antes
        const story = dislikeTarget.item;
        await addDoc(collection(db, 'InteraccionesLugares'), {
          lugarId: story.id,
          userId: user.uid,
          tipo: 'noMeGusta',
          motivos,
          comentario: dislikeComment.trim(),
          creadoEn: new Date(),
        });
        setDisliked((prev) => ({ ...prev, [story.id]: true }));
        setLiked((prev) => ({ ...prev, [story.id]: false }));
      }
      setDislikeModalVisible(false);
    } catch (e) {
      console.warn('Error guardando el motivo de no me gusta:', e);
      Alert.alert('Error', 'No se pudo guardar tu respuesta. Intenta de nuevo.');
    } finally {
      setSubmittingDislike(false);
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

        {/* Feed de publicaciones de la comunidad */}
        <View style={styles.feedSection}>
          {loadingPosts ? (
            <ActivityIndicator size="small" color={COLOR_TEAL} style={{ marginVertical: 20 }} />
          ) : posts.length === 0 ? (
            <Text style={styles.emptyFeedText}>Todavía no hay publicaciones activas.</Text>
          ) : (
            posts.map((post) => {
              const counts = likeCounts[post.publicacionId] || { meGusta: 0, noMeGusta: 0 };
              const myInteraction = interactionsMap[post.publicacionId]?.tipo || null;
              const isSaved = !!savedPostsMap[post.publicacionId];
              return (
                <PostCard
                  key={post.publicacionId}
                  post={post}
                  likeCount={counts.meGusta}
                  userInteraction={myInteraction}
                  isSaved={isSaved}
                  onToggleLike={togglePostLike}
                  onPressDislike={onPressPostDislike}
                  onToggleSave={togglePostSave}
                />
              );
            })
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

              <View style={styles.storyProgressRow}>
                <View style={styles.storyProgressBarBg}>
                  <View style={styles.storyProgressBarFill} />
                </View>
              </View>

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
                  onPress={() => onPressStoryDislike(activeStory)}
                >
                  <MaterialCommunityIcons
                    name={disliked[activeStory.id] ? 'thumb-down' : 'thumb-down-outline'}
                    size={24}
                    color={disliked[activeStory.id] ? '#FF5252' : '#fff'}
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

      {/* Modal de "no me gusta" compartido (historias y publicaciones) */}
      <DislikeReasonModal
        visible={dislikeModalVisible}
        selectedReasons={selectedReasons}
        onToggleReason={toggleReasonOption}
        comment={dislikeComment}
        onChangeComment={setDislikeComment}
        submitting={submittingDislike}
        onCancel={closeDislikeModal}
        onSubmit={submitDislike}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafd' },

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
  headerSpacer: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR_OLIVE,
    fontFamily: 'Montserrat-Bold',
  },
  headerUserWrap: { width: 90, alignItems: 'flex-end' },
  headerUserText: { fontSize: 15, fontWeight: '700', color: COLOR_OLIVE },

  // Stories Carousel
  storiesSection: {
    paddingVertical: 14,
    borderBottomWidth: 6,
    borderBottomColor: '#f0f3f4',
  },
  storiesRow: { paddingHorizontal: 16, gap: 14 },
  storyItem: { alignItems: 'center', marginRight: 14, width: STORY_SIZE + 16 },
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
  storyName: { fontSize: 11.5, color: '#333', fontWeight: '600', marginTop: 6, textAlign: 'center' },

  // Feed de publicaciones
  feedSection: { paddingTop: 16 },
  emptyFeedText: { textAlign: 'center', color: '#7A8489', fontSize: 13, marginTop: 24 },

  // Visor de historias (pantalla completa)
  storyViewerContainer: { flex: 1, backgroundColor: '#000' },
  storyViewerImage: { ...StyleSheet.absoluteFillObject },
  storyViewerTopOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  storyViewerBottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  storyProgressRow: { position: 'absolute', top: 14, left: 12, right: 12 },
  storyProgressBarBg: {
    height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden',
  },
  storyProgressBarFill: { width: '100%', height: '100%', backgroundColor: '#fff' },
  storyViewerHeader: {
    position: 'absolute', top: 28, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  storyViewerHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  storyViewerAvatarRing: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#fff',
    marginRight: 8, overflow: 'hidden',
  },
  storyViewerAvatar: { width: '100%', height: '100%' },
  storyViewerName: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 },
  storyViewerInfo: { position: 'absolute', left: 16, right: 90, bottom: 36 },
  storyViewerLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  storyViewerLocationText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 4 },
  storyViewerDesc: { color: '#f0f0f0', fontSize: 13, lineHeight: 18 },
  storyViewerSavedLabel: { color: COLOR_TEAL, fontSize: 12, fontWeight: '700', marginTop: 8 },
  storyViewerActions: { position: 'absolute', right: 14, bottom: 36, alignItems: 'center' },
  storyViewerActionBtn: { marginBottom: 22, alignItems: 'center', justifyContent: 'center' },
});