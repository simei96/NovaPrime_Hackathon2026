import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_DISLIKE, COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Límites de proporción tipo Instagram: no deja que una imagen se vea
// "estirada" en extremo. Una imagen muy alta (retrato) se limita a 4:5
// (0.8) y una muy ancha (paisaje) se limita a 1.91:1. Fuera de esos
// límites, se usa resizeMode="contain" con barras de fondo (letterbox)
// en vez de recortar o deformar la imagen.
const MIN_ASPECT_RATIO = 0.8; // 4:5 (retrato)
const MAX_ASPECT_RATIO = 1.91; // paisaje ancho

// Abre la app de mapas nativa (o Google Maps en el navegador como respaldo)
// apuntando al GeoPoint guardado en el campo "Ubicacion" del post.
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

// Abre WhatsApp con el número guardado en el campo "contacto" del post.
// Limpia el string a solo dígitos (y el "+" inicial si lo tenía) porque
// wa.me no acepta espacios, guiones ni paréntesis.
function openWhatsApp(contacto) {
  if (!contacto) return;
  const digits = String(contacto).replace(/[^\d]/g, '');
  if (!digits) return;
  const url = `https://wa.me/${digits}`;
  Linking.openURL(url).catch(() => {
    console.warn('No se pudo abrir WhatsApp para el número:', contacto);
  });
}

// Imagen estilo Instagram: calcula la proporción real de la imagen (una
// sola vez, con Image.getSize) para no recortarla ni deformarla. Mientras
// no se conoce la proporción, usa un cuadrado (1:1) como placeholder para
// no saltar de tamaño cuando termine de cargar.
function PostImage({ uri }) {
  const [aspectRatio, setAspectRatio] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!uri) return;
    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (!active || !width || !height) return;
        const ratio = width / height;
        const clamped = Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, ratio));
        setAspectRatio(clamped);
      },
      () => {
        // Si falla el cálculo de tamaño, se queda en 1:1 (cuadrado) como
        // respaldo seguro; no rompe el render.
      },
    );
    return () => {
      active = false;
    };
  }, [uri]);

  if (!uri || errored) {
    return (
      <View style={[styles.postImageWrap, { aspectRatio: 1 }, styles.postImagePlaceholder]}>
        <MaterialCommunityIcons name="image-outline" size={32} color="#c7d0d6" />
      </View>
    );
  }

  return (
    <View style={[styles.postImageWrap, { aspectRatio }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoadEnd={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.postImageLoader]}>
          <ActivityIndicator size="small" color={COLOR_TEAL} />
        </View>
      )}
    </View>
  );
}

export default function PostCard({
  post,
  lugarNombre,
  userInteraction, // 'meGusta' | 'noMeGusta' | null
  isSaved,
  onToggleLike,
  onPressDislike,
  onToggleSave,
}) {
  const liked = userInteraction === 'meGusta';
  const disliked = userInteraction === 'noMeGusta';
  const likeCount = post.meGustaCount || 0;
  const starsCount = post.calificacionEstrellas || 0;
  const hasLocation =
    post.Ubicacion &&
    typeof post.Ubicacion.latitude === 'number' &&
    typeof post.Ubicacion.longitude === 'number';
  const hasContact = !!post.contacto;

  return (
    // Ya NO es tocable para abrir un visor de pantalla completa: los posts
    // solo se ven en el feed. Únicamente las historias abren pantalla
    // completa (eso vive aparte, en CalendarScreen).
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {post.fotoPerfilURL ? (
          <Image source={{ uri: post.fotoPerfilURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialCommunityIcons name="account" size={18} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.username} numberOfLines={1}>
            {post.nombreUsuario || 'Usuario'}
          </Text>
          {!!lugarNombre && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={12} color={COLOR_TEAL} />
              <Text style={styles.locationText} numberOfLines={1}>
                {lugarNombre}
              </Text>
            </View>
          )}
        </View>
      </View>

      {!!post.texto && <Text style={styles.description}>{post.texto}</Text>}

      {post.imagenURL ? <PostImage uri={post.imagenURL} /> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => onToggleLike(post)}
        >
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? COLOR_ORANGE : '#333'}
          />
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => onPressDislike(post)}
        >
          <MaterialCommunityIcons
            name={disliked ? 'thumb-down' : 'thumb-down-outline'}
            size={20}
            color={disliked ? COLOR_DISLIKE : '#333'}
          />
        </TouchableOpacity>

        <View style={styles.actionBtn}>
          <MaterialCommunityIcons name="star" size={20} color="#F5B400" />
          <Text style={styles.actionCount}>{starsCount}</Text>
        </View>

        <View style={{ flex: 1 }} />

        {hasContact && (
          <TouchableOpacity
            style={styles.contactBtn}
            activeOpacity={0.8}
            onPress={() => openWhatsApp(post.contacto)}
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
            <Text style={styles.contactBtnText}>Contactar</Text>
          </TouchableOpacity>
        )}

        {hasLocation && (
          <TouchableOpacity
            style={styles.directionsBtn}
            activeOpacity={0.8}
            onPress={() => openDirections(post.Ubicacion)}
          >
            <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={COLOR_TEAL} />
            <Text style={styles.directionsBtnText}>Cómo llegar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.8} onPress={() => onToggleSave(post)}>
          <MaterialCommunityIcons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? COLOR_TEAL : '#333'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: COLOR_TEAL, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 13.5, fontWeight: '700', color: '#222' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 11.5, color: COLOR_TEAL, marginLeft: 3, fontWeight: '600' },
  description: { fontSize: 13.5, color: '#444', lineHeight: 19, marginBottom: 10 },

  // Imagen estilo Instagram: proporción real, sin recorte ni deformación.
  postImageWrap: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  postImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eceff1' },
  postImageLoader: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionCount: { marginLeft: 5, fontSize: 12.5, color: COLOR_TEXT_MUTED, fontWeight: '600' },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7F4',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 14,
  },
  directionsBtnText: { fontSize: 11.5, color: COLOR_TEAL, fontWeight: '700', marginLeft: 4 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F9EE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  contactBtnText: { fontSize: 11.5, color: '#1EA34D', fontWeight: '700', marginLeft: 4 },
});