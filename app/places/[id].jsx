//Importaciones
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AvailabilityDetails from '../../components/place/AvailabilityDetails';
import BookingCalendar from '../../components/place/BookingCalendar';
import BookingForm from '../../components/place/BookingForm';
import ContactBar from '../../components/place/ContactBar';
import ExpandableText from '../../components/place/ExpandableText';
import ExperienceHighlights from '../../components/place/ExperienceHighlights';
import LocationDetails from '../../components/place/LocationDetails';
import PaymentMethodSelector from '../../components/place/PaymentMethodSelector';
import PaymentProcessingModal from '../../components/place/PaymentProcessingModal';
import PhotoGallery from '../../components/place/PhotoGallery';
import ProviderCard from '../../components/place/ProviderCard';
import { COLOR_ORANGE, COLOR_TEAL, COLOR_TEXT_MUTED } from '../../constants/colors';
import { auth, db } from '../../firebaseConfig';
import { formatCordobas, formatDolares } from '../../utils/currency';

export default function PlaceDetail() {
  // Captura el segmento dinámico [id] de la ruta /places/[id]
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState(auth.currentUser || null);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado del formulario de reserva
  const [personas, setPersonas] = useState(1);
  const [transporte, setTransporte] = useState(false);
  const [conductorAsignado, setConductorAsignado] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('efectivo');
  const [selectedCardInfo, setSelectedCardInfo] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagoTarjetaVisible, setPagoTarjetaVisible] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const ref = doc(db, 'Lugares', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const v = snap.data();
          setPlace({
            id: snap.id,
            name: v.Nombre || v.name || 'Sin nombre',
            type: v.Tipo || v.type || 'Otro',
            desc: v.Descripcion || v.desc || '',
            rating: typeof v.Rating === 'number' ? v.Rating : v.rating || 0,
            distance: v.Distancia || v.distance || '',
            price: v.Precio || v.precio || null,
            imageURL: v.ImagenURL || v.imagen || v.Imagen || v.image || null,
            fotos: v.Fotos || v.fotos || v.Imagenes || v.imagenes || [],
            phone: v.Telefono || v.telefono || null,
            whatsapp: v.WhatsApp || v.whatsapp || v.Telefono || v.telefono || null,
            address: v.Direccion || v.direccion || null,
            latitude: v.Latitud ?? v.latitud ?? null,
            longitude: v.Longitud ?? v.longitud ?? null,

            // Categoría / tipo de experiencia y nivel de participación
            categoria: v.Categoria || v.categoria || v.Tipo || v.type || null,
            nivelParticipacion: v.NivelParticipacion || v.nivelParticipacion || null,
            duracion: v.Duracion || v.duracion || null,
            precioCordobas: typeof v.PrecioCordobas === 'number' ? v.PrecioCordobas : v.precioCordobas ?? null,
            incluye: v.Incluye || v.incluye || [],

            // Ubicación detallada
            departamento: v.Departamento || v.departamento || null,
            municipio: v.Municipio || v.municipio || null,
            comunidad: v.Comunidad || v.comunidad || null,
            puntoReferencia: v.PuntoReferencia || v.puntoReferencia || null,

            // Disponibilidad
            diasDisponibles: v.DiasDisponibles || v.diasDisponibles || [],
            horarios: v.Horarios || v.horarios || [],
            capacidadMaxima: v.CapacidadMaxima || v.capacidadMaxima || null,
            temporadas: v.Temporadas || v.temporadas || [],

            // Proveedor
            proveedor: v.Proveedor || v.proveedor || null,
          });
        }
      } catch (e) {
        console.error('Error cargando el lugar:', e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPlace();
  }, [id]);

  // Se habilita el pago solo cuando ya se eligió cantidad de personas válida
  // y una fecha de reserva en el calendario.
  const seleccionCompleta = personas >= 1 && !!selectedDate;

  async function crearReserva() {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'Reservas'), {
        uid: user.uid,
        lugarId: place.id,
        lugarNombre: place.name,
        cantidadPersonas: personas,
        transporte,
        conductorAsignado: transporte ? conductorAsignado : false,
        metodoPago: selectedMethod === 'efectivo' ? 'efectivo' : 'tarjeta',
        tarjetaId: selectedMethod === 'efectivo' ? null : selectedMethod,
        precio: place.precioCordobas ?? place.price ?? null,
        fechaReserva: selectedDate,
        categoria: place.categoria || null,
        estado: 'pendiente',
        creadoEn: new Date(),
      });
      Alert.alert('¡Reserva enviada!', 'Tu solicitud de reserva se envió correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('Error creando la reserva:', e);
      Alert.alert('Error', 'No se pudo enviar tu reserva. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmarReserva() {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para reservar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (personas < 1) {
      Alert.alert('Cantidad inválida', 'Selecciona al menos 1 persona.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Elige una fecha', 'Selecciona la fecha de tu reserva en el calendario.');
      return;
    }

    if (selectedMethod === 'efectivo') {
      crearReserva();
    } else {
      setPagoTarjetaVisible(true);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR_TEAL} />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={40} color="#c7d0d6" />
        <Text style={styles.notFoundText}>No encontramos este lugar</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const todasLasFotos = [place.imageURL, ...(place.fotos || [])].filter(Boolean);
  const montoFormateado =
    place.precioCordobas != null
      ? `${formatCordobas(place.precioCordobas)} (${formatDolares(place.precioCordobas)})`
      : 'C$0.00';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {place.imageURL ? (
        <Image source={{ uri: place.imageURL }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
          <MaterialCommunityIcons name="image-outline" size={40} color="#c7d0d6" />
        </View>
      )}

      <TouchableOpacity style={styles.backButtonFloating} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.name}>{place.name}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.type}>{place.type}</Text>
          {place.price ? (
            <Text style={styles.price}>{place.price}</Text>
          ) : (
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{place.rating}</Text>
            </View>
          )}
        </View>
        {place.distance ? <Text style={styles.distance}>{place.distance}</Text> : null}

        <ExpandableText text={place.desc} maxWords={50} style={styles.desc} />
      </View>

      {/* Galería de fotos adicionales */}
      {todasLasFotos.length > 1 && (
        <View style={styles.gallerySection}>
          <Text style={styles.sectionLabel}>Fotos</Text>
          <PhotoGallery photos={todasLasFotos} />
        </View>
      )}

      {/* Contacto y ubicación rápida */}
      <ContactBar
        phone={place.phone}
        whatsapp={place.whatsapp}
        address={place.address}
        latitude={place.latitude}
        longitude={place.longitude}
      />

      {/* Tipo de experiencia, nivel de participación, duración, precio e incluye */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sobre esta experiencia</Text>
        <ExperienceHighlights
          categoria={place.categoria}
          nivelParticipacion={place.nivelParticipacion}
          duracion={place.duracion}
          precioCordobas={place.precioCordobas}
          incluye={place.incluye}
        />
      </View>

      {/* Ubicación detallada */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación</Text>
        <LocationDetails
          departamento={place.departamento}
          municipio={place.municipio}
          comunidad={place.comunidad}
          direccion={place.address}
          puntoReferencia={place.puntoReferencia}
          latitude={place.latitude}
          longitude={place.longitude}
        />
      </View>

      {/* Disponibilidad general */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Disponibilidad</Text>
        <AvailabilityDetails
          diasDisponibles={place.diasDisponibles}
          horarios={place.horarios}
          capacidadMaxima={place.capacidadMaxima}
          temporadas={place.temporadas}
        />
      </View>

      {/* Información del proveedor */}
      {place.proveedor && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Proveedor</Text>
          <ProviderCard proveedor={place.proveedor} />
        </View>
      )}

      {/* Formulario de reserva */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reserva tu experiencia</Text>
        <BookingForm
          personas={personas}
          onChangePersonas={setPersonas}
          transporte={transporte}
          onToggleTransporte={setTransporte}
          conductorAsignado={conductorAsignado}
          onToggleConductor={setConductorAsignado}
        />
      </View>

      {/* Calendario para elegir la fecha de la reserva */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Elige la fecha</Text>
        <BookingCalendar
          diasDisponibles={place.diasDisponibles}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </View>

      {/* Método de pago: se habilita solo cuando la selección está completa */}
      <View style={[styles.card, !seleccionCompleta && styles.cardDisabled]}>
        <Text style={styles.cardTitle}>Método de pago</Text>
        {!seleccionCompleta && (
          <Text style={styles.avisoIncompleto}>
            Selecciona la cantidad de personas y la fecha de tu reserva para continuar con el pago.
          </Text>
        )}
        <View pointerEvents={seleccionCompleta ? 'auto' : 'none'} style={{ opacity: seleccionCompleta ? 1 : 0.4 }}>
          <PaymentMethodSelector
            uid={user?.uid}
            selectedMethod={selectedMethod}
            onSelectMethod={(method, cardInfo) => {
              setSelectedMethod(method);
              setSelectedCardInfo(cardInfo);
            }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, !seleccionCompleta && styles.confirmBtnDisabled]}
        activeOpacity={0.9}
        onPress={handleConfirmarReserva}
        disabled={submitting || !seleccionCompleta}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.confirmBtnText}>
            {selectedMethod === 'efectivo' ? 'Confirmar reserva' : 'Continuar al pago'}
          </Text>
        )}
      </TouchableOpacity>

      <PaymentProcessingModal
        visible={pagoTarjetaVisible}
        monto={montoFormateado}
        tarjeta={selectedCardInfo}
        onClose={() => setPagoTarjetaVisible(false)}
        onSuccess={crearReserva}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fafd' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  notFoundText: { marginTop: 10, color: '#888', fontSize: 14 },
  backBtn: { marginTop: 16, backgroundColor: COLOR_TEAL, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  heroImage: { width: '100%', height: 260 },
  heroImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eceff1' },
  backButtonFloating: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 18, paddingBottom: 6 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#222', fontFamily: 'Montserrat-Bold', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  type: { fontSize: 13, color: COLOR_TEAL, fontWeight: '600' },
  price: { fontSize: 14, fontWeight: '700', color: COLOR_ORANGE },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 13, color: '#888', marginLeft: 4 },
  distance: { fontSize: 12.5, color: '#999', marginBottom: 12 },
  desc: { fontSize: 14, color: '#444', lineHeight: 20, marginTop: 8 },

  gallerySection: { marginTop: 4, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#222', marginLeft: 18, marginBottom: 2 },

  // Tarjetas de sección (reserva / pago)
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDisabled: { backgroundColor: '#FAFCFD' },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  avisoIncompleto: {
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    marginBottom: 10,
    fontStyle: 'italic',
  },

  confirmBtn: {
    backgroundColor: COLOR_TEAL,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  confirmBtnDisabled: { backgroundColor: '#B7DAD5' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});