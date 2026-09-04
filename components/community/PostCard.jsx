import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_DISLIKE, COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Tarjeta de una publicación de la colección "Comunidad". Todos los datos
// (usuarioId, nombreUsuario, imagenUsuario, descripcion, imagenURL, lugar,
// departamento, categoria) vienen directo de Firestore, sin nada hardcodeado.
export default function PostCard({
  post,
  likeCount,
  userInteraction, // 'meGusta' | 'noMeGusta' | null
  isSaved,
  onToggleLike,
  onPressDislike,
  onToggleSave,
}) {
  const liked = userInteraction === 'meGusta';
  const disliked = userInteraction === 'noMeGusta';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {post.imagenUsuario ? (
          <Image source={{ uri: post.imagenUsuario }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialCommunityIcons name="account" size={18} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.username} numberOfLines={1}>
            {post.nombreUsuario}
          </Text>
          {!!(post.lugar || post.departamento) && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={12} color={COLOR_TEAL} />
              <Text style={styles.locationText} numberOfLines={1}>
                {[post.lugar, post.departamento].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {!!post.descripcion && <Text style={styles.description}>{post.descripcion}</Text>}

      {post.imagenURL ? (
        <Image source={{ uri: post.imagenURL }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => onToggleLike(post)}>
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? COLOR_ORANGE : '#333'}
          />
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => onPressDislike(post)}>
          <MaterialCommunityIcons
            name={disliked ? 'thumb-down' : 'thumb-down-outline'}
            size={20}
            color={disliked ? COLOR_DISLIKE : '#333'}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

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
  postImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10, backgroundColor: '#eceff1' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionCount: { marginLeft: 5, fontSize: 12.5, color: COLOR_TEXT_MUTED, fontWeight: '600' },
});