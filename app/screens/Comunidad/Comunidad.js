import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Paleta de color
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';

const STORY_SIZE = 64;
const STORY_RING = 3;

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

// Respaldo de publicaciones mientras Firestore responde o si
// "ComunidadPosts" todavía no tiene documentos
const FALLBACK_POSTS = [
  {
    id: 'post-1',
    usuario: 'Ana Guía Local',
    avatarURL:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
    imagenURL:
      'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80',
    descripcion:
      'Recorrido guiado por el centro histórico de Granada, con parada en la Catedral y el malecón del lago Cocibolca. Ideal para grupos pequeños que buscan una experiencia cultural auténtica.',
    interacciones: 4.8,
    ubicacion: 'Granada, Nicaragua',
  },
  {
    id: 'post-2',
    usuario: 'Carlos Anfitrión',
    avatarURL:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    imagenURL:
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    descripcion:
      'Kayak al amanecer en la Isla de Ometepe, rodeado de los volcanes Concepción y Maderas. Incluye equipo y guía certificado.',
    interacciones: 4.9,
    ubicacion: 'Ometepe, Nicaragua',
  },
];

export default function CalendarScreen() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser || null);

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [dismissed, setDismissed] = useState({});
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [expanded, setExpanded] = useState({});

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
              name: v.Ciudad || v.Nombre || v.name || 'Destino',
              imageURL: v.ImagenURL || v.imagen || v.Imagen || null,
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

  // Post Card feed: colección "ComunidadPosts"
  useEffect(() => {
    const ref = collection(db, 'ComunidadPosts');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const mapped = snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            usuario: v.Usuario || v.usuario || 'Usuario',
            avatarURL: v.AvatarURL || v.avatarURL || null,
            imagenURL: v.ImagenURL || v.imagenURL || null,
            descripcion: v.Descripcion || v.descripcion || '',
            interacciones:
              typeof v.Interacciones === 'number'
                ? v.Interacciones
                : typeof v.interacciones === 'number'
                  ? v.interacciones
                  : 0,
            ubicacion: v.Ubicacion || v.ubicacion || '',
          };
        });
        setPosts(mapped);
        setLoadingPosts(false);
      },
      (err) => {
        console.warn('Error cargando ComunidadPosts:', err);
        setLoadingPosts(false);
      },
    );
    return () => unsub();
  }, []);

  const storiesSource = stories.length ? stories : FALLBACK_STORIES;
  const postsSource = (posts.length ? posts : FALLBACK_POSTS).filter(
    (p) => !dismissed[p.id],
  );

  const headerDisplayName = user
    ? user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
    : 'Inicia sesión';

  function goToCreate() {
    // TODO: ajustar a la ruta real de creación de historia/publicación
    try {
      router.push('/community/create');
    } catch (e) {
      console.warn('No se pudo abrir la pantalla de creación', e);
    }
  }

  function toggleLike(id) {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSave(id) {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleExpanded(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function dismissPost(id) {
    setDismissed((prev) => ({ ...prev, [id]: true }));
  }

  function contactHost() {
    // conectar con el flujo real de contacto (chat, WhatsApp, etc.)
    console.log('Contactar anfitrión');
  }

  function reservar(post) {
    try {
      router.push(`/reservations/${post.id}`);
    } catch (e) {
      console.warn('No se pudo abrir la reserva', e);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header: + a la izquierda, "Comunidad" centrado, usuario a la derecha */}
      <View style={styles.headerFixed}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={goToCreate}
          style={styles.addBtn}
          accessibilityLabel="Agregar historia o publicación"
        >
          <MaterialCommunityIcons name="plus" size={24} color={COLOR_TEAL} />
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
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100}}
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

        {/* Post Card feed */}
        {loadingPosts ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLOR_TEAL} />
            <Text style={styles.loadingText}>Cargando publicaciones...</Text>
          </View>
        ) : (
          postsSource.map((post) => {
            const isExpanded = !!expanded[post.id];
            const shortDesc =
              post.descripcion.length > 110 && !isExpanded
                ? `${post.descripcion.slice(0, 110).trim()}…`
                : post.descripcion;

            return (
              <View key={post.id} style={styles.postCard}>
                {/* Imagen principal + cabecera superpuesta */}
                <View style={styles.postImageWrap}>
                  {post.imagenURL ? (
                    <Image
                      source={{ uri: post.imagenURL }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.postImage, styles.postImagePlaceholder]}>
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={30}
                        color="#c7d0d6"
                      />
                    </View>
                  )}
                  <View style={styles.postImageOverlayTop} />

                  {/* Cabecera: avatar + usuario, puntuación, menú contextual */}
                  <View style={styles.postHeaderRow}>
                    <View style={styles.postUserWrap}>
                      {post.avatarURL ? (
                        <Image
                          source={{ uri: post.avatarURL }}
                          style={styles.postAvatar}
                        />
                      ) : (
                        <View style={[styles.postAvatar, styles.postAvatarPlaceholder]}>
                          <MaterialCommunityIcons
                            name="account"
                            size={16}
                            color="#fff"
                          />
                        </View>
                      )}
                      <Text style={styles.postUsername} numberOfLines={1}>
                        {post.usuario}
                      </Text>
                    </View>

                    <View style={styles.postScoreWrap}>
                      <MaterialCommunityIcons
                        name="star"
                        size={13}
                        color="#FFD700"
                      />
                      <Text style={styles.postScoreText}>
                        {post.interacciones}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.postMenuBtn}
                      hitSlop={8}
                      onPress={() => dismissPost(post.id)}
                    >
                      <MaterialCommunityIcons
                        name="dots-horizontal"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Barra flotante de interacciones sobre la imagen */}
                  <View style={styles.postActionsBar}>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => toggleLike(post.id)}
                    >
                      <MaterialCommunityIcons
                        name={liked[post.id] ? 'heart' : 'heart-outline'}
                        size={18}
                        color={liked[post.id] ? COLOR_ORANGE : '#fff'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => toggleSave(post.id)}
                    >
                      <MaterialCommunityIcons
                        name={saved[post.id] ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={saved[post.id] ? COLOR_TEAL : '#fff'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={contactHost}
                    >
                      <MaterialCommunityIcons
                        name="message-text-outline"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.postActionBtn}
                      onPress={() => dismissPost(post.id)}
                    >
                      <MaterialCommunityIcons
                        name="thumb-down-outline"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Cuerpo de texto */}
                <View style={styles.postBody}>
                  {!!post.ubicacion && (
                    <View style={styles.postLocationRow}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={13}
                        color="#888"
                      />
                      <Text style={styles.postLocationText}>
                        {post.ubicacion}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.postDesc}>
                    {shortDesc}
                    {post.descripcion.length > 110 && (
                      <Text
                        style={styles.postSeeMore}
                        onPress={() => toggleExpanded(post.id)}
                      >
                        {isExpanded ? '  Ver menos' : '  Ver más'}
                      </Text>
                    )}
                  </Text>

                  {/* CTA Reservar */}
                  <TouchableOpacity
                    style={styles.reservarBtn}
                    activeOpacity={0.85}
                    onPress={() => reservar(post)}
                  >
                    <Text style={styles.reservarBtnText}>Reservar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  addBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
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

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginLeft: 8,
    color: COLOR_TEAL,
    fontSize: 13,
  },

  // Post Card
  postCard: {
	backgroundColor: '#fff',
	borderRadius: 10,
	marginHorizontal: 16,
	marginTop: 16,
	marginBottom: 20,
	overflow: 'hidden',
	borderWidth: 1.5,
	borderColor: '#8FB32E',
	elevation: 2,
	shadowColor: '#8FB32E',
	shadowOpacity: 1,
	shadowRadius: 8,
	shadowOffset: { width: 0, height: 3 },
  },
  postImageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#eceff1',
  },
  postImage: { width: '100%', height: '100%' },
  postImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImageOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  postHeaderRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  postUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 35,
    height: 35,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: '#8FB32E',
  },
  postAvatarPlaceholder: {
    backgroundColor: '#8FB32E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postUsername: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    maxWidth: 120,
  },
  postScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  postScoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  postMenuBtn: {
    padding: 8,
  },

  postActionsBar: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: '#8FB32E',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  postActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  postBody: {
    padding: 14,
  },
  postLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  postLocationText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  postDesc: {
    fontSize: 13.5,
    color: '#333',
    lineHeight: 19,
    marginBottom: 14,
  },
  postSeeMore: {
    color: COLOR_TEAL,
    fontWeight: '700',
  },

  reservarBtn: {
    backgroundColor: COLOR_OLIVE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reservarBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});