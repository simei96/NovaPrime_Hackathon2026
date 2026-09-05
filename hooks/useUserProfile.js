import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useState, useEffect } from 'react';

// Documento singleton de configuración de bienvenida. A diferencia de
// Promo_003/Card_002 (que sí son "contenido" y deberían elegirse
// dinámicamente), este es un documento de configuración único del sitio —
// no hay ambigüedad de "cuál mostrar", así que referenciarlo directo es
// razonable. Si en el futuro manejas varias configuraciones (ej. por
// temporada), esto se puede convertir en una consulta con `activo`.
const WELCOME_CONFIG_PATH = ['WelcomeConfig', 'Welcome_001'];

export function useUserProfile() {
  const [user, setUser] = useState(auth.currentUser || null);
  const [username, setUsername] = useState(null);
  const [fotoPerfilURL, setFotoPerfilURL] = useState(null);
  const [logoURL, setLogoURL] = useState(null);
  const [logoHeaderId, setLogoHeaderId] = useState(null);
  const [loadingLogo, setLoadingLogo] = useState(true);

  // Sesión + datos del documento Users/{uid}
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUsername(null);
        setFotoPerfilURL(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'Users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsername(data.nombreUsuario || null);
          setFotoPerfilURL(data.fotoPerfilURL || null);
        } else {
          setUsername(null);
          setFotoPerfilURL(null);
        }
      } catch (e) {
        console.warn('useUserProfile: error cargando Users/{uid}:', e);
        setUsername(null);
        setFotoPerfilURL(null);
      }
    });
    return () => unsub && unsub();
  }, []);

  // Logo del header
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, ...WELCOME_CONFIG_PATH));
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data();
          setLogoURL(data.logoURL || null);
          setLogoHeaderId(data.logoHeaderId || null);
        }
      } catch (e) {
        console.warn('useUserProfile: error cargando WelcomeConfig:', e);
      } finally {
        if (active) setLoadingLogo(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Prioriza la foto de Firebase Auth (Google/redes) y cae a la de Firestore.
  const avatarURL = user?.photoURL || fotoPerfilURL || null;

  const displayName = user
    ? username || (user.email ? user.email.split('@')[0] : 'Usuario')
    : 'Inicia sesión';

  return { user, username, avatarURL, logoURL, logoHeaderId, loadingLogo, displayName };
}
