// Tasa de cambio aproximada Córdoba (C$) -> Dólar (US$).
// Ajusta este valor periódicamente, o reemplázalo por una consulta a una API
// de tipo de cambio (ej. BCN) si tu app necesita la tasa oficial del día.
export const TASA_CAMBIO_USD = 36.6;

export function formatCordobas(monto) {
  if (monto == null || isNaN(monto)) return '';
  return `C$${Number(monto).toLocaleString('es-NI', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDolares(montoCordobas) {
  if (montoCordobas == null || isNaN(montoCordobas)) return '';
  const usd = Number(montoCordobas) / TASA_CAMBIO_USD;
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}