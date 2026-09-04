import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';
import { auth } from '../../firebaseConfig';

const PASOS_PROCESO = [
  { key: 'verificando', mensaje: 'Verificando los datos de tu tarjeta...', icon: 'credit-card-search-outline', duracion: 1400 },
  { key: 'autorizando', mensaje: 'Solicitando autorización de pago...', icon: 'bank-outline', duracion: 1600 },
  { key: 'confirmando', mensaje: 'Confirmando tu transacción...', icon: 'check-network-outline', duracion: 1300 },
];

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentProcessingModal({ visible, monto, tarjeta, onClose, onSuccess }) {
  const [paso, setPaso] = useState('formulario'); // formulario | procesando | proceso | exito
  const [pasoIndex, setPasoIndex] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [paso, pasoIndex, visible]);

  function cerrarYReiniciar() {
    setPaso('formulario');
    setPasoIndex(0);
    setPassword('');
    setError('');
    onClose && onClose();
  }

  async function cambiarA(nuevoPaso, nuevoIndex = 0) {
    await new Promise((resolve) => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(resolve);
    });
    setPaso(nuevoPaso);
    setPasoIndex(nuevoIndex);
  }

  async function confirmarPago() {
    const user = auth.currentUser;
    if (!user?.email) {
      setError('No se pudo verificar tu cuenta. Inicia sesión de nuevo.');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña para continuar.');
      return;
    }

    setError('');
    await cambiarA('procesando');

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Contraseña verificada: recorre la secuencia de pasos del "procesamiento"
      await cambiarA('proceso', 0);
      for (let i = 0; i < PASOS_PROCESO.length; i++) {
        if (i > 0) await cambiarA('proceso', i);
        await esperar(PASOS_PROCESO[i].duracion);
      }

      await cambiarA('exito');
    } catch (e) {
      await cambiarA('formulario');
      setError('Contraseña incorrecta. Intenta de nuevo.');
    }
  }

  function confirmarExito() {
    onSuccess && onSuccess();
    cerrarYReiniciar();
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={cerrarYReiniciar} transparent={false}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cerrarYReiniciar} style={styles.closeBtn} disabled={paso === 'proceso'}>
            <MaterialCommunityIcons name="close" size={22} color={paso === 'proceso' ? '#ccc' : '#222'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar pago</Text>
          <View style={{ width: 22 }} />
        </View>

        <Animated.View style={[styles.animatedBody, { opacity: fadeAnim }]}>
          {paso === 'formulario' && (
            <View style={styles.body}>
              <Text style={styles.montoTexto}>Total a pagar: {monto}</Text>

              {tarjeta && (
                <View style={styles.tarjetaBox}>
                  <MaterialCommunityIcons name="credit-card-outline" size={22} color={COLOR_TEAL} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.tarjetaNumero}>{tarjeta.numero}</Text>
                    <Text style={styles.tarjetaTitular}>{tarjeta.titular}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.label}>Contraseña de tu cuenta</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError('');
                }}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.payBtn, !password && styles.payBtnDisabled]}
                disabled={!password}
                activeOpacity={0.9}
                onPress={confirmarPago}
              >
                <MaterialCommunityIcons name="lock-check-outline" size={16} color="#fff" />
                <Text style={styles.payBtnText}>Confirmar pago</Text>
              </TouchableOpacity>
              <Text style={styles.avisoSeguridad}>
                Usamos tu contraseña solo para verificar que eres el titular de la tarjeta.
              </Text>
            </View>
          )}

          {paso === 'procesando' && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLOR_TEAL} />
              <Text style={styles.centerTitleSmall}>Estamos procesando tu pago...</Text>
            </View>
          )}

          {paso === 'proceso' && (
            <View style={styles.centerState}>
              <MaterialCommunityIcons
                name={PASOS_PROCESO[pasoIndex].icon}
                size={56}
                color={COLOR_TEAL}
              />
              <Text style={styles.centerTitleSmall}>{PASOS_PROCESO[pasoIndex].mensaje}</Text>

              <View style={styles.dotsRow}>
                {PASOS_PROCESO.map((p, i) => (
                  <View
                    key={p.key}
                    style={[
                      styles.dot,
                      i === pasoIndex && styles.dotActive,
                      i < pasoIndex && styles.dotCompletada,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {paso === 'exito' && (
            <View style={styles.centerState}>
              <MaterialCommunityIcons name="check-circle" size={64} color={COLOR_TEAL} />
              <Text style={styles.centerTitle}>¡Pago realizado con éxito!</Text>
              <Text style={styles.centerText}>Tu reserva se confirmará a continuación.</Text>
              <TouchableOpacity style={styles.payBtn} onPress={confirmarExito}>
                <Text style={styles.payBtnText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECEF',
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  animatedBody: { flex: 1 },
  body: { padding: 20 },
  montoTexto: { fontSize: 15, fontWeight: '700', color: COLOR_TEAL, marginBottom: 18, textAlign: 'center' },
  tarjetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1FBF9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  tarjetaNumero: { fontSize: 13.5, fontWeight: '700', color: '#222' },
  tarjetaTitular: { fontSize: 11.5, color: COLOR_TEXT_MUTED, marginTop: 2 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#E7ECEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 6,
    color: '#222',
  },
  errorText: { color: COLOR_ORANGE, fontSize: 12, marginBottom: 10, fontWeight: '600' },
  payBtn: {
    flexDirection: 'row',
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 10 },
  avisoSeguridad: { textAlign: 'center', fontSize: 11, color: '#999', marginTop: 10 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  centerTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 16, textAlign: 'center' },
  centerTitleSmall: { fontSize: 15, fontWeight: '700', color: '#222', marginTop: 18, textAlign: 'center' },
  centerText: { fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center', marginBottom: 20 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E7ECEF' },
  dotActive: { backgroundColor: COLOR_TEAL, width: 20 },
  dotCompletada: { backgroundColor: '#B7DAD5' },
});