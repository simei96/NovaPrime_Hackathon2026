//importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Image,
  ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { height } = Dimensions.get('window');
const TARGET_SLIDE_IDS = ['Propuesta_001', 'Propuesta_006'];
const FALLBACK_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/deviaje-75dbd.appspot.com/o/imagen_de_prueba.jpg?alt=media';

const SLIDE_OVERRIDES = [
  {
    title: 'CULTURA SIN LÍMITES',
    subtitle: 'Comienza tu nueva experiencia',
  },
  {
    title: 'CONOCE A NICARAGUA',
    subtitle: 'Vamos por nuevos descubrimientos',
  },
];

const HERO_HEIGHT = height * 0.46;

const AUTOPLAY_INTERVAL = 4500;
const TRANSITION_DURATION = 700;

//paleta de colores
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_TEAL_SOFT = '#D9F0EC';
const COLOR_ORANGE_SOFT = 'rgba(217,110,50,0.16)';
const COLOR_TEXT_DARK = '#222';
const COLOR_TEXT_MUTED = '#7A8489';

// El nombre de usuario acepta el mismo formato que en Registro.js:
// letras, números, "_" y "." — no se valida como correo.
const isValidUsername = (value) => /^[a-zA-Z0-9_.]{3,20}$/.test(value.trim());

const mapDocToSlide = (doc) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.Nombre || 'Bienvenido',
    subtitle: data.Subtitulo || 'La aventura comienza aquí',
    imageURL: data.ImagenURL || null,
  };
};

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

const DecorativeBlobs = () => (
  <>
    <View style={[styles.blob, styles.blobTeal]} pointerEvents="none" />
    <View style={[styles.blob, styles.blobOrange]} pointerEvents="none" />
  </>
);
export default function WelcomeScreen() {
  const router = useRouter();

  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(null);
  const [loadingHero, setLoadingHero] = useState(true);
  // Cambiado de "email" a "username" — es lo que el usuario escribe ahora.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const entrance = useRef(new Animated.Value(0)).current; 
  const progress = useRef(new Animated.Value(0)).current; 
  const bgZoom = useRef(new Animated.Value(0)).current;    
  const textCross = useRef(new Animated.Value(0)).current; 

  const preloaded = useRef(new Set()).current;
  const loadedMap = useRef({}).current;
  const transitionInProgress = useRef(false);
  const pendingTarget = useRef(null);
  const autoplayTimer = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    const q = query(collection(db, 'WelcomeSlide'));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          const allSlides = snap.docs.map(mapDocToSlide);
          const withImage = allSlides.filter((s) => !!s.imageURL);

          const picked = TARGET_SLIDE_IDS
            .map((id) => withImage.find((s) => s.id === id))
            .filter(Boolean);
          const finalSlides = picked.length ? picked : withImage.slice(0, 2);

          const overridden = finalSlides.map((s, i) =>
            i < SLIDE_OVERRIDES.length ? { ...s, ...SLIDE_OVERRIDES[i] } : s
          );

          await prefetchImages(overridden, preloaded);
          setSlides(overridden);
          setIndex(0);
        } catch (e) {
          console.warn('[WelcomeScreen] Error cargando slides del hero:', e);
        } finally {
          setLoadingHero(false);
        }
      },
      () => setLoadingHero(false)
    );
    return () => unsub();
  }, [preloaded]);

  const runTransition = useCallback(
    (target) => {
      if (transitionInProgress.current) return;
      transitionInProgress.current = true;

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
          duration: TRANSITION_DURATION + 500,
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
        transitionInProgress.current = false;
        pendingTarget.current = null;
      });
    },
    [progress, bgZoom, textCross]
  );

  const advance = useCallback(() => {
    if (transitionInProgress.current) return;
    if (slides.length < 2) return;

    const target = (index + 1) % slides.length;

    if (loadedMap[slides[target]?.id] || !slides[target]?.imageURL) {
      runTransition(target);
    } else {
      pendingTarget.current = target;
      setNextIndex(target);
    }
  }, [slides, index, loadedMap, runTransition]);

  useEffect(() => {
    if (loadingHero || slides.length < 2) return undefined;

    autoplayTimer.current = setInterval(advance, AUTOPLAY_INTERVAL);
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [loadingHero, slides.length, advance]);

  const validate = () => {
    let ok = true;
    if (!username.trim()) {
      setUsernameError('Ingresa tu nombre de usuario');
      ok = false;
    } else if (!isValidUsername(username)) {
      setUsernameError('Ingresa un nombre de usuario válido');
      ok = false;
    } else {
      setUsernameError('');
    }

    if (!password) {
      setPasswordError('Ingresa tu contraseña');
      ok = false;
    } else {
      setPasswordError('');
    }
    return ok;
  };

  const handleLogin = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      // Firebase Auth solo permite iniciar sesión con correo, así que
      // primero buscamos en Firestore qué correo corresponde al nombre de
      // usuario ingresado, usando el mismo campo "nombreUsuarioLower" que
      // se guarda al registrarse (ver Registro.js).
      const usernameLower = username.trim().toLowerCase();
      const q = query(
        collection(db, 'Users'),
        where('nombreUsuarioLower', '==', usernameLower),
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setUsernameError('No encontramos una cuenta con ese usuario.');
        Alert.alert('Usuario no registrado', 'No encontramos una cuenta con ese nombre de usuario. Por favor regístrate.');
        setSubmitting(false);
        return;
      }

      const userData = snap.docs[0].data();
      const emailForLogin = userData.email;

      if (!emailForLogin) {
        Alert.alert('Error', 'No se pudo recuperar la información de esta cuenta. Contacta a soporte.');
        setSubmitting(false);
        return;
      }

      await signInWithEmailAndPassword(auth, emailForLogin, password);
      router.replace('/(tabs)');
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/user-not-found') {
        Alert.alert('Usuario no registrado', 'No encontramos una cuenta con ese usuario. Por favor regístrate.');
      } else if (code === 'auth/wrong-password') {
        Alert.alert('Contraseña incorrecta', 'La contraseña ingresada no es correcta.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Error', 'Hubo un problema con la cuenta asociada a este usuario.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Demasiados intentos', 'Espera un momento antes de volver a intentarlo.');
      } else {
        Alert.alert('Error al iniciar sesión', error.message || String(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToRegister = () => {
    router.push('/screens/Welcome/Registro');
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const heroTranslateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const heroOpacity = entrance;
  const cardTranslateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const cardOpacity = entrance;

  const currentOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const nextOpacity = progress;
  const bgScale = bgZoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const currentTextY = textCross.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const currentTextAlpha = textCross.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const nextTextY = textCross.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const nextTextAlpha = textCross.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });

  const activeDotIndex = nextIndex != null ? nextIndex : index;

  const renderHeroTextBlock = (slide, translateY, opacity) => (
    <Animated.View style={[styles.heroTextBlock, { transform: [{ translateY }] }]}>
      <View style={styles.heroBadge}>
        <MaterialCommunityIcons name="compass-outline" size={16} color="#fff" />
        <Text style={styles.heroBadgeText}>NIKAIA</Text>
      </View>
      <Animated.Text style={[styles.heroTitle, { opacity }]}>{slide.title}</Animated.Text>
      <Animated.Text style={[styles.heroSubtitle, { opacity }]}>{slide.subtitle}</Animated.Text>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/*Zona hero: slideshow automático*/}
          <Animated.View
            style={[
              styles.hero,
              { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
            ]}
          >
            {loadingHero || slides.length === 0 ? (
              <View style={[styles.heroImage, styles.heroLoading]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <>
                {/* Slide actual*/}
                <Animated.View
                  style={[styles.absoluteFill, { opacity: currentOpacity }]}
                  pointerEvents="none"
                >
                  <Animated.View style={{ flex: 1, transform: [{ scale: bgScale }] }}>
                    <ImageBackground
                      source={{ uri: slides[index].imageURL || FALLBACK_IMAGE }}
                      style={styles.heroImageInner}
                      resizeMode="cover"
                      fadeDuration={0}
                      onLoadEnd={() => { loadedMap[slides[index].id] = true; }}
                    >
                      <View style={styles.heroOverlay} />
                      <DecorativeBlobs />
                      {renderHeroTextBlock(slides[index], currentTextY, currentTextAlpha)}
                    </ImageBackground>
                  </Animated.View>
                </Animated.View>

                {/* Slide siguiente*/}
                {nextIndex != null && slides[nextIndex] && (
                  <Animated.View
                    style={[styles.absoluteFill, { opacity: nextOpacity }]}
                    pointerEvents="none"
                  >
                    <ImageBackground
                      source={{ uri: slides[nextIndex].imageURL || FALLBACK_IMAGE }}
                      style={styles.heroImageInner}
                      resizeMode="cover"
                      fadeDuration={0}
                      onLoadEnd={() => {
                        loadedMap[slides[nextIndex].id] = true;
                        if (pendingTarget.current === nextIndex && !transitionInProgress.current) {
                          runTransition(nextIndex);
                        }
                      }}
                    >
                      <View style={styles.heroOverlay} />
                      <DecorativeBlobs />
                      {renderHeroTextBlock(slides[nextIndex], nextTextY, nextTextAlpha)}
                    </ImageBackground>
                  </Animated.View>
                )}

                {/* Puntitos indicadores*/}
                {slides.length > 1 && (
                  <View style={styles.dotsRow} pointerEvents="none">
                    {slides.map((s, i) => (
                      <View key={s.id} style={[styles.dot, i === activeDotIndex && styles.dotActive]} />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Degradado de transición*/}
            <View style={styles.fadeBand1} pointerEvents="none" />
            <View style={styles.fadeBand2} pointerEvents="none" />
            <View style={styles.fadeBand3} pointerEvents="none" />
          </Animated.View>

          {/*Tarjeta de Login*/}
          <Animated.View
            style={[
              styles.loginCard,
              { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <View style={styles.cardHandle} />

            <Text style={styles.loginTitle}>Bienvenido nuevamente</Text>
            <Text style={styles.loginSubtitle}>Inicia sesión para continuar</Text>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Nombre de usuario</Text>
            <View style={[styles.inputRow, usernameError ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="at" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => { setUsername(t); if (usernameError) setUsernameError(''); }}
                placeholder="tu_usuario"
                placeholderTextColor="#a7b0b4"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={scrollToBottom}
              />
            </View>
            {!!usernameError && <Text style={styles.errorText}>{usernameError}</Text>}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Contraseña</Text>
            <View style={[styles.inputRow, passwordError ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                placeholder="********"
                placeholderTextColor="#a7b0b4"
                secureTextEntry={!showPassword}
                onFocus={scrollToBottom}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLOR_TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>¿Eres nuevo aquí?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={goToRegister}>
              <Text style={styles.secondaryBtnText}>Registrarse</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fafd',
  },
  scrollContent: {
    flexGrow: 1,
  },

// hero
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroImage: {
    flex: 1,
  },
  heroImageInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroLoading: {
    backgroundColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,20,20,0.32)',
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },

  blob: {
    position: 'absolute',
    borderRadius: 9,
  },
  blobTeal: {
    width: 170,
    height: 170,
    top: -50,
    right: -40,
    backgroundColor: 'rgba(46,173,154,0.35)',
  },
  blobOrange: {
    width: 130,
    height: 130,
    top: 90,
    left: -50,
    backgroundColor: COLOR_ORANGE_SOFT,
  },

  heroTextBlock: {
    paddingHorizontal: 26,
    paddingBottom: 56,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 6,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 12.5,
    fontFamily: 'Montserrat-SemiBold',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
    lineHeight: 34,
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    marginTop: 8,
  },

  dotsRow: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },

  // Login
  loginCard: {
    marginTop: -50,
    marginHorizontal: 15,
    marginBottom: 28,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 3,
    borderColor: COLOR_ORANGE_SOFT,
    elevation: 4,
  },
  cardHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR_TEAL_SOFT,
    marginBottom: 16,
  },

  loginTitle: {
    fontSize: 21,
    fontFamily: 'Montserrat-Bold',
    color: COLOR_TEXT_DARK,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 13.5,
    fontFamily: 'Montserrat-Regular',
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
  },

  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    color: COLOR_TEXT_DARK,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    borderRadius: 5,
    paddingHorizontal: 12,
    backgroundColor: '#fafdfd',
  },
  inputRowError: {
    borderColor: COLOR_ORANGE,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14.5,
    color: COLOR_TEXT_DARK,
    fontFamily: 'Montserrat-Regular',
  },
  errorText: {
    color: COLOR_ORANGE,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },

  primaryBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 5,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLOR_TEAL_SOFT },
  dividerText: { fontSize: 12, color: COLOR_TEXT_MUTED, fontFamily: 'Montserrat-Regular' },

  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLOR_TEAL,
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLOR_TEAL,
    fontSize: 14.5,
    fontFamily: 'Montserrat-Bold',
  },
});