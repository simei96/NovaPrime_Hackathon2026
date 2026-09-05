import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLOR_ORANGE = '#D96E32';
const COLOR_TEAL = '#2EAD9A';

export default function CultureOfTheDay({ content, onPressPrimary, onPressSecondary }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{content?.label || 'Cultura del día'}</Text>
        <Text style={styles.title}>{content?.titulo}</Text>
        <Text style={styles.desc}>{content?.descripcion}</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={onPressPrimary}>
            <Text style={styles.btnPrimaryText}>Comenzar experiencia</Text>
            <MaterialCommunityIcons name="play" size={14} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.7} onPress={onPressSecondary}>
            <Text style={styles.btnSecondaryText}>Ver más</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.visual}>
        <MaterialCommunityIcons name="ticket-outline" size={40} color={COLOR_ORANGE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderColor: COLOR_ORANGE,
    borderWidth: 2,
    marginHorizontal: 15,
    marginTop: 5,
    marginBottom: 110,
    padding: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    color: COLOR_ORANGE,
    fontWeight: '700',
    fontFamily: 'Montserrat-Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: 'bold', color: '#000', fontFamily: 'Montserrat-Bold', marginBottom: 6 },
  desc: { fontSize: 12.5, color: '#000', fontFamily: 'Montserrat-Regular', lineHeight: 17, marginBottom: 14 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_ORANGE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Montserrat-Bold' },
  btnSecondary: { paddingHorizontal: 4, paddingVertical: 8 },
  btnSecondaryText: {
    color: '#9fd8cc',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    textDecorationLine: 'underline',
  },
  visual: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderColor: COLOR_TEAL,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
