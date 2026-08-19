// Cifrado simple para proteger los datos y que no queden visibles directamente.
// No es seguridad bancaria; para tarjetas reales se recomienda usar un proveedor
// de pagos y guardar únicamente el token.
// También corrige problemas con tildes y ñ, y evita errores al cifrar o descifrar.

const SECRET_KEY = 'Nikaia-App-ClientKey-2026'; // TODO: no usar tal cual en producción
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

//Texto bytes UTF-8 (sin depender de TextEncoder, no garantizado (todos los runtimes de Hermes/React Native)

function utf8Encode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let codePoint = str.codePointAt(i);
    if (codePoint > 0xffff) i++; // el siguiente char ya es parte del par surrogate

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes) {
  let str = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
    } else if ((b1 & 0xe0) === 0xc0) {
      const b2 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if ((b1 & 0xf0) === 0xe0) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      const codePoint =
        ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      str += String.fromCodePoint(codePoint);
    }
  }
  return str;
}

function xorBytes(bytes, keyBytes) {
  return bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
}

function bytesToBase64(bytes) {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const c1 = bytes[i];
    const has2 = i + 1 < bytes.length;
    const c2 = has2 ? bytes[i + 1] : 0;
    const has3 = i + 2 < bytes.length;
    const c3 = has3 ? bytes[i + 2] : 0;

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = has2 ? (((c2 & 15) << 2) | (c3 >> 6)) : 64;
    const e4 = has3 ? (c3 & 63) : 64;

    output +=
      BASE64_CHARS[e1] +
      BASE64_CHARS[e2] +
      (e3 === 64 ? '=' : BASE64_CHARS[e3]) +
      (e4 === 64 ? '=' : BASE64_CHARS[e4]);
  }
  return output;
}

function base64ToBytes(b64) {
  const str = String(b64).replace(/=+$/, '');
  const bytes = [];
  let i = 0;
  while (i < str.length) {
    const e1 = BASE64_CHARS.indexOf(str[i++]);
    const e2 = BASE64_CHARS.indexOf(str[i++]);
    const c3char = str[i++];
    const c4char = str[i++];
    const e3 = c3char !== undefined ? BASE64_CHARS.indexOf(c3char) : -1;
    const e4 = c4char !== undefined ? BASE64_CHARS.indexOf(c4char) : -1;

    bytes.push((e1 << 2) | (e2 >> 4));
    if (e3 !== -1) bytes.push(((e2 & 15) << 4) | (e3 >> 2));
    if (e4 !== -1) bytes.push(((e3 & 3) << 6) | e4);
  }
  return bytes;
}

// API pública
// Protegidas con try/catch: si el texto de entrada es raro o el dato
// guardado está corrupto, NUNCA truenan la app; solo devuelven '' y
// avisan por consola.

export function encryptText(plainText) {
  try {
    if (!plainText) return '';
    const bytes = utf8Encode(String(plainText));
    const keyBytes = utf8Encode(SECRET_KEY);
    const xored = xorBytes(bytes, keyBytes);
    return bytesToBase64(xored);
  } catch (e) {
    console.warn('encryptText: no se pudo cifrar el valor', e);
    return '';
  }
}

export function decryptText(cipherText) {
  try {
    if (!cipherText) return '';
    const bytes = base64ToBytes(cipherText);
    const keyBytes = utf8Encode(SECRET_KEY);
    const xored = xorBytes(bytes, keyBytes);
    return utf8Decode(xored);
  } catch (e) {
    console.warn('decryptText: no se pudo descifrar el valor', e);
    return '';
  }
}

// Últimos 4 dígitos únicamente, para mostrar en UI sin exponer el número
// completo en ningún momento.
export function maskCardNumber(cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  if (digits.length < 4) return '**** **** **** ****';
  return `**** **** **** ${digits.slice(-4)}`;
}

// Detecta la marca de la tarjeta a partir del número en claro, antes de
// cifrarlo. Este dato (marca) se guarda sin cifrar porque no es sensible
// por sí solo (no identifica la tarjeta).
export function detectCardBrand(cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Tarjeta';
}

// Nota para producción:
// No guardar el CVV.
// Mantener la clave fuera de la app, preferiblemente en el backend.
// Para pagos reales, usar un proveedor certificado PCI-DSS con tokenización.