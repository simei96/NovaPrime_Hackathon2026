import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ratingsService from '../../services/ratingsService';
import { auth } from '../../../firebaseConfig';

function Star({ filled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 6 }}>
      <MaterialCommunityIcons name={filled ? 'star' : 'star-outline'} size={32} color={filled ? '#f6b024' : '#ccc'} />
    </TouchableOpacity>
  );
}

export default function RateReservationScreen() {
  const params = useLocalSearchParams();
  const reservationId = params?.reservationId;
  const destination = params?.destination;
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [examples, setExamples] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    updateExamples(5);
  }, []);

  function updateExamples(value) {
    if (value <= 2) {
      setExamples(['Servicio lento', 'Falta limpieza', 'No cumplieron lo prometido']);
    } else if (value >= 4) {
      setExamples(['Excelente atención', 'Muy recomendable', 'Buena relación calidad-precio']);
    } else {
      setExamples([]);
    }
  }

  async function handleSubmit() {
    const userId = auth.currentUser?.uid || null;
    if (!reservationId) { Alert.alert('Error', 'No se pudo identificar la reserva.'); return; }
    if (!userId) { Alert.alert('Debes iniciar sesión', 'Inicia sesión para enviar una calificación.'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      await ratingsService.saveRating({ reservationId, userId, destination, stars, comment });
      Alert.alert('Gracias', 'Tu calificación fue enviada.');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la calificación: ' + (e.message || String(e)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calificar {destination || 'tu experiencia'}</Text>
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map(n => (
          <Star key={n} filled={n <= stars} onPress={() => { setStars(n); updateExamples(n); }} />
        ))}
      </View>
      {examples.length > 0 && (
        <View style={styles.examplesBox}>
          <Text style={styles.examplesTitle}>Sugerencias:</Text>
          {examples.map((ex, i) => <Text key={i} style={styles.exampleText}>• {ex}</Text>)}
        </View>
      )}
      <TextInput
        style={styles.textarea}
        placeholder='Agrega un comentario (opcional)'
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
      />
      <View style={{ height: 12 }} />
      <TouchableOpacity style={[styles.button, submitting ? { opacity: 0.6 } : null]} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Enviando...' : 'Enviar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor:'#fff' },
  title: { fontSize:18, fontWeight:'700', marginBottom:12 },
  starsRow: { flexDirection:'row', alignItems:'center', marginBottom:12 },
  examplesBox: { backgroundColor:'#f6f8fa', padding:10, borderRadius:8, marginBottom:12 },
  examplesTitle: { fontWeight:'700', marginBottom:6 },
  exampleText: { color:'#444', marginBottom:4 },
  textarea: { borderWidth:1, borderColor:'#e0e6ef', borderRadius:8, padding:10, textAlignVertical:'top' },
  button: { backgroundColor:'#1976d2', paddingVertical:12, borderRadius:8, alignItems:'center', marginTop:8 },
  buttonText: { color:'#fff', fontWeight:'700' },
});
