import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

// Motivos exactos que exige el modelo de datos de InteraccionesPublicaciones
const DISLIKE_REASONS = [
  { id: 'noInteresa', label: 'No me interesa este lugar' },
  { id: 'infoIncorrecta', label: 'Información incorrecta o desactualizada' },
  { id: 'malaCalidad', label: 'Fotos o contenido de baja calidad' },
  { id: 'yaLoConozco', label: 'Ya conozco este lugar' },
  { id: 'noSeguro', label: 'No parece seguro o accesible' },
  { id: 'otro', label: 'Otro motivo' },
];

// Modal genérico para elegir motivos de "no me gusta" + comentario opcional.
// Se reutiliza tanto para historias (Lugares) como para publicaciones (Comunidad).
export default function DislikeReasonModal({
  visible,
  selectedReasons,
  onToggleReason,
  comment,
  onChangeComment,
  submitting,
  onCancel,
  onSubmit,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>¿Por qué no te gustó?</Text>
          <Text style={styles.subtitle}>
            Selecciona una o varias opciones. Tu respuesta nos ayuda a mejorar.
          </Text>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {DISLIKE_REASONS.map((reason) => {
              const isSelected = !!selectedReasons[reason.id];
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={styles.reasonRow}
                  activeOpacity={0.8}
                  onPress={() => onToggleReason(reason.id)}
                >
                  <MaterialCommunityIcons
                    name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={isSelected ? COLOR_TEAL : '#9AA3A8'}
                  />
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.commentInput}
            placeholder="Cuéntanos más (opcional)"
            placeholderTextColor="#9AA3A8"
            value={comment}
            onChangeText={onChangeComment}
            multiline
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e3ea', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 4 },
  subtitle: { fontSize: 12.5, color: COLOR_TEXT_MUTED, marginBottom: 14, lineHeight: 17 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  reasonLabel: { fontSize: 14, color: '#333', marginLeft: 10, flex: 1 },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E7ECEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#333',
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelText: { color: COLOR_TEAL, fontWeight: '700', fontSize: 14 },
  submitBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});