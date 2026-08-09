//importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRef, useState } from 'react';
import {ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import { auth } from '../../../firebaseConfig';

//Paleta de colores
const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_TEAL_SOFT = '#D9F0EC';
const COLOR_ORANGE_SOFT = 'rgba(217,110,50,0.16)';
const COLOR_TEXT_DARK = '#222';
const COLOR_TEXT_MUTED = '#7A8489';

const HEADER_HEIGHT = 190;

// Categorías de gustos disponibles
const CATEGORIAS = [
  { label: 'Artesanias', icon: 'palette', color: '#fff', slug: 'artesania' },
  { label: 'Gastronomia', icon: 'food', color: '#fff', slug: 'gastronomia' },
  { label: 'Naturaleza', icon: 'leaf', color: '#fff', slug: 'naturalez' },
  { label: 'Tradiciones', icon: 'account-group', color: '#fff', slug: 'tradiciones' },
  { label: 'Danza y Musica', icon: 'music', color: '#fff', slug: 'danza y musica' },
  { label: 'Historia', icon: 'book', color: '#fff', slug: 'historia' },
];

//Helpers

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidUsername = (value) => /^[a-zA-Z0-9_.]{3,20}$/.test(value.trim());

export default function Registro() {
  const router = useRouter();
  const scrollRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedGustos, setSelectedGustos] = useState([]);
  const [userType, setUserType] = useState('visitante'); // 'visitante' | 'anfitrion'
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gustos: '',
  });

  const clearError = (field) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const toggleGusto = (slug) => {
    setSelectedGustos((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    );
    if (errors.gustos) clearError('gustos');
  };

  const validate = () => {
    const next = {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      gustos: '',
    };
    let ok = true;

    if (!fullName.trim()) {
      next.fullName = 'Ingresa tu nombre completo';
      ok = false;
    }

    if (!username.trim()) {
      next.username = 'Ingresa un nombre de usuario';
      ok = false;
    } else if (!isValidUsername(username)) {
      next.username = 'Usa 3-20 caracteres: letras, números, "_" o "."';
      ok = false;
    }

    if (!email.trim()) {
      next.email = 'Ingresa tu correo electrónico';
      ok = false;
    } else if (!isValidEmail(email)) {
      next.email = 'Ingresa un correo válido';
      ok = false;
    }
    if (!password) {
      next.password = 'Ingresa una contraseña';
      ok = false;
    } else if (password.length < 6) {
      next.password = 'Debe tener al menos 6 caracteres';
      ok = false;
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Confirma tu contraseña';
      ok = false;
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Las contraseñas no coinciden';
      ok = false;
    }

    if (selectedGustos.length === 0) {
      next.gustos = 'Selecciona al menos un gusto';
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleRegister = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Firebase Auth solo admite displayName y photoURL de forma nativa.
      // El nombre de usuario se guarda aquí y es lo que se mostrará en el header.
      await updateProfile(cred.user, { displayName: username.trim() });

      // Firebase Auth no guarda directamente datos adicionales como gustos o tipo de usuario
      // por lo que deben almacenarse en Firestore asociados al `uid` del usuario, colocar mas adelante

      if (userType === 'anfitrion') {
        // cuando esté lista la pantalla de anfitrión, se podra navegar allí
        Alert.alert(
          'Cuenta creada',
          'El modo anfitrión estará disponible próximamente. Por ahora ingresarás como visitante.'
        );
      }

      router.replace('/(tabs)');
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        Alert.alert('Correo ya registrado', 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Correo inválido', 'Revisa que el correo tenga un formato válido.');
      } else if (code === 'auth/weak-password') {
        Alert.alert('Contraseña débil', 'Elige una contraseña más segura.');
      } else {
        Alert.alert('Error al crear la cuenta', error.message || String(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => {
    router.push('/screens/Welcome');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />

        {/* Encabezado decorativo */}
        <View style={styles.header}>
          <View style={[styles.blob, styles.blobTeal]} pointerEvents="none" />
          <View style={[styles.blob, styles.blobOrange]} pointerEvents="none" />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Crear una cuenta</Text>
          <Text style={styles.headerSubtitle}>Únete y empieza a explorar Nicaragua</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <View style={[styles.inputRow, errors.fullName ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="account-outline" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(t) => { setFullName(t); clearError('fullName'); }}
                placeholder="Tu nombre y apellido"
                placeholderTextColor="#a7b0b4"
                autoCapitalize="words"
                onFocus={scrollToBottom}
              />
            </View>
            {!!errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Nombre de usuario</Text>
            <View style={[styles.inputRow, errors.username ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="at" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => { setUsername(t); clearError('username'); }}
                placeholder="Así te verán en la app"
                placeholderTextColor="#a7b0b4"
                autoCapitalize="none"
                onFocus={scrollToBottom}
              />
            </View>
            {!!errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Correo electrónico</Text>
            <View style={[styles.inputRow, errors.email ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); clearError('email'); }}
                placeholder="tu@email.com"
                placeholderTextColor="#a7b0b4"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={scrollToBottom}
              />
            </View>
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Contraseña</Text>
            <View style={[styles.inputRow, errors.password ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setPassword(t); clearError('password'); }}
                placeholder="Mínimo 6 caracteres"
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
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Confirmar contraseña</Text>
            <View style={[styles.inputRow, errors.confirmPassword ? styles.inputRowError : null]}>
              <MaterialCommunityIcons name="lock-check-outline" size={18} color={COLOR_TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#a7b0b4"
                secureTextEntry={!showConfirm}
                onFocus={scrollToBottom}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLOR_TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
            {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            {/* Selección de gustos */}
            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>¿Qué te gustaría descubrir?</Text>
            <Text style={styles.helperText}>Selecciona una o varias categorías</Text>
            <View style={styles.gustosGrid}>
              {CATEGORIAS.map((cat) => {
                const active = selectedGustos.includes(cat.slug);
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={styles.gustoItem}
                    activeOpacity={0.8}
                    onPress={() => toggleGusto(cat.slug)}
                  >
                    <View style={[styles.gustoCircle, active && styles.gustoCircleActive]}>
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={24}
                        color={active ? '#fff' : COLOR_TEAL}
                      />
                    </View>
                    <Text style={[styles.gustoLabel, active && styles.gustoLabelActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!!errors.gustos && <Text style={styles.errorText}>{errors.gustos}</Text>}

            {/* Tipo de usuario */}
            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>¿Cómo quieres usar DeViaje?</Text>
            <View style={styles.userTypeRow}>
              <TouchableOpacity
                style={[styles.userTypeCard, userType === 'visitante' && styles.userTypeCardActive]}
                activeOpacity={0.85}
                onPress={() => setUserType('visitante')}
              >
                <MaterialCommunityIcons
                  name="compass-outline"
                  size={22}
                  color={userType === 'visitante' ? '#fff' : COLOR_TEAL}
                />
                <Text style={[styles.userTypeText, userType === 'visitante' && styles.userTypeTextActive]}>
                  Visitante
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.userTypeCard, userType === 'anfitrion' && styles.userTypeCardActive]}
                activeOpacity={0.85}
                onPress={() => setUserType('anfitrion')}
              >
                <MaterialCommunityIcons
                  name="home-account"
                  size={22}
                  color={userType === 'anfitrion' ? '#fff' : COLOR_TEAL}
                />
                <Text style={[styles.userTypeText, userType === 'anfitrion' && styles.userTypeTextActive]}>
                  Anfitrión
                </Text>
              </TouchableOpacity>
            </View>
            {userType === 'anfitrion' && (
              <Text style={styles.helperText}>
                Podrás publicar experiencias como anfitrión próximamente.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Registrarse</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>¿Ya tienes una cuenta?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={goToLogin}>
              <Text style={styles.secondaryBtnText}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

//Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fafd',
  },

  header: {
    height: HEADER_HEIGHT,
    backgroundColor: COLOR_TEAL,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 10,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTeal: {
    width: 140,
    height: 140,
    top: -40,
    left: -30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blobOrange: {
    width: 110,
    height: 110,
    bottom: -30,
    right: -20,
    backgroundColor: COLOR_ORANGE_SOFT,
  },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    marginTop: 4,
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    color: COLOR_TEXT_DARK,
    marginBottom: 6,
  },
  fieldSpacing: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    fontFamily: 'Montserrat-Regular',
    marginBottom: 10,
    marginTop: -2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR_TEAL_SOFT,
    borderRadius: 12,
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

  // Gustos
  gustosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gustoItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 16,
  },
  gustoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLOR_TEAL_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gustoCircleActive: {
    backgroundColor: COLOR_TEAL,
  },
  gustoLabel: {
    fontSize: 11.5,
    fontFamily: 'Montserrat-Regular',
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
  },
  gustoLabelActive: {
    color: COLOR_TEAL,
    fontFamily: 'Montserrat-SemiBold',
  },

  // Tipo de usuario
  userTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  userTypeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLOR_TEAL,
    borderRadius: 12,
    paddingVertical: 14,
  },
  userTypeCardActive: {
    backgroundColor: COLOR_TEAL,
  },
  userTypeText: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    color: COLOR_TEAL,
  },
  userTypeTextActive: {
    color: '#fff',
  },

  primaryBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 12,
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
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLOR_TEAL,
    fontSize: 14.5,
    fontFamily: 'Montserrat-Bold',
  },
});