import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_ORANGE, COLOR_TEAL } from '../../constants/colors';

// Fila de acciones de contacto: llamar, WhatsApp y abrir ubicación en Google Maps.
export default function ContactBar({ phone, whatsapp, address, latitude, longitude }) {
  function handleCall() {
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  function handleWhatsApp() {
    if (!whatsapp) return;
    const cleanNumber = whatsapp.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${cleanNumber}`);
  }

  function handleLocation() {
    if (latitude && longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    } else if (address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    }
  }

  const hasLocation = !!(address || (latitude && longitude));
  if (!phone && !whatsapp && !hasLocation) return null;

  return (
    <View style={styles.row}>
      {phone && (
        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={handleCall}>
          <MaterialCommunityIcons name="phone-outline" size={18} color={COLOR_TEAL} />
          <Text style={styles.btnText}>Llamar</Text>
        </TouchableOpacity>
      )}
      {whatsapp && (
        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={handleWhatsApp}>
          <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
          <Text style={styles.btnText}>WhatsApp</Text>
        </TouchableOpacity>
      )}
      {hasLocation && (
        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={handleLocation}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLOR_ORANGE} />
          <Text style={styles.btnText}>Ubicación</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 18, marginTop: 4, marginBottom: 8, gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7ECEF',
  },
  btnText: { marginLeft: 6, fontSize: 12.5, fontWeight: '700', color: '#333' },
});