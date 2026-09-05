import React from 'react';
import { StyleSheet, View } from 'react-native';
import EmptyState from '../common/EmptyState';
import SectionHeader from './SectionHeader';
import TimelineEventCard from './TimelineEventCard';

export default function ItinerarySection({ events, onPressEvent }) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Tu itinerario de hoy" />
      <View style={styles.list}>
        {events.length === 0 ? (
          <EmptyState icon="calendar-blank-outline" message="No tienes actividades programadas para hoy." />
        ) : (
          <>
            {events.map((ev) => (
              <TimelineEventCard key={ev.id} event={ev} onPress={onPressEvent} />
            ))}
            <View style={styles.track} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 1 },
  list: { paddingHorizontal: 16, position: 'relative' },
  track: {
    position: 'absolute',
    left: 24,
    top: 8,
    bottom: 20,
    width: 2,
    backgroundColor: '#D96E32',
    zIndex: -1,
  },
});
