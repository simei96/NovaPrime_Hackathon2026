import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_DISLIKE, COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

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

export default function PostCard({
  post,
  lugarNombre,
  userInteraction, // 'meGusta' | 'noMeGusta' | null
  isSaved,
  onToggleLike,
  onPressDislike,
  onToggleSave,
  onOpenDetail,
}) {
  const liked = userInteraction === 'meGusta';
  const disliked = userInteraction === 'noMeGusta';
  const likeCount = post.meGustaCount || 0;
  const starsCount = post.calificacionEstrellas || 0;
  const hasLocation =
    post.Ubicacion &&
    typeof post.Ubicacion.latitude === 'number' &&
    typeof post.Ubicacion.longitude === 'number';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onOpenDetail && onOpenDetail(post)}
    >
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

      {post.imagenURL ? (
        <Image source={{ uri: post.imagenURL }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleLike(post);
          }}
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
          onPress={(e) => {
            e.stopPropagation?.();
            onPressDislike(post);
          }}
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

        {hasLocation && (
          <TouchableOpacity
            style={styles.directionsBtn}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation?.();
              openDirections(post.Ubicacion);
            }}
          >
            <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={COLOR_TEAL} />
            <Text style={styles.directionsBtnText}>Cómo llegar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleSave(post);
          }}
        >
          <MaterialCommunityIcons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? COLOR_TEAL : '#333'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  postImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10, backgroundColor: '#eceff1' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
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
});