//importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    EmailAuthProvider, deleteUser, onAuthStateChanged, reauthenticateWithCredential, signOut,
    updateEmail, updatePassword, updateProfile,
} from 'firebase/auth';
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot,
    orderBy, query, updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { decryptText, detectCardBrand, encryptText, maskCardNumber } from './cryptoUtils';

const COLOR_TEAL = '#2EAD9A';
const COLOR_ORANGE = '#D96E32';
const COLOR_OLIVE = '#8FB32E';
const COLOR_TEXT_MUTED = '#7A8489';
const COLOR_DANGER = '#D9483C';
const SCREEN_WIDTH = Dimensions.get('window').width;

const HEADER_BANNER_HEIGHT = Platform.OS === 'android' ? 220 : 200;
const AVATAR_SIZE = 100;

const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.78);
const CARD_GAP = 14;

// Mismos gustos/categorías que se usan en el resto de la app (Categorias)
const GUSTOS_DISPONIBLES = [
  { slug: 'artesania', label: 'Artesanías', icon: 'palette' },
  { slug: 'gastronomia', label: 'Gastronomía', icon: 'food' },
  { slug: 'naturaleza', label: 'Naturaleza', icon: 'leaf' },
  { slug: 'tradiciones', label: 'Tradiciones', icon: 'account-group' },
  { slug: 'danza-musica', label: 'Danza y Música', icon: 'music' },
  { slug: 'historia', label: 'Historia', icon: 'book' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Perfil() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser || null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Datos del perfil
  const [nombre, setNombre] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [fotoPerfilURL, setFotoPerfilURL] = useState(null);
  const [gustosSeleccionados, setGustosSeleccionados] = useState({});

  // Copia "de respaldo" para poder cancelar una edición sin guardar
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // Cambio de contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // La card para "Editar información"
  const [fieldsEditable, setFieldsEditable] = useState(false);

  // Modal genérico de confirmación con contraseña (se reutiliza para
  // desbloquear edición, guardar cambios y eliminar la cuenta)
  const [passwordModal, setPasswordModal] = useState({
    visible: false,
    title: '',
    subtitle: '',
    confirmLabel: 'Confirmar',
    danger: false,
    onConfirm: null,
  });
  const [modalPassword, setModalPassword] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Tarjetas guardadas + formulario para agregar una nueva
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.replace('/screens/Welcome');
      }
    });
    return () => unsub && unsub();
  }, []);

  // Carga el documento Users/{uid}
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setProfileLoading(true);
      try {
        const ref = doc(db, 'Users', user.uid);
        const snap = await getDoc(ref);
        if (!active) return;
        let loaded;
        if (snap.exists()) {
          const v = snap.data();
          const intereses = Array.isArray(v.intereses) ? v.intereses : [];
          const map = {};
          intereses.forEach((slug) => {
            map[slug] = true;
          });
          loaded = {
            nombre: v.nombre || user.displayName || '',
            nombreUsuario: v.nombreUsuario || '',
            email: v.email || user.email || '',
            fotoPerfilURL: v.fotoPerfilURL || user.photoURL || null,
            gustos: map,
          };
        } else {
          loaded = {
            nombre: user.displayName || '',
            nombreUsuario: '',
            email: user.email || '',
            fotoPerfilURL: user.photoURL || null,
            gustos: {},
          };
        }
        applySnapshot(loaded);
      } catch (e) {
        console.warn('Error cargando el perfil:', e);
        Alert.alert('Error', 'No se pudo cargar tu información de perfil.');
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // las tarjetas guardadas: Users/{uid}/TarjetasPago
  useEffect(() => {
    if (!user) {
      setCards([]);
      setCardsLoading(false);
      return;
    }
    const ref = collection(db, 'Users', user.uid, 'TarjetasPago');
    const q = query(ref, orderBy('creadoEn', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const mapped = snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            ultimosDigitos: v.ultimosDigitos || '0000',
            nombreEnc: v.nombreEnc || '',
            marca: v.marca || 'Tarjeta',
          };
        });
        setCards(mapped);
        setCardsLoading(false);
      },
      (err) => {
        console.warn('Error cargando tarjetas:', err);
        setCardsLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  function applySnapshot(loaded) {
    setNombre(loaded.nombre);
    setNombreUsuario(loaded.nombreUsuario);
    setEmail(loaded.email);
    setFotoPerfilURL(loaded.fotoPerfilURL);
    setGustosSeleccionados(loaded.gustos);
    setSavedSnapshot(loaded);
  }

  function toggleGusto(slug) {
    if (!fieldsEditable) return;
    setGustosSeleccionados((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  // Botón de foto de perfil: la opción ya está en la interfaz, pero como el
  // proyecto todavía no tiene Firebase Storage configurado, no se puede
  // subir una imagen real todavía.
  function handlePickPhoto() {
    Alert.alert(
      'Subir foto de perfil',
      'Esta opción ya está lista en la pantalla. Como Firestore/Storage aún no está configurado para guardar imágenes, por ahora no es posible subir tu foto — en cuanto se habilite, este botón funcionará.',
    );
  }

  // Modal genérico de contraseña

  function openPasswordModal({ title, subtitle, confirmLabel, danger, onConfirm }) {
    setModalPassword('');
    setPasswordModal({
      visible: true,
      title,
      subtitle,
      confirmLabel: confirmLabel || 'Confirmar',
      danger: !!danger,
      onConfirm,
    });
  }

  function closePasswordModal() {
    if (modalSubmitting) return;
    setPasswordModal((prev) => ({ ...prev, visible: false }));
    setModalPassword('');
  }

  // Reautentica con la contraseña ingresada y, solo si coincide, ejecuta
  // la acción pendiente (desbloquear edición, guardar cambios o eliminar
  // la cuenta). Si no coincide, siempre el mismo aviso.
  async function submitPasswordModal() {
    if (!user) return;
    if (!modalPassword.trim()) {
      Alert.alert('Falta la contraseña', 'Ingresa tu contraseña para continuar.');
      return;
    }

    setModalSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, modalPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (e) {
      setModalSubmitting(false);
      Alert.alert('¡Algo no cuadra!', 'Tu contraseña no coincide.');
      return;
    }

    try {
      if (passwordModal.onConfirm) {
        await passwordModal.onConfirm(modalPassword);
      }
      setPasswordModal((prev) => ({ ...prev, visible: false }));
      setModalPassword('');
    } catch (e) {
      console.warn('Error al confirmar la acción:', e);
      Alert.alert('Error', e.message || 'No se pudo completar la acción.');
    } finally {
      setModalSubmitting(false);
    }
  }

  // Editor de informacion

  function handlePressPencil() {
    openPasswordModal({
      title: 'Confirma tu contraseña',
      subtitle: 'Ingresa tu contraseña actual para editar tu información.',
      confirmLabel: 'Desbloquear',
      onConfirm: async () => {
        setFieldsEditable(true);
      },
    });
  }

  function handleCancelEdit() {
    if (savedSnapshot) applySnapshot(savedSnapshot);
    setNewPassword('');
    setConfirmNewPassword('');
    setFieldsEditable(false);
  }

  function handlePressGuardarPerfil() {
    if (!nombre.trim()) {
      Alert.alert('Falta información', 'Ingresa tu nombre completo.');
      return;
    }
    if (!nombreUsuario.trim()) {
      Alert.alert('Falta información', 'Ingresa un nombre de usuario.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (newPassword || confirmNewPassword) {
      if (newPassword.length < 6) {
        Alert.alert('Contraseña muy corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Alert.alert('No coincide', 'La confirmación de la nueva contraseña no coincide.');
        return;
      }
    }

    const intereses = Object.keys(gustosSeleccionados).filter((slug) => gustosSeleccionados[slug]);
    const payload = {
      nombre: nombre.trim(),
      nombreUsuario: nombreUsuario.trim(),
      email: email.trim(),
      intereses,
      newPassword: newPassword || null,
    };

    openPasswordModal({
      title: 'Confirma tu contraseña',
      subtitle: 'Ingresa tu contraseña actual para guardar estos cambios.',
      confirmLabel: 'Guardar',
      onConfirm: async () => {
        if (payload.email && payload.email !== user.email) {
          await updateEmail(user, payload.email);
        }
        if (payload.newPassword) {
          await updatePassword(user, payload.newPassword);
        }
        await updateProfile(user, { displayName: payload.nombre });
        await updateDoc(doc(db, 'Users', user.uid), {
          nombre: payload.nombre,
          nombreUsuario: payload.nombreUsuario,
          email: payload.email,
          intereses: payload.intereses,
        });

        applySnapshot({
          nombre: payload.nombre,
          nombreUsuario: payload.nombreUsuario,
          email: payload.email,
          fotoPerfilURL,
          gustos: gustosSeleccionados,
        });
        setNewPassword('');
        setConfirmNewPassword('');
        setFieldsEditable(false);
        Alert.alert('Listo', 'Tus datos se guardaron correctamente.');
      },
    });
  }

  // Cerrar sesión

  function handleLogoutPress() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
    ]);
  }

  async function doLogout() {
    try {
      await signOut(auth);
      router.replace('/screens/Welcome');
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  }

  // Eliminar cuenta

  function handleDeleteAccountPress() {
    openPasswordModal({
      title: '¡Hijole! ¿Estás seguro?',
      subtitle: 'Esta acción es permanente y no se puede deshacer. Confírmanos tu contraseña para eliminar tu cuenta.',
      confirmLabel: 'Eliminar cuenta',
      danger: true,
      onConfirm: async () => {
        const cardsRef = collection(db, 'Users', user.uid, 'TarjetasPago');
        const cardsSnap = await getDocs(cardsRef);
        await Promise.all(cardsSnap.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(doc(db, 'Users', user.uid));
        await deleteUser(user);
        router.replace('/screens/Welcome');
      },
    });
  }

  // Tarjeta de pago

  function onChangeCardNumber(text) {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(grouped);
  }

  function onChangeCardExpiry(text) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
    } else {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  }

  function onChangeCardCVV(text) {
    setCardCVV(text.replace(/\D/g, '').slice(0, 4));
  }

  function validateCard() {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 16) {
      Alert.alert('Tarjeta inválida', 'Revisa el número de tarjeta.');
      return false;
    }
    if (!cardName.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre tal como aparece en la tarjeta.');
      return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      Alert.alert('Vencimiento inválido', 'Usa el formato MM/AA.');
      return false;
    }
    if (cardCVV.length < 3) {
      Alert.alert('CVV inválido', 'Ingresa el código de seguridad de la tarjeta.');
      return false;
    }
    return true;
  }

  // Guarda la tarjeta cifrada. El CVV solo se usa para validar el formato
  // y NUNCA se envía a Firestore (ni cifrado).
  async function saveCard() {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para agregar una tarjeta.');
      return;
    }
    if (!validateCard()) return;

    setSavingCard(true);
    try {
      const digits = cardNumber.replace(/\D/g, '');
      await addDoc(collection(db, 'Users', user.uid, 'TarjetasPago'), {
        numeroEnc: encryptText(digits),
        nombreEnc: encryptText(cardName.trim()),
        expiracionEnc: encryptText(cardExpiry.trim()),
        ultimosDigitos: digits.slice(-4),
        marca: detectCardBrand(digits),
        creadoEn: new Date(),
      });

      setCardNumber('');
      setCardName('');
      setCardExpiry('');
      setCardCVV('');
      Alert.alert('Tarjeta guardada', 'Tus datos se guardaron cifrados y ya aparecen abajo.');
    } catch (e) {
      console.warn('Error guardando la tarjeta:', e);
      Alert.alert('Error', 'No se pudo guardar la tarjeta. Intenta de nuevo.');
    } finally {
      setSavingCard(false);
    }
  }

  function handleDeleteCard(card) {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Deseas eliminar la tarjeta terminada en ${card.ultimosDigitos}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'Users', user.uid, 'TarjetasPago', card.id));
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la tarjeta.');
            }
          },
        },
      ],
    );
  }

  if (!user) {
    return null;
  }

  const headerGreeting = nombreUsuario
    ? `@${nombreUsuario}`
    : nombre
    ? nombre
    : 'Mi perfil';

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Headear */}
        <View style={styles.headerBanner}>
          <View style={[styles.blob, styles.blobTeal]} pointerEvents="none" />
          <View style={[styles.blob, styles.blobOlive]} pointerEvents="none" />

          <SafeAreaView edges={['top']} style={styles.headerSafeContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.headerBackBtn}
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>Bienvenido</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerGreeting}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.avatarWrap}>
          {fotoPerfilURL ? (
            <Image source={{ uri: fotoPerfilURL }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={46} color="#fff" />
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarEditBtn}
            activeOpacity={0.85}
            onPress={handlePickPhoto}
            accessibilityLabel="Subir foto de perfil"
          >
            <MaterialCommunityIcons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {profileLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLOR_TEAL} />
            <Text style={styles.loadingText}>Cargando tu perfil...</Text>
          </View>
        ) : (
          <>
            <View style={styles.avatarNameSection}>
              <Text style={styles.avatarName} numberOfLines={1}>
                {nombre || 'Sin nombre'}
              </Text>
              <Text style={styles.avatarUsername} numberOfLines={1}>
                {nombreUsuario ? `@${nombreUsuario}` : 'Agrega tu nombre de usuario'}
              </Text>
            </View>

            {/* Card: editar información */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Editar información</Text>
                {fieldsEditable ? (
                  <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle-outline" size={22} color={COLOR_TEXT_MUTED} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handlePressPencil} hitSlop={8}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={COLOR_TEAL} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <TextInput
                style={[styles.input, !fieldsEditable && styles.inputLocked]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre completo"
                placeholderTextColor="#9AA3A8"
                editable={fieldsEditable}
              />

              <Text style={styles.fieldLabel}>Nombre de usuario</Text>
              <TextInput
                style={[styles.input, !fieldsEditable && styles.inputLocked]}
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
                placeholder="usuario123"
                placeholderTextColor="#9AA3A8"
                autoCapitalize="none"
                editable={fieldsEditable}
              />

              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <TextInput
                style={[styles.input, !fieldsEditable && styles.inputLocked]}
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#9AA3A8"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={fieldsEditable}
              />

              {fieldsEditable && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionSubtitle}>Cambiar contraseña (opcional)</Text>

                  <Text style={styles.fieldLabel}>Nueva contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Dejar en blanco para no cambiarla"
                    placeholderTextColor="#9AA3A8"
                    secureTextEntry
                  />

                  <Text style={styles.fieldLabel}>Confirmar nueva contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Repite la nueva contraseña"
                    placeholderTextColor="#9AA3A8"
                    secureTextEntry
                  />
                </>
              )}

              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>Tus gustos</Text>
              <View style={styles.gustosGrid}>
                {GUSTOS_DISPONIBLES.map((g) => {
                  const active = !!gustosSeleccionados[g.slug];
                  return (
                    <TouchableOpacity
                      key={g.slug}
                      style={[
                        styles.gustoChip,
                        active && styles.gustoChipActive,
                        !fieldsEditable && styles.gustoChipDisabled,
                      ]}
                      activeOpacity={fieldsEditable ? 0.85 : 1}
                      onPress={() => toggleGusto(g.slug)}
                    >
                      <MaterialCommunityIcons
                        name={g.icon}
                        size={15}
                        color={active ? '#fff' : COLOR_TEAL}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.gustoChipText, active && styles.gustoChipTextActive]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {fieldsEditable && (
                <TouchableOpacity
                  style={styles.saveBtn}
                  activeOpacity={0.9}
                  onPress={handlePressGuardarPerfil}
                >
                  <Text style={styles.saveBtnText}>Guardar cambios</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Card: tarjetas guardadas + agregar tarjeta */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tus tarjetas</Text>
              <Text style={styles.cardSubtitle}>
                Tus datos se guardan cifrados y no vuelven a mostrarse en texto plano fuera de la app.
              </Text>

              {cardsLoading ? (
                <ActivityIndicator size="small" color={COLOR_TEAL} style={{ marginVertical: 12 }} />
              ) : cards.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={styles.cardsCarouselRow}
                >
                  {cards.map((c) => {
                    const displayName = decryptText(c.nombreEnc) || 'Titular';
                    return (
                      <View key={c.id} style={styles.paymentCard}>
                        <View style={styles.paymentCardShine} pointerEvents="none" />
                        <TouchableOpacity
                          style={styles.paymentCardDeleteBtn}
                          onPress={() => handleDeleteCard(c)}
                          hitSlop={8}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLOR_TEAL} />
                        </TouchableOpacity>

                        <Text style={styles.paymentCardNumber}>
                          {maskCardNumber(`0000000000000${c.ultimosDigitos}`)}
                        </Text>

                        <View style={styles.paymentCardFooterRow}>
                          <Text style={styles.paymentCardHolder} numberOfLines={1}>
                            {displayName.toUpperCase()}
                          </Text>
                          <View style={styles.paymentCardBrandWrap}>
                            <Text style={styles.paymentCardBrand}>{c.marca}</Text>
                            <Text style={styles.paymentCardBrandSub}>Débito</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.noCardsText}>Todavía no has agregado ninguna tarjeta.</Text>
              )}

              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>Agregar tarjeta</Text>

              <Text style={styles.fieldLabel}>Número de tarjeta</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={onChangeCardNumber}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor="#9AA3A8"
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Nombre en la tarjeta</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="Como aparece en la tarjeta"
                placeholderTextColor="#9AA3A8"
                autoCapitalize="characters"
              />

              <View style={styles.cardRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.fieldLabel}>Vencimiento</Text>
                  <TextInput
                    style={styles.input}
                    value={cardExpiry}
                    onChangeText={onChangeCardExpiry}
                    placeholder="MM/AA"
                    placeholderTextColor="#9AA3A8"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={cardCVV}
                    onChangeText={onChangeCardCVV}
                    placeholder="***"
                    placeholderTextColor="#9AA3A8"
                    keyboardType="number-pad"
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.9}
                onPress={saveCard}
                disabled={savingCard}
              >
                {savingCard ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar tarjeta</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Card: cuenta (cerrar sesión / eliminar cuenta) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cuenta</Text>

              <TouchableOpacity
                style={styles.accountRow}
                activeOpacity={0.7}
                onPress={handleLogoutPress}
              >
                <MaterialCommunityIcons name="logout" size={20} color={COLOR_TEAL} />
                <Text style={styles.accountRowText}>Cerrar sesión</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#c7ccd0" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountRow, { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={handleDeleteAccountPress}
              >
                <MaterialCommunityIcons name="account-remove-outline" size={20} color={COLOR_DANGER} />
                <Text style={[styles.accountRowText, { color: COLOR_DANGER }]}>Eliminar cuenta</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#c7ccd0" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal genérico: confirmar contraseña */}
      <Modal
        visible={passwordModal.visible}
        animationType="slide"
        transparent
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.reauthBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.reauthSheet}>
            <View style={styles.reauthHandle} />
            <Text style={styles.reauthTitle}>{passwordModal.title}</Text>
            <Text style={styles.reauthSubtitle}>{passwordModal.subtitle}</Text>

            <TextInput
              style={styles.input}
              value={modalPassword}
              onChangeText={setModalPassword}
              placeholder="Contraseña actual"
              placeholderTextColor="#9AA3A8"
              secureTextEntry
              autoFocus
            />

            <View style={styles.reauthActionsRow}>
              <TouchableOpacity
                style={styles.reauthCancelBtn}
                onPress={closePasswordModal}
                disabled={modalSubmitting}
              >
                <Text style={styles.reauthCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reauthConfirmBtn,
                  passwordModal.danger && styles.reauthConfirmBtnDanger,
                ]}
                onPress={submitPasswordModal}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.reauthConfirmText}>{passwordModal.confirmLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6fafd',
  },

  // Header elevado (banner)
  headerBanner: {
    height: HEADER_BANNER_HEIGHT,
    backgroundColor: COLOR_ORANGE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerSafeContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 46,
    alignItems: 'center',
  },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTeal: {
    width: 150,
    height: 150,
    top: -40,
    right: -36,
    backgroundColor: 'rgba(46,173,154,0.28)',
  },
  blobOlive: {
    width: 110,
    height: 110,
    bottom: -30,
    left: -26,
    backgroundColor: 'rgba(143,179,46,0.22)',
  },
  headerBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 12,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { alignItems: 'center' },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat-Bold',
    maxWidth: SCREEN_WIDTH * 0.7,
  },

  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignSelf: 'center',
    marginTop: -AVATAR_SIZE / 2,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: COLOR_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR_TEAL,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: { marginLeft: 8, color: COLOR_TEAL, fontSize: 13 },

  avatarNameSection: { alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  avatarName: { fontSize: 17, fontWeight: '700', color: '#222' },
  avatarUsername: { fontSize: 13, color: COLOR_TEXT_MUTED, marginTop: 2 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    marginBottom: 14,
    lineHeight: 16,
  },

  fieldLabel: {
    fontSize: 12.5,
    color: COLOR_TEXT_MUTED,
    marginTop: 12,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E7ECEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  inputLocked: {
    backgroundColor: '#F3F5F6',
    color: '#8A9195',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF2F3',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },

  gustosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  gustoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR_TEAL,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  gustoChipActive: { backgroundColor: COLOR_TEAL },
  gustoChipDisabled: { opacity: 0.55 },
  gustoChipText: { fontSize: 12.5, color: COLOR_TEAL, fontWeight: '600' },
  gustoChipTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  cardRow: { flexDirection: 'row' },

  // Carrusel de tarjetas guardadas
  cardsCarouselRow: { paddingVertical: 4, gap: CARD_GAP },
  paymentCard: {
    width: CARD_WIDTH,
    height: 170,
    borderRadius: 18,
    backgroundColor: COLOR_TEAL,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  paymentCardShine: {
    position: 'absolute',
    width: CARD_WIDTH * 1.3,
    height: CARD_WIDTH * 1.3,
    borderRadius: CARD_WIDTH * 0.65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -CARD_WIDTH * 0.7,
    right: -CARD_WIDTH * 0.5,
    transform: [{ rotate: '-12deg' }],
  },
  paymentCardDeleteBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCardNumber: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 30,
  },
  paymentCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  paymentCardHolder: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  paymentCardBrandWrap: { alignItems: 'flex-end' },
  paymentCardBrand: { color: '#fff', fontSize: 15, fontWeight: '800' },
  paymentCardBrandSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, marginTop: 1 },
  noCardsText: {
    fontSize: 12.5,
    color: COLOR_TEXT_MUTED,
    paddingVertical: 14,
    textAlign: 'center',
  },

  // Cuenta (cerrar sesión / eliminar cuenta)
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F4',
  },
  accountRowText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Modal genérico de contraseña
  reauthBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reauthSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  reauthHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e3ea',
    alignSelf: 'center',
    marginBottom: 14,
  },
  reauthTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 4 },
  reauthSubtitle: {
    fontSize: 12.5,
    color: COLOR_TEXT_MUTED,
    marginBottom: 14,
    lineHeight: 17,
  },
  reauthActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 10,
  },
  reauthCancelBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  reauthCancelText: { color: COLOR_TEAL, fontWeight: '700', fontSize: 14 },
  reauthConfirmBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  reauthConfirmBtnDanger: { backgroundColor: COLOR_DANGER },
  reauthConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});