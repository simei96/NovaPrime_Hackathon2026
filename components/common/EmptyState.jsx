import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLOR_TEXT_MUTED = '#7A8489';

export default function EmptyState({ icon = 'information-outline', message, style }) {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon} size={22} color={COLOR_TEXT_MUTED} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  text: {
    color: COLOR_TEXT_MUTED,
    fontFamily: 'Montserrat-Regular',
    fontSize: 12.5,
    marginTop: 6,
    textAlign: 'center',
  },
});
