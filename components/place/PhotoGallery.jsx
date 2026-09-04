import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function PhotoGallery({ photos = [] }) {
  const [visorVisible, setVisorVisible] = useState(false);
  const [indiceInicial, setIndiceInicial] = useState(0);
  const [indiceActual, setIndiceActual] = useState(0);

  if (!photos || photos.length === 0) return null;

  function abrirVisor(index) {
    setIndiceInicial(index);
    setIndiceActual(index);
    setVisorVisible(true);
  }

  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `thumb-${i}`}
        contentContainerStyle={styles.thumbList}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => abrirVisor(index)}>
            <Image source={{ uri: item }} style={styles.thumb} resizeMode="cover" />
            {photos.length > 1 && index === 0 && (
              <View style={styles.contadorMini}>
                <MaterialCommunityIcons name="image-multiple-outline" size={12} color="#fff" />
                <Text style={styles.contadorMiniText}>{photos.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={visorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisorVisible(false)}
      >
        <View style={styles.visorContainer}>
          <TouchableOpacity style={styles.cerrarBtn} onPress={() => setVisorVisible(false)}>
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={indiceInicial}
            getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
            keyExtractor={(_, i) => `full-${i}`}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              setIndiceActual(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullSlide}>
                <Image source={{ uri: item }} style={styles.fullImage} resizeMode="contain" />
              </View>
            )}
          />

          <View style={styles.contador}>
            <Text style={styles.contadorText}>
              {indiceActual + 1} / {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  thumb: { width: 130, height: 90, borderRadius: 10, marginRight: 8, backgroundColor: '#eceff1' },
  contadorMini: {
    position: 'absolute',
    bottom: 6,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  contadorMiniText: { color: '#fff', fontSize: 10.5, fontWeight: '700', marginLeft: 3 },
  visorContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  cerrarBtn: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullSlide: { width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: SCREEN_W, height: SCREEN_H * 0.8 },
  contador: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  contadorText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});