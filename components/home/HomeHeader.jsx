import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';

const COLOR_TEAL = '#2EAD9A';

export default function HomeHeader({ loading, user, displayName, avatarURL, logoURL, logoHeaderId, onPressUser }) {
  if (loading) {
    return (
      <View style={styles.headerFixed}>
        <View style={styles.headerSkeletonRow}>
          <SkeletonLoader height={18} width={130} style={{ borderRadius: 6 }} />
          <View style={{ flex: 1 }} />
          <SkeletonLoader height={30} width={100} style={{ borderRadius: 6 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerFixed}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressUser}
          style={styles.headerUserWrap}
          accessibilityRole="button"
          accessibilityLabel={user ? 'Ir a mi perfil' : 'Iniciar sesión'}
        >
          {avatarURL ? (
            <Image source={{ uri: avatarURL }} style={styles.headerUserAvatar} />
          ) : (
            <MaterialCommunityIcons
              name={user ? 'account-circle' : 'account-circle-outline'}
              size={22}
              color={COLOR_TEAL}
              style={{ marginRight: 6 }}
            />
          )}
          <Text numberOfLines={1} style={styles.headerUserText}>
            {displayName}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLOR_TEAL} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {logoURL ? (
          <Image source={{ uri: logoURL }} style={[styles.logoImage, { width: 100, height: 30 }]} resizeMode="contain" />
        ) : (
          <Text style={{ color: '#008CBF', fontWeight: 'bold', fontSize: 18 }}>{logoHeaderId || 'NIKAIA!'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    zIndex: 10,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  headerSkeletonRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  headerUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F1FBF9',
  },
  headerUserAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  headerUserText: { fontSize: 15, fontWeight: '600', color: '#222', fontFamily: 'Montserrat-Regular' },
  logoImage: { width: 180, height: 48, marginBottom: 0 },
});
