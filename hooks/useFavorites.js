import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

// NOTA IMPORTANTE DE ESQUEMA:
// La colección "Favoritos" ya se usa en otras pantallas de la app con DOS
// formas distintas de documento:
//   1) Historias guardadas (CalendarScreen): { UsuarioId, Nombre, Categoria,
//      Lugar, ImagenURL, Estado, CreadoEn }
//   2) Publicaciones guardadas (CalendarScreen): { usuarioId, tipo:
//      'publicacion', publicacionId, creadoEn }
// Para el Home, este hook usa una TERCERA forma genérica pensada para
// cualquier tipo de contenido (Lugares, Restaurantes, Hoteles, etc.):
//   { usuarioId, contenidoId, tipo, creadoEn }
// Es compatible en lectura con la forma (2) porque ambas usan "usuarioId"
// en minúscula, pero NO detecta las historias guardadas con "UsuarioId"
// en mayúscula. Recomendación: unificar a un solo esquema de Favoritos
// más adelante para que todas las pantallas cuenten lo mismo.

export function useFavorites(user) {
  const [favoritesMap, setFavoritesMap] = useState({}); // { [contenidoId]: favoritoDocId }

  useEffect(() => {
    if (!user) {
      setFavoritesMap({});
      return undefined;
    }
    const q = query(collection(db, 'Favoritos'), where('usuarioId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          const v = d.data();
          if (v.contenidoId) map[v.contenidoId] = d.id;
        });
        setFavoritesMap(map);
      },
      (err) => console.warn('useFavorites: error escuchando Favoritos:', err),
    );
    return () => unsub();
  }, [user]);

  async function toggleFavorite(item, { onRequireLogin } = {}) {
    if (!user) {
      onRequireLogin && onRequireLogin();
      return;
    }
    if (!item?.id) return;
    const existingDocId = favoritesMap[item.id];
    try {
      if (existingDocId) {
        await deleteDoc(doc(db, 'Favoritos', existingDocId));
      } else {
        await addDoc(collection(db, 'Favoritos'), {
          usuarioId: user.uid,
          contenidoId: item.id,
          tipo: item.type || 'contenido',
          creadoEn: new Date(),
        });
      }
    } catch (e) {
      console.warn('useFavorites: error actualizando favorito:', e);
    }
  }

  return { favoritesMap, toggleFavorite };
}
