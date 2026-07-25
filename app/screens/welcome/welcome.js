/**
 * WelcomeScreen.jsx
 * Pantalla de onboarding con dos slides animados.
 * Carga imágenes desde Firestore (colección "WelcomeSlide"),
 * hace prefetch de imágenes y ejecuta transiciones cruzadas suaves.
 *
 * Fix parpadeo: se usa una ref `transitionInProgress` como semáforo
 * síncrono para evitar que runTransition se ejecute dos veces cuando
 * la imagen ya está en caché (race condition entre next() y onLoadEnd).
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../../components/themed-text';
import { db } from '../../../firebaseConfig';

// ─── Constantes ───────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');
const AnimatedThemedText = Animated.createAnimatedComponent(ThemedText);

/** IDs de los documentos Firestore que se muestran como slides. */
const TARGET_SLIDE_IDS = ['Propuesta_001', 'Propuesta_006'];

/** Imagen de respaldo si un slide no tiene URL. */
const FALLBACK_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/deviaje-75dbd.appspot.com/o/imagen_de_prueba.jpg?alt=media';

/** Textos fijos para cada slide (sobrescriben los valores de Firestore). */
const SLIDE_OVERRIDES = [
  {
    title: 'CULTURA SIN LÍMITES',
    subtitle: 'Comienza tu nueva experiencia',
    description: 'Aventuras únicas en un solo lugar',
  },
  {
    title: 'CONOCE NICARAGUA',
    subtitle: 'Vamos por nuevos descubrimientos',
    description: 'A un clic de nuevas experiencias',
  },
];

/** Duración (ms) de la transición entre slides. */
const TRANSITION_DURATION = 560;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Hace prefetch de las imágenes que aún no han sido cargadas.
 */
const prefetchImages = async (slides, preloaded) => {
  const tasks = slides
    .filter((s) => s.imageURL && !preloaded.has(s.imageURL))
    .map(
      (s) =>
        new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 4000);
          Image.prefetch(s.imageURL)
            .then((ok) => { clearTimeout(timeout); preloaded.add(s.imageURL); resolve(ok); })
            .catch(() => { clearTimeout(timeout); resolve(false); });
        })
    );
  if (tasks.length) await Promise.all(tasks);
};

/** Mapea un documento Firestore al modelo de slide. */
const mapDocToSlide = (doc) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.Nombre || 'Bienvenido',
    subtitle: data.Subtitulo || 'La aventura comienza aquí',
    description: data.Descripcion || 'Explora experiencias únicas en todo el país',
    imageURL: data.ImagenURL || null,
  };
};

// ─── Sub-componentes (fuera del componente para evitar re-mounts) ─────────────

/** Botón "Saltar" en la esquina superior derecha. */
const SkipButton = ({ onPress }) => (
  <View style={styles.topRow}>
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.skip}>Saltar</Text>
    </TouchableOpacity>
  </View>
);

/** Bloque de texto (título / subtítulo / descripción) de un slide. */
const TextBlock = ({ slide, translateY, opacity }) => (
  <Animated.View style={[styles.textBlock, { transform: [{ translateY }] }]}>
    <AnimatedThemedText
      variant="title"
      style={[styles.title, styles.layerText, { opacity }]}
    >
      {slide.title}
    </AnimatedThemedText>
    <AnimatedThemedText
      variant="subtitle"
      style={[styles.subtitle, styles.layerText, { opacity }]}
    >
      {slide.subtitle}
    </AnimatedThemedText>
    <AnimatedThemedText
      variant="body"
      style={[styles.description, styles.layerText, { opacity }]}
    >
      {slide.description}
    </AnimatedThemedText>
  </Animated.View>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [slides, setSlides]       = useState([]);
  const [index, setIndex]         = useState(0);
  const [nextIndex, setNextIndex] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [animating, setAnimating] = useState(false);

  // ── Valores animados ───────────────────────────────────────────────────────
  const progress  = useRef(new Animated.Value(0)).current;
  const bgZoom    = useRef(new Animated.Value(0)).current;
  const textCross = useRef(new Animated.Value(0)).current;

  // ── Cache de imágenes ──────────────────────────────────────────────────────
  const preloaded = useRef(new Set()).current;
  const loadedMap = useRef({}).current;

  /**
   * SEMÁFORO DE TRANSICIÓN (ref, no estado).
   *
   * Una ref es síncrona: .current se actualiza en el mismo tick de JS,
   * actuando como mutex real. Esto impide que next() y onLoadEnd
   * llamen a runTransition al mismo tiempo cuando la imagen ya está
   * en caché, que era la causa del parpadeo.
   *
   * `animating` (estado) sigue existiendo solo para deshabilitar el
   * botón en el render — no se usa para control de flujo interno.
   */
  const transitionInProgress = useRef(false);

  /**
   * Target pendiente: cuando next() detecta que la imagen aún no cargó,
   * escribe aquí el índice destino en lugar de llamar runTransition.
   * onLoadEnd lo lee para disparar la transición en el momento correcto.
   */
  const pendingTarget = useRef(null);

  // ── finish (estable con useCallback para usarlo en useEffect) ─────────────
  const finish = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  // ── Carga de datos desde Firestore ─────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'WelcomeSlide'));

    const unsub = onSnapshot(q, async (snap) => {
      try {
        const allSlides = snap.docs.map(mapDocToSlide);
        const withImage = allSlides.filter((s) => !!s.imageURL);

        const picked = TARGET_SLIDE_IDS
          .map((id) => withImage.find((s) => s.id === id))
          .filter(Boolean);
        const finalSlides = picked.length ? picked : withImage.slice(0, 2);

        const overriddenSlides = finalSlides.map((s, i) =>
          i < SLIDE_OVERRIDES.length ? { ...s, ...SLIDE_OVERRIDES[i] } : s
        );

        await prefetchImages(overriddenSlides, preloaded);
        setSlides(overriddenSlides);
        setIndex(0);
      } catch (e) {
        console.warn('[WelcomeScreen] Error cargando slides:', e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [preloaded]);

  useEffect(() => {
    if (!loading && slides.length === 0) finish();
  }, [loading, slides, finish]);

  // ── Animación de transición ────────────────────────────────────────────────

  /**
   * runTransition — única puerta de entrada a la animación.
   *
   * Verifica el semáforo ANTES de cualquier setState para garantizar
   * que una segunda llamada concurrente (ej. onLoadEnd llegando justo
   * cuando next() ya inició la transición) no entre nunca.
   */
  const runTransition = useCallback(
    (target) => {
      // ── SEMÁFORO: rechazar si ya hay transición en curso ──
      if (transitionInProgress.current) return;
      transitionInProgress.current = true;

      setAnimating(true);
      setNextIndex(target);

      [progress, bgZoom, textCross].forEach((anim) => {
        try { anim.stopAnimation(); } catch (_) {}
        anim.setValue(0);
      });

      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          easing: Easing.bezier(0.25, 0.6, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(bgZoom, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textCross, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          easing: Easing.bezier(0.25, 0.6, 0.3, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIndex(target);
          setNextIndex(null);
          [progress, bgZoom, textCross].forEach((a) => a.setValue(0));
        } else {
          setNextIndex(null);
        }
        // ── LIBERAR SEMÁFORO ──
        transitionInProgress.current = false;
        pendingTarget.current = null;
        setAnimating(false);
      });
    },
    [progress, bgZoom, textCross]
    // ⚠️ `animating` NO está en las deps a propósito:
    // usamos la ref para control de flujo, no el estado,
    // evitando closures obsoletos.
  );

  // ── Navegación ─────────────────────────────────────────────────────────────

  const next = useCallback(() => {
    // Usa el semáforo, no `animating`, para evitar el closure obsoleto
    if (transitionInProgress.current) return;
    if (loading) return;
    if (slides.length === 0) return finish();
    if (index >= slides.length - 1) return finish();

    const target = index + 1;

    if (loadedMap[slides[target]?.id] || !slides[target]?.imageURL) {
      // Imagen ya renderizada → transición inmediata
      runTransition(target);
    } else {
      // Imagen aún cargando → marcar target y montar BgLayer para esperarla
      pendingTarget.current = target;
      setNextIndex(target);
    }
  }, [loading, slides, index, finish, loadedMap, runTransition]);

  // ── Interpolaciones derivadas ──────────────────────────────────────────────

  const currentOpacity   = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const nextOpacity      = progress;

  const currentTextY     = textCross.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const currentTextAlpha = textCross.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });

  const nextTextY        = textCross.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const nextTextAlpha    = textCross.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });

  const bgScale = bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Carga inicial */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      )}

      {!loading && slides.length > 0 && (
        <>
          <View style={{ flex: 1 }}>

            {/* Slide actual (sale durante la transición) */}
            {slides[index] && (
              <Animated.View
                style={[styles.absoluteFill, { opacity: currentOpacity }, styles.layerBase]}
                pointerEvents="none"
              >
                <Animated.View style={{ flex: 1, transform: [{ scale: bgScale }] }}>
                  <ImageBackground
                    source={{ uri: slides[index].imageURL || FALLBACK_IMAGE }}
                    style={styles.bg}
                    resizeMode="cover"
                    imageStyle={styles.imageFill}
                    fadeDuration={0}
                    onLoadEnd={() => { loadedMap[slides[index].id] = true; }}
                  >
                    <View style={styles.overlay} />
                    <SkipButton onPress={finish} />
                    <TextBlock
                      slide={slides[index]}
                      translateY={currentTextY}
                      opacity={currentTextAlpha}
                    />
                  </ImageBackground>
                </Animated.View>
              </Animated.View>
            )}

            {/* Slide siguiente (entra durante la transición) */}
            {nextIndex != null && slides[nextIndex] && (
              <Animated.View
                style={[styles.absoluteFill, { opacity: nextOpacity }, styles.layerBase]}
                pointerEvents="none"
              >
                <ImageBackground
                  source={{ uri: slides[nextIndex].imageURL || FALLBACK_IMAGE }}
                  style={styles.bg}
                  resizeMode="cover"
                  imageStyle={styles.imageFill}
                  fadeDuration={0}
                  onLoadEnd={() => {
                    loadedMap[slides[nextIndex].id] = true;
                    /**
                     * Solo disparar si:
                     * 1. Este slide es el target que next() marcó como pendiente
                     * 2. El semáforo está libre (next() no inició ya la transición)
                     *
                     * Esto corta la condición de carrera: si next() ya llamó
                     * runTransition, el semáforo estará cerrado y esta rama
                     * no hace nada.
                     */
                    if (
                      pendingTarget.current === nextIndex &&
                      !transitionInProgress.current
                    ) {
                      runTransition(nextIndex);
                    }
                  }}
                >
                  <View style={styles.overlay} />
                  <SkipButton onPress={finish} />
                  <TextBlock
                    slide={slides[nextIndex]}
                    translateY={nextTextY}
                    opacity={nextTextAlpha}
                  />
                </ImageBackground>
              </Animated.View>
            )}
          </View>

          {/* Footer: dots + botón */}
          <View style={styles.footer}>
            <View style={styles.dotsRow}>
              {slides.map((s, i) => {
                const active = i === (nextIndex != null ? nextIndex : index);
                return (
                  <View key={s.id} style={[styles.dot, active && styles.dotActive]} />
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, animating && styles.nextBtnDisabled]}
              onPress={next}
              activeOpacity={0.85}
              disabled={animating}
            >
              <Text style={styles.nextBtnText}>
                {index === slides.length - 1 ? 'Iniciar' : 'Siguiente'}
              </Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontFamily: 'Montserrat-Regular',
  },

  topRow: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
  },
  skip: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
  },

  textBlock: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: '86%',
  },

  // Título  →  #2EAD9A
  title: {
    color: '#2EAD9A',
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: 0.5,
  },

  // Subtítulo  →  #D96E32
  subtitle: {
    color: '#D96E32',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Montserrat-SemiBold',
  },

  // Descripción  →  #8FB32E
  description: {
    color: '#8FB32E',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat-Regular',
  },

  footer: {
    position: 'absolute',
    bottom: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 9,
    height: 9,
  },

  nextBtn: {
    flexDirection: 'row',
    backgroundColor: '#0077c2',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: width * 0.48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.4,
    fontFamily: 'Montserrat-SemiBold',
  },
  arrow: {
    color: '#fff',
    fontSize: 24,
    marginLeft: 8,
    marginTop: -2,
    fontFamily: 'Montserrat-Regular',
  },

  absoluteFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  layerBase: {
    backfaceVisibility: 'hidden',
  },
  layerText: {
    includeFontPadding: false,
  },
});