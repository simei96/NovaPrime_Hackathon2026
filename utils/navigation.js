// Navegación centralizada para no repetir router.push(...) con distintas
// formas en cada componente.
//
// SUPUESTO A CONFIRMAR: se asume que existe una ruta de detalle genérica en
// app/details/[id].js que lee el parámetro `type` para saber qué colección
// consultar. Si tu proyecto todavía no tiene esa pantalla, hay que crearla
// (o decirme el nombre real de la ruta de detalle que ya exista y ajusto
// esta función en un solo lugar).

export function navigateToContent(router, item) {
    if (!item?.id) {
      console.warn('navigateToContent: el item no tiene id, no se puede navegar.', item);
      return;
    }
    router.push({
      pathname: '/details/[id]',
      params: { id: item.id, type: item.type || 'contenido' },
    });
  }
  
  // Navegación por categoría: usa la ruta explícita de Firestore si existe
  // (campo `ruta`), y si no, arma una ruta genérica a partir del slug/id.
  export function navigateToCategory(router, categoria) {
    if (!categoria) return;
    if (categoria.ruta) {
      router.push(categoria.ruta);
      return;
    }
    const key = categoria.slug || categoria.id;
    router.push(`/services/${key}`);
  }
  