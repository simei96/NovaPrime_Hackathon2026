import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// ---------------------------------------------------------------------------
// NORMALIZACIÓN DE DATOS
// ---------------------------------------------------------------------------
// El proyecto mezcla nombres de campo en distintas colecciones (Nombre vs
// nombre, ImagenURL vs imagenURL, etc). Estas funciones centralizan esa
// tolerancia en un solo lugar, en vez de repetir "||" en cada componente.

// Convierte cualquier documento de contenido (Lugar, Restaurante, Hotel,
// Artesanía, Paquete, Ruta...) a una forma común que HomeContentCard sabe
// renderizar, sin importar de qué colección venga.
export function normalizeContentItem(docSnap, fallbackType = 'contenido') {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    type: data.tipo || data.Tipo || fallbackType,
    title:
      data.Titulo || data.titulo || data.Nombre || data.nombre || 'Sin título',
    description:
      data.Descripcion || data.descripcion || data.desc || '',
    image:
      data.ImagenURL ||
      data.imagenURL ||
      data.imagenPortadaURL ||
      data.imagen ||
      data.Imagen ||
      null,
    badge: data.Badge || data.badge || null,
    metadata: {
      rating: typeof data.rating === 'number' ? data.rating : null,
      favorites:
        typeof data.favoritosCount === 'number' ? data.favoritosCount : null,
      interactions:
        typeof data.interaccionesCount === 'number'
          ? data.interaccionesCount
          : null,
    },
    raw: data,
  };
}

// Promoción del CTA principal del Home.
export function normalizePromotion(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    titulo: data.Titulo || data.titulo || data.Nombre || null,
    descripcion: data.Descripcion || data.descripcion || null,
    imagenURL: data.ImagenURL || data.imagenURL || null,
    cta: data.CTA || data.cta || 'Ver oferta',
    activo: data.activo !== undefined ? !!data.activo : true,
    prioridad: typeof data.prioridad === 'number' ? data.prioridad : 0,
    raw: data,
  };
}

// Categoría del selector de categorías.
export function normalizeCategory(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    nombre: data.nombre || data.Nombre || data.label || 'Categoría',
    icono: data.icono || data.icon || 'shape-outline',
    color: data.color || '#fff',
    ruta: data.ruta || data.route || null,
    slug: data.slug || null,
    activo: data.activo !== undefined ? !!data.activo : true,
    orden: typeof data.orden === 'number' ? data.orden : 0,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// HELPERS DE CONSULTA CON FALLBACK SEGURO
// ---------------------------------------------------------------------------
// Patrón usado en todo el Home: intenta la consulta "ideal" (filtrando por
// activo/orden, que son los campos recomendados); si la colección todavía
// no tiene esos campos, el where()/orderBy() puede devolver vacío o lanzar
// error de índice faltante. En ese caso, cae a traer documentos "a secas"
// (sin filtro) en vez de romper la pantalla o inventar datos.

export async function fetchWithFallback({
  collectionName,
  preferredField = 'activo',
  orderField,
  max = 10,
}) {
  try {
    const constraints = [where(preferredField, '==', true)];
    if (orderField) constraints.push(orderBy(orderField));
    constraints.push(limit(max));
    const snap = await getDocs(query(collection(db, collectionName), ...constraints));
    if (!snap.empty) return { docs: snap.docs, usedFallback: false };
  } catch (e) {
    console.warn(
      `[${collectionName}] La consulta con "${preferredField}"` +
        (orderField ? ` + orden por "${orderField}"` : '') +
        ` falló (probablemente falta el campo o el índice compuesto). Usando fallback sin filtro. Detalle:`,
      e?.message || e,
    );
  }

  // Fallback: documentos "a secas", sin asumir campos que puedan no existir.
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(max)));
    return { docs: snap.docs, usedFallback: true };
  } catch (e) {
    console.warn(`[${collectionName}] Fallback también falló:`, e?.message || e);
    return { docs: [], usedFallback: true };
  }
}
