import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { db } from '../firebaseConfig';
import { subscribe } from './floatingButtonController';

type Props = {
  onPress?: () => void;
  icon?: string;
  size?: number;
  bg?: string;
  color?: string;
  badge?: string | number | null;
  initialX?: number;
  initialY?: number;
};

export default function FloatingButton({ onPress, icon = 'plus', size = 28, bg = '#FF6B3C', color = '#fff', badge = null, initialX, initialY }: Props) {
  const window = Dimensions.get('window');
  const SIZE = 140; // larger professional floating image
  const PADDING = 18;
  const defaultX = typeof initialX === 'number' ? initialX : window.width - PADDING - SIZE;
  const defaultY = typeof initialY === 'number' ? initialY : window.height - PADDING - SIZE - 24;

  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const dragging = useRef(false);
  const lastPress = useRef<number | null>(null);

  useEffect(() => {
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragging.current = false;
      pan.setOffset({ x: (pan as any).x._value, y: (pan as any).y._value });
      pan.setValue({ x: 0, y: 0 });
      lastPress.current = Date.now();
    },
    onPanResponderMove: (evt, gestureState) => {
      const dx = gestureState.dx;
      const dy = gestureState.dy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging.current = true;
      Animated.event([{ x: pan.x, y: pan.y }], { useNativeDriver: false })({ x: dx, y: dy });
    },
    onPanResponderRelease: (evt, gestureState) => {
      pan.flattenOffset();
  const x = (pan as any).x._value;
  const y = (pan as any).y._value;
  const clampedX = Math.max(PADDING, Math.min(x, window.width - SIZE - PADDING));
  const clampedY = Math.max(PADDING, Math.min(y, window.height - SIZE - PADDING));
  Animated.spring(pan, { toValue: { x: clampedX, y: clampedY }, friction: 7, tension: 60, useNativeDriver: false }).start();

      const now = Date.now();
      const pressedShort = lastPress.current && (now - lastPress.current) < 220;
      if (!dragging.current && pressedShort) {
        // treat as tap
        onPress && onPress();
      }
    }
  })).current;

  // Mascota images
  const [images, setImages] = useState<string[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [imagesMetaMap, setImagesMetaMap] = useState<Record<string,string>>({});
  const defaultImagesRef = useRef<string[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadMascota = async () => {
      try {
        // Try both possible collection names if typo exists
        const refA = doc(db, 'Mascotas', 'Mascota_003');
        const snapA = await getDoc(refA);
        let data = null;
        if (snapA.exists()) data = snapA.data();
        else {
          const refB = doc(db, 'Macotas', 'Mascota_003');
          const snapB = await getDoc(refB);
          if (snapB.exists()) data = snapB.data();
        }
        if (!data) return;
        // collect any image-like URLs recursively (handles fields like Emoji, ImagenURL, Fotos, nested arrays/objects)
        const found: string[] = [];
        const isImageUrl = (v: any) => typeof v === 'string' && /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)|^https?:\/\//i.test(v);
        const collect = (obj: any) => {
          if (!obj) return;
          if (typeof obj === 'string') {
            if (isImageUrl(obj)) found.push(obj);
            return;
          }
          if (Array.isArray(obj)) {
            obj.forEach(item => collect(item));
            return;
          }
          if (typeof obj === 'object') {
            Object.values(obj).forEach(v => collect(v));
            return;
          }
        };
        collect(data);
        if (found.length && mounted) {
          setImages(found);
          defaultImagesRef.current = found.slice();
          setImgIndex(0);
        }

        // build a simple meta map: keys in root object that contain image urls
        const metaMap: Record<string,string> = {};
        try {
          Object.entries(data).forEach(([k,v]) => {
            if (!v) return;
            if (typeof v === 'object') {
              // if object has an Emoji or ImagenURL field
              const url = v['Emoji'] || v['ImagenURL'] || v['Imagen'] || v['Foto'] || null;
              if (url && typeof url === 'string') metaMap[k] = url;
            } else if (typeof v === 'string' && isImageUrl(v)) {
              metaMap[k] = v;
            }
          });
        } catch(e) {}
  if (mounted) setImagesMetaMap(metaMap);
      } catch (e) {
        console.warn('FloatingButton: error loading mascota images', e);
      }
    };
    loadMascota();
    return () => { mounted = false; };
  }, [/* run once */]);

  // Rotate images whenever the images array changes
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const id = setInterval(() => {
      setImgIndex(i => (images.length ? (i + 1) % images.length : 0));
    }, 3500);
    return () => clearInterval(id);
  }, [images]);

  // ensure images are valid urls
  const validImages = images.filter(u => typeof u === 'string' && u.length > 5);

  // react to external events (like Pago_exitoso)
  useEffect(() => {
    const unsub = subscribe((eventName) => {
      try {
        if (eventName === 'restore_default') {
          if (defaultImagesRef.current && defaultImagesRef.current.length) {
            setImages(defaultImagesRef.current.slice());
            setImgIndex(0);
          }
          return;
        }
        const match = (imagesMetaMap && imagesMetaMap[eventName]) || null;
        if (match) {
          setImages([match]);
          setImgIndex(0);
        }
      } catch (e) {}
    });
    return () => { unsub && unsub(); };
  }, [imagesMetaMap]);

  return (
    <Animated.View style={[styles.animatedContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}> 
        {validImages && validImages.length > 0 ? (
          <Image source={{ uri: validImages[imgIndex] }} style={styles.imageFull} />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={size} color={color} />
        )}
        {badge !== null && (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  container: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'transparent',
  },
  imageFull: {
    width: 140,
    height: 140,
    borderRadius: 70,
    resizeMode: 'cover',
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
