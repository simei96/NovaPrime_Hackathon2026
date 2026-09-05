import React from 'react';
import { StyleSheet, Text } from 'react-native';

export default function SectionHeader({ title, style }) {
  return <Text style={[styles.title, style]}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 19,
    color: '#222',
    fontFamily: 'Montserrat-Bold',
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 16,
  },
});
