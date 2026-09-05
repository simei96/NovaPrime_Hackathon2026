import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import {
  fetchWithFallback,
  normalizeCategory,
  normalizeContentItem,
  normalizePromotion,
} from '../services/firebaseService';

const FALLBACK_CATEGORIES = [
  { id: 'fallback-artesania', nombre: 'Artesanias', icono: 'palette', color: '#fff', slug: 'crafts', ruta: '/services/crafts' },
  { id: 'fallback-gastronomia', nombre: 'Gastronomia', icono: 'food', color: '#fff', slug: 'restaurants', ruta: '/services/restaurants' },
  { id: 'fallback-naturaleza', nombre: 'Naturaleza', icono: 'leaf', color: '#fff', slug: 'naturaleza', ruta: '/services/naturaleza' },
  { id: 'fallback-tradiciones', nombre: 'Tradiciones', icono: 'account-group', color: '#fff', slug: 'tradiciones', ruta: '/services/tradiciones' },
  { id: 'fallback-danza', nombre: 'Danza y Musica', icono: 'music', color: '#fff', slug: 'danzamusica', ruta: '/services/danzamusica' },
  { id: 'fallback-historia', nombre: 'Historia', icono: 'book', color: '#fff', slug: 'historia', ruta: '/services/historia' },
];

const FALLBACK_CULTURE = {
  id: null,
  label: 'Cultura del día',
  titulo: 'Conoce el Palo de Mayo',
  descripcion:
    'Descubre la historia, música y tradiciones de esta celebración cultural de la Costa Caribe de Nicaragua.',
  imagenURL: null,
  tipo: 'experiencia',
};

async function fetchPromotion() {
  const { docs } = await fetchWithFallback({
    collectionName: 'Promociones',
    preferredField: 'activo',
    orderField: 'prioridad',
    max: 1,
  });
  if (!docs.length) return null;
  return normalizePromotion(docs[0]);
}

async function fetchFeaturedCards() {
  const { docs } = await fetchWithFallback({
    collectionName: 'CardPrincipal',
    preferredField: 'activo',
    orderField: 'orden',
    max: 10,
  });
  return docs.map((d) => normalizeContentItem(d, 'destino'));
}

async function fetchCategories() {
  try {
    const snap = await getDocs(query(collection(db, 'Categorias'), limit(20)));
    if (snap.empty) return FALLBACK_CATEGORIES;
    const cats = snap.docs.map((d) => normalizeCategory(d));
    return cats.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  } catch (e) {
    console.warn('useHomeData: fallo total cargando Categorias, usando fallback estático:', e);
    return FALLBACK_CATEGORIES;
  }
}

async function fetchItineraryForUser(uid) {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'Eventos'), where('usuarioId', '==', uid), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        allDay: !data.hora && !data.horaInicio,
        time: data.hora || data.horaInicio || null,
        title: data.titulo || data.Titulo || data.nombre || 'Actividad',
        subtitle: data.subtitulo || data.lugar || data.ubicacion || '',
        color: data.color || null,
        type: data.tipo || 'evento',
      };
    });
  } catch (e) {
    console.warn(
      'useHomeData: no se pudo cargar el itinerario (revisa si "Eventos" tiene el campo usuarioId):',
      e?.message || e,
    );
    return [];
  }
}

async function fetchCultureOfTheDay() {
  try {
    const { docs } = await fetchWithFallback({
      collectionName: 'LugaresExperiencia',
      preferredField: 'destacado',
      max: 1,
    });
    if (!docs.length) return FALLBACK_CULTURE;
    const item = normalizeContentItem(docs[0], 'experiencia');
    return {
      id: item.id,
      label: 'Cultura del día',
      titulo: item.title,
      descripcion: item.description,
      imagenURL: item.image,
      tipo: item.type,
    };
  } catch (e) {
    console.warn('useHomeData: no se pudo cargar cultura del día, usando fallback:', e);
    return FALLBACK_CULTURE;
  }
}

export function useHomeData(user) {
  const [promotion, setPromotion] = useState(null);
  const [featuredCards, setFeaturedCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [cultureOfTheDay, setCultureOfTheDay] = useState(FALLBACK_CULTURE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [promo, cards, cats, culture] = await Promise.all([
          fetchPromotion(),
          fetchFeaturedCards(),
          fetchCategories(),
          fetchCultureOfTheDay(),
        ]);
        if (!active) return;
        setPromotion(promo);
        setFeaturedCards(cards);
        setCategories(cats);
        setCultureOfTheDay(culture);
      } catch (e) {
        console.error('useHomeData: error cargando datos del Home:', e);
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const events = await fetchItineraryForUser(user?.uid);
      if (active) setItinerary(events);
    })();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  return { promotion, featuredCards, categories, itinerary, cultureOfTheDay, loading, error };
}