import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot,
  orderBy, query, updateDoc, where,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Image, Linking, Modal,
  Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import DislikeReasonModal from '../../../components/community/DislikeReasonModal';
import PostCard from '../../../components/community/PostCard';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';
const COLOR_TEXT_MUTED = '#7A8489';
const COLOR_STAR = '#F5B400';

const STORY_SIZE = 64;
const STORY_RING = 3;

// Duración de cada historia antes de avanzar automáticamente a la siguiente
const STORY_DURATION_MS = 5000;

// Devuelve el valor solo si es un string renderizable; si es un GeoPoint,
// Timestamp, DocumentReference u otro objeto de Firestore, devuelve '' en
// vez de romper el render (ver historial: esto ya nos mordió una vez con
// un GeoPoint puesto directo en un <Text>).
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

// Abre la app de mapas nativa (o Google Maps en el navegador como respaldo)
// apuntando a un GeoPoint de Firestore.
function openDirections(geoPoint) {
  if (!geoPoint || typeof geoPoint.latitude !== 'number' || typeof geoPoint.longitude !== 'number') {
    return;
  }
  const { latitude, longitude } = geoPoint;
  const nativeUrl =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${latitude},${longitude}`
      : `geo:0,0?q=${latitude},${longitude}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  Linking.openURL(nativeUrl).catch(() => Linking.openURL(webUrl));
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

  // Historias (colección "Lugares")
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeStory, setActiveStory] = useState(null);
  const [loadingStoryDetail, setLoadingStoryDetail] = useState(false);
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [savedStories, setSavedStories] = useState({});
  const [savingStory, setSavingStory] = useState(false);

  // Animación de la barra de progreso de historias
  const storyProgress = useRef(new Animated.Value(0)).current;
  const storyAnimationRef = useRef(null);

  // Feed de publicaciones
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [interactionsMap, setInteractionsMap] = useState({});
  const [savedPostsMap, setSavedPostsMap] = useState({});
  const [lugarNombres, setLugarNombres] = useState({});
  const lugarNombresCache = useRef({});

  const [postViewerVisible, setPostViewerVisible] = useState(false);
  const [activePost, setActivePost] = useState(null);

  const [dislikeModalVisible, setDislikeModalVisible] = useState(false);
  const [dislikeTarget, setDislikeTarget] = useState(null);
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

  // Publicaciones de la comunidad, en tiempo real, más recientes primero.
  useEffect(() => {
    const q = query(collection(db, 'ComunidadPosts'), orderBy('creadoEn', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mapped = snap.docs.map((d) => ({ publicacionId: d.id, ...d.data() }));
        setPosts(mapped);
        setLoadingPosts(false);

        mapped.forEach((post) => {
          const ref = post.contenidoId;
          if (!ref || typeof ref !== 'object' || !ref.path) return;
          if (lugarNombresCache.current[ref.path] !== undefined) return;
          lugarNombresCache.current[ref.path] = null;
          getDoc(ref)
            .then((snapLugar) => {
              const v = snapLugar.exists() ? snapLugar.data() : {};
              const nombre = safeText(v.nombre) || safeText(v.Nombre) || '';
              lugarNombresCache.current[ref.path] = nombre;
              setLugarNombres((prev) => ({ ...prev, [ref.path]: nombre }));
            })
            .catch(() => {
              lugarNombresCache.current[ref.path] = '';
            });
        });
      },
      (err) => {
        console.warn('Error cargando publicaciones (ComunidadPosts):', err);
        setLoadingPosts(false);
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activePost) return;
    const fresh = posts.find((p) => p.publicacionId === activePost.publicacionId);
    if (fresh) setActivePost(fresh);
  }, [posts]);

  useEffect(() => {
    if (!user) {
      setInteractionsMap({});
      return;
    }
    const q = query(
      collection(db, 'InteraccionesPublicaciones'),
      where('usuarioId', '==', user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mine = {};
        snap.docs.forEach((d) => {
          const v = d.data();
          if (v.publicacionId) mine[v.publicacionId] = { docId: d.id, tipo: v.tipo };
        });
        setInteractionsMap(mine);
      },
      (err) => console.warn('Error cargando interacciones de publicaciones:', err),
    );
    return () => unsub();
  }, [user]);

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


  async function loadStoryDetail(story) {
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
                titulo: safeText(v.titulo) || safeText(v.Titulo) || prev.name,
                descripcion: safeText(v.descripcion) || safeText(v.Descripcion),
                ubicacion:
                  safeText(v.direccion) ||
                  safeText(v.Ubicacion) ||
                  safeText(v.ubicacion) ||
                  formatGeoPoint(v.coordenadas) ||
                  prev.name,
                categoria: safeText(v.categoria) || safeText(v.Categoria),
                likesCount: typeof v.meGustaCount === 'number' ? v.meGustaCount : 0,
                dislikesCount: typeof v.noMeGustaCount === 'number' ? v.noMeGustaCount : 0,
                savedCount: typeof v.guardadosCount === 'number' ? v.guardadosCount : 0,
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

  function openStoryAtIndex(index) {
    const source = storiesSource;
    if (index < 0 || index >= source.length) {
      closeStory();
      return;
    }
    const story = source[index];
    setActiveStoryIndex(index);
    setActiveStory(story);
    setStoryModalVisible(true);
    loadStoryDetail(story);
  }

  function openStory(story) {
    const index = storiesSource.findIndex((s) => s.id === story.id);
    openStoryAtIndex(index === -1 ? 0 : index);
  }

  function closeStory() {
    storyAnimationRef.current && storyAnimationRef.current.stop();
    setStoryModalVisible(false);
    setActiveStory(null);
  }

  function goToNextStory() {
    if (activeStoryIndex >= storiesSource.length - 1) {
      closeStory();
      return;
    }
    openStoryAtIndex(activeStoryIndex + 1);
  }

  function goToPrevStory() {
    if (activeStoryIndex <= 0) {
      openStoryAtIndex(0);
      return;
    }
    openStoryAtIndex(activeStoryIndex - 1);
  }

  useEffect(() => {
    if (!storyModalVisible) return undefined;

    storyProgress.setValue(0);
    storyAnimationRef.current = Animated.timing(storyProgress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });
    storyAnimationRef.current.start(({ finished }) => {
      if (finished) goToNextStory();
    });

    return () => {
      storyAnimationRef.current && storyAnimationRef.current.stop();
    };
  }, [storyModalVisible, activeStoryIndex]);

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

  // ---------- Feed de publicaciones (ComunidadPosts) ----------

  async function togglePostLike(post) {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar me gusta.');
      router.push('/login');
      return;
    }
    const existing = interactionsMap[post.publicacionId];
    const postRef = doc(db, 'ComunidadPosts', post.publicacionId);
    try {
      if (existing) {
        await deleteDoc(doc(db, 'InteraccionesPublicaciones', existing.docId));
        if (existing.tipo === 'meGusta') {
          await updateDoc(postRef, { meGustaCount: increment(-1) });
        }
      }
      if (!existing || existing.tipo !== 'meGusta') {
        await addDoc(collection(db, 'InteraccionesPublicaciones'), {
          publicacionId: post.publicacionId,
          usuarioId: user.uid,
          tipo: 'meGusta',
          creadoEn: new Date(),
        });
        await updateDoc(postRef, { meGustaCount: increment(1) });
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

  function openPostViewer(post) {
    setActivePost(post);
    setPostViewerVisible(true);
  }

  function closePostViewer() {
    setPostViewerVisible(false);
    setActivePost(null);
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
          if (existing.tipo === 'meGusta') {
            await updateDoc(doc(db, 'ComunidadPosts', post.publicacionId), {
              meGustaCount: increment(-1),
            });
          }
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

  const activePostInteraction = activePost ? interactionsMap[activePost.publicacionId]?.tipo || null : null;
  const activePostSaved = activePost ? !!savedPostsMap[activePost.publicacionId] : false;
  const activePostLugar = activePost?.contenidoId?.path ? lugarNombres[activePost.contenidoId.path] : '';
  const activePostStars = activePost ? activePost.calificacionEstrellas || 0 : 0;
  const activePostHasLocation =
    !!activePost &&
    !!activePost.Ubicacion &&
    typeof activePost.Ubicacion.latitude === 'number' &&
    typeof activePost.Ubicacion.longitude === 'number';

  // Contadores mostrados en la historia activa (base de Firestore + ajuste
  // local optimista, ya que las reacciones de historias no se persisten hoy)
  const displayedLikes = activeStory
    ? (activeStory.likesCount || 0) + (liked[activeStory.id] ? 1 : 0)
    : 0;
  const displayedDislikes = activeStory
    ? (activeStory.dislikesCount || 0) + (disliked[activeStory.id] ? 1 : 0)
    : 0;
  const displayedSaved = activeStory
    ? (activeStory.savedCount || 0) + (savedStories[activeStory.id] ? 1 : 0)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header: flecha, usuario + avatar a la derecha */}
      <View style={styles.headerFixed}>
        <TouchableOpacity
          onPress={() => (router.canGoBack?.() ? router.back() : null)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerBackBtn}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLOR_OLIVE} />
        </TouchableOpacity>

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
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.headerUserAvatar} />
          ) : (
            <View style={[styles.headerUserAvatar, styles.headerUserAvatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={14} color="#fff" />
            </View>
          )}
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
              const myInteraction = interactionsMap[post.publicacionId]?.tipo || null;
              const isSaved = !!savedPostsMap[post.publicacionId];
              const lugarNombre = post.contenidoId?.path ? lugarNombres[post.contenidoId.path] : '';
              return (
                <PostCard
                  key={post.publicacionId}
                  post={post}
                  lugarNombre={lugarNombre}
                  userInteraction={myInteraction}
                  isSaved={isSaved}
                  onToggleLike={togglePostLike}
                  onPressDislike={onPressPostDislike}
                  onToggleSave={togglePostSave}
                  onOpenDetail={openPostViewer}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Visor de historias a pantalla completa (Lugares) */}
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

              {/* Zonas invisibles de toque: izquierda = historia anterior, derecha = siguiente */}
              <View style={styles.storyTapZones} pointerEvents="box-none">
                <Pressable style={{ flex: 1 }} onPress={goToPrevStory} />
                <Pressable style={{ flex: 1 }} onPress={goToNextStory} />
              </View>

              {/* Barra de progreso segmentada, una por historia */}
              <View style={styles.storyProgressRow} pointerEvents="none">
                {storiesSource.map((s, idx) => {
                  let fillStyle;
                  if (idx < activeStoryIndex) {
                    fillStyle = { width: '100%' };
                  } else if (idx === activeStoryIndex) {
                    fillStyle = {
                      width: storyProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    };
                  } else {
                    fillStyle = { width: '0%' };
                  }
                  return (
                    <View key={s.id} style={styles.storyProgressSegmentBg}>
                      <Animated.View style={[styles.storyProgressSegmentFill, fillStyle]} />
                    </View>
                  );
                })}
              </View>

              <View style={styles.storyViewerHeader}>
                <View style={styles.storyViewerHeaderLeft}>
                  <View style={styles.storyViewerAvatarRing}>
                    <Image
                      source={{ uri: activeStory.imageURL }}
                      style={styles.storyViewerAvatar}
                    />
                  </View>
                  <View>
                    <Text style={styles.storyViewerName} numberOfLines={1}>
                      {activeStory.name}
                    </Text>
                    <Text style={styles.storyViewerSubtitle} numberOfLines={1}>
                      Nicaragua
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={closeStory}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.storyCloseBtn}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.storyViewerInfo} pointerEvents="none">
                <Text style={styles.storyViewerTitle} numberOfLines={2}>
                  {activeStory.titulo || activeStory.name}
                </Text>
                {!!activeStory.ubicacion && (
                  <View style={styles.storyViewerLocationRow}>
                    <MaterialCommunityIcons name="map-marker" size={14} color={COLOR_TEAL} />
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

              {/* Acciones: círculos translúcidos con el contador debajo */}
              <View style={styles.storyViewerActions}>
                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => toggleStoryLike(activeStory.id)}
                >
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons
                      name={liked[activeStory.id] ? 'heart' : 'heart-outline'}
                      size={22}
                      color={liked[activeStory.id] ? COLOR_ORANGE : '#fff'}
                    />
                  </View>
                  <Text style={styles.storyActionCount}>{displayedLikes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => onPressStoryDislike(activeStory)}
                >
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons
                      name={disliked[activeStory.id] ? 'thumb-down' : 'thumb-down-outline'}
                      size={20}
                      color={disliked[activeStory.id] ? '#FF5252' : '#fff'}
                    />
                  </View>
                  <Text style={styles.storyActionCount}>{displayedDislikes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => saveStoryAsFavorito(activeStory)}
                >
                  <View style={styles.storyActionCircle}>
                    {savingStory ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons
                        name={savedStories[activeStory.id] ? 'bookmark' : 'bookmark-outline'}
                        size={22}
                        color={savedStories[activeStory.id] ? COLOR_TEAL : '#fff'}
                      />
                    )}
                  </View>
                  <Text style={styles.storyActionCount}>{displayedSaved}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Vista de publicación a pantalla completa (estilo historia).
          Sin comentarios: se quitó el botón/contador de comentarios y la
          barra de escribir comentario. Se agregaron estrellas y botón de
          "Cómo llegar" usando el GeoPoint "Ubicacion" del post. */}
      <Modal
        visible={postViewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={closePostViewer}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.storyViewerContainer}>
          {activePost && (
            <>
              {activePost.imagenURL ? (
                <Image
                  source={{ uri: activePost.imagenURL }}
                  style={styles.storyViewerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.storyViewerImage, { backgroundColor: COLOR_TEAL }]} />
              )}
              <View style={styles.storyViewerTopOverlay} />
              <View style={styles.storyViewerBottomOverlay} />

              <View style={styles.storyViewerHeader}>
                <View style={styles.storyViewerHeaderLeft}>
                  <View style={styles.storyViewerAvatarRing}>
                    {activePost.fotoPerfilURL ? (
                      <Image
                        source={{ uri: activePost.fotoPerfilURL }}
                        style={styles.storyViewerAvatar}
                      />
                    ) : (
                      <View style={[styles.storyViewerAvatar, styles.postViewerAvatarPlaceholder]}>
                        <MaterialCommunityIcons name="account" size={16} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.storyViewerName} numberOfLines={1}>
                      {activePost.nombreUsuario || 'Usuario'}
                    </Text>
                    {!!activePostLugar && (
                      <Text style={styles.postViewerLocation} numberOfLines={1}>
                        {activePostLugar}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={closePostViewer}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.storyCloseBtn}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.postViewerInfo} pointerEvents="none">
                {!!activePost.texto && (
                  <Text style={styles.storyViewerDesc} numberOfLines={4}>
                    {activePost.texto}
                  </Text>
                )}
              </View>

              <View style={styles.postViewerActions}>
                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => togglePostLike(activePost)}
                >
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons
                      name={activePostInteraction === 'meGusta' ? 'heart' : 'heart-outline'}
                      size={22}
                      color={activePostInteraction === 'meGusta' ? COLOR_ORANGE : '#fff'}
                    />
                  </View>
                  <Text style={styles.storyActionCount}>{activePost.meGustaCount || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => onPressPostDislike(activePost)}
                >
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons
                      name={activePostInteraction === 'noMeGusta' ? 'thumb-down' : 'thumb-down-outline'}
                      size={20}
                      color={activePostInteraction === 'noMeGusta' ? '#FF5252' : '#fff'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Estrellas */}
                <View style={styles.storyActionItem}>
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons name="star" size={20} color={COLOR_STAR} />
                  </View>
                  <Text style={styles.storyActionCount}>{activePostStars}</Text>
                </View>

                {activePostHasLocation && (
                  <TouchableOpacity
                    style={styles.storyActionItem}
                    onPress={() => openDirections(activePost.Ubicacion)}
                  >
                    <View style={styles.storyActionCircle}>
                      <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#fff" />
                    </View>
                    <Text style={styles.storyActionCount}>Ir</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.storyActionItem}
                  onPress={() => togglePostSave(activePost)}
                >
                  <View style={styles.storyActionCircle}>
                    <MaterialCommunityIcons
                      name={activePostSaved ? 'bookmark' : 'bookmark-outline'}
                      size={22}
                      color={activePostSaved ? COLOR_TEAL : '#fff'}
                    />
                  </View>
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
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e3ea',
  },
  headerBackBtn: { width: 30, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    marginLeft: 4,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR_OLIVE,
    fontFamily: 'Montserrat-Bold',
  },
  headerUserWrap: { flexDirection: 'row', alignItems: 'center' },
  headerUserText: { fontSize: 13.5, fontWeight: '700', color: '#333', marginRight: 8 },
  headerUserAvatar: { width: 28, height: 28, borderRadius: 14 },
  headerUserAvatarPlaceholder: {
    backgroundColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  emptyFeedText: { textAlign: 'center', color: COLOR_TEXT_MUTED, fontSize: 13, marginTop: 24 },

  // Visor a pantalla completa (compartido: historias y publicaciones)
  storyViewerContainer: { flex: 1, backgroundColor: '#000' },
  storyViewerImage: { ...StyleSheet.absoluteFillObject },
  storyViewerTopOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  storyViewerBottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Zonas de toque invisibles para navegar entre historias
  storyTapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },

  // Barra de progreso segmentada (una por historia)
  storyProgressRow: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 2,
  },
  storyProgressSegmentBg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  storyProgressSegmentFill: { height: '100%', backgroundColor: '#fff' },

  storyViewerHeader: {
    position: 'absolute', top: 28, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 2,
  },
  storyViewerHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  storyViewerAvatarRing: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#fff',
    marginRight: 8, overflow: 'hidden',
  },
  storyViewerAvatar: { width: '100%', height: '100%' },
  postViewerAvatarPlaceholder: {
    backgroundColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyViewerName: { color: '#fff', fontWeight: '700', fontSize: 15, flexShrink: 1 },
  storyViewerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 1 },
  storyCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  postViewerLocation: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 1 },

  storyViewerInfo: { position: 'absolute', left: 16, right: 90, bottom: 36, zIndex: 2 },
  storyViewerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  storyViewerLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  storyViewerLocationText: { color: '#fff', fontSize: 12.5, fontWeight: '600', marginLeft: 4 },
  storyViewerDesc: { color: '#e4e7e9', fontSize: 12.5, lineHeight: 18 },
  storyViewerSavedLabel: { color: COLOR_TEAL, fontSize: 12, fontWeight: '700', marginTop: 8 },

  // Acciones del visor de historias: círculos translúcidos + contador
  storyViewerActions: {
    position: 'absolute', right: 14, bottom: 36, alignItems: 'center', zIndex: 2,
  },
  storyActionItem: { alignItems: 'center', marginBottom: 18 },
  storyActionCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  storyActionCount: { color: '#fff', fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  postViewerInfo: { position: 'absolute', left: 16, right: 90, bottom: 36 },
  postViewerActions: { position: 'absolute', right: 14, bottom: 36, alignItems: 'center' },
});