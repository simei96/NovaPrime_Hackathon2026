import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';

const ICONO_RED = {
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'music-note',
  twitter: 'twitter',
  x: 'twitter',
};

// Información de contacto del proveedor/comunidad responsable del servicio,
export default function ProviderCard({ proveedor }) {
  if (!proveedor) return null;
  const {
    nombre,
    organizacion,
    personaResponsable,
    telefono,
    correo,
    sitioWeb,
    redesSociales = {},
  } = proveedor;

  function llamar() {
    if (telefono) Linking.openURL(`tel:${telefono}`);
  }
  function whatsapp() {
    if (!telefono) return;
    const limpio = telefono.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${limpio}`);
  }
  function enviarCorreo() {
    if (correo) Linking.openURL(`mailto:${correo}`);
  }
  function abrirEnlace(url) {
    if (url) Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
  }

  const redesEntries = Object.entries(redesSociales).filter(([, v]) => v);

  return (
    <View>
      {nombre ? <Text style={styles.nombre}>{nombre}</Text> : null}
      {organizacion ? <Text style={styles.subtitulo}>{organizacion}</Text> : null}
      {personaResponsable ? <Text style={styles.detalle}>Contacto: {personaResponsable}</Text> : null}
      {correo ? <Text style={styles.detalle}>{correo}</Text> : null}

      {(redesEntries.length > 0 || sitioWeb) && (
        <View style={styles.redesRow}>
          {redesEntries.map(([red, url]) => (
            <TouchableOpacity key={red} style={styles.redBtn} onPress={() => abrirEnlace(url)}>
              <MaterialCommunityIcons name={ICONO_RED[red.toLowerCase()] || 'web'} size={18} color={COLOR_TEAL} />
            </TouchableOpacity>
          ))}
          {sitioWeb && (
            <TouchableOpacity style={styles.redBtn} onPress={() => abrirEnlace(sitioWeb)}>
              <MaterialCommunityIcons name="web" size={18} color={COLOR_TEAL} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.btnRow}>
        {telefono && (
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={llamar}>
            <MaterialCommunityIcons name="phone-outline" size={18} color={COLOR_TEAL} />
            <Text style={styles.actionText}>Llamar</Text>
          </TouchableOpacity>
        )}
        {telefono && (
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={whatsapp}>
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        {correo && (
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={enviarCorreo}>
            <MaterialCommunityIcons name="email-outline" size={18} color={COLOR_TEXT_MUTED} />
            <Text style={styles.actionText}>Correo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nombre: { fontSize: 14.5, fontWeight: '700', color: '#222' },
  subtitulo: { fontSize: 12.5, color: COLOR_TEAL, fontWeight: '600', marginTop: 2 },
  detalle: { fontSize: 12.5, color: COLOR_TEXT_MUTED, marginTop: 4 },
  redesRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  redBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
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
  actionText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#333' },
});