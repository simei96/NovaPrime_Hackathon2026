import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLOR_TEAL = '#2EAD9A';

export default function TimelineEventCard({ event, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => onPress && onPress(event)}>
      <View style={[styles.indicator, { backgroundColor: event.color || COLOR_TEAL }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.time}>{event.allDay ? 'Todo el día' : event.time}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {event.subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#aaa" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D96E32',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  indicator: { width: 5, height: 38, borderRadius: 3, marginRight: 12 },
  time: { fontSize: 11.5, color: COLOR_TEAL, fontWeight: '700', fontFamily: 'Montserrat-Bold', marginBottom: 2 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#222', fontFamily: 'Montserrat-Bold' },
  subtitle: { fontSize: 12, color: '#888', fontFamily: 'Montserrat-Regular', marginTop: 1 },
});
