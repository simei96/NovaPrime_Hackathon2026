
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';
import { decryptText, maskCardNumber } from '../../app/screens/home/cryptoUtils';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

export default function PaymentMethodSelector({ uid, selectedMethod, onSelectMethod }) {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCards([]);
      setLoading(false);
      return;
    }
    const ref = collection(db, 'Users', uid, 'TarjetasPago');
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
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [uid]);

  return (
    <View>
      {/* Opción de efectivo */}
      <TouchableOpacity
        style={[styles.cardRow, selectedMethod === 'efectivo' && styles.cardRowActive]}
        activeOpacity={0.85}
        onPress={() => onSelectMethod('efectivo', null)}
      >
        <MaterialCommunityIcons
          name={selectedMethod === 'efectivo' ? 'radiobox-marked' : 'radiobox-blank'}
          size={20}
          color={selectedMethod === 'efectivo' ? COLOR_TEAL : '#C7CCD0'}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardNumber}>Pagar en efectivo</Text>
          <Text style={styles.cardHolder}>Pagas directamente en el lugar</Text>
        </View>
        <MaterialCommunityIcons name="cash" size={20} color={COLOR_TEXT_MUTED} />
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="small" color={COLOR_TEAL} style={{ marginVertical: 12 }} />
      ) : (
        cards.map((c) => {
          const active = selectedMethod === c.id;
          const displayName = decryptText(c.nombreEnc) || 'Titular';
          const numeroEnmascarado = maskCardNumber(`0000000000000${c.ultimosDigitos}`);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.cardRow, active && styles.cardRowActive]}
              activeOpacity={0.85}
              onPress={() =>
                onSelectMethod(c.id, {
                  numero: numeroEnmascarado,
                  titular: `${displayName.toUpperCase()} · ${c.marca}`,
                })
              }
            >
              <MaterialCommunityIcons
                name={active ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={active ? COLOR_TEAL : '#C7CCD0'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardNumber}>{numeroEnmascarado}</Text>
                <Text style={styles.cardHolder} numberOfLines={1}>
                  {displayName.toUpperCase()} · {c.marca}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {!loading && cards.length === 0 && (
        <Text style={styles.emptyText}>Todavía no tienes tarjetas guardadas.</Text>
      )}

      <TouchableOpacity
        style={styles.addBtn}
        activeOpacity={0.8}
        onPress={() => router.push('/screens/home/Perfil')}
      >
        <MaterialCommunityIcons name="plus" size={16} color={COLOR_TEAL} />
        <Text style={styles.addBtnText}>
          {cards.length === 0 ? 'Agregar tarjeta en mi perfil' : 'Agregar otra tarjeta'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 12.5, color: COLOR_TEXT_MUTED, marginBottom: 4 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    marginBottom: 8,
  },
  cardRowActive: { borderColor: COLOR_TEAL, backgroundColor: '#F1FBF9' },
  cardNumber: { fontSize: 13.5, fontWeight: '700', color: '#222' },
  cardHolder: { fontSize: 11, color: COLOR_TEXT_MUTED, marginTop: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingVertical:  8 },
  addBtnText: { marginLeft: 6, fontSize: 12.5, fontWeight: '700', color: COLOR_TEAL },
});