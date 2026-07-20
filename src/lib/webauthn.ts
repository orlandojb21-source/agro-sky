// Desbloqueo biometrico local (huella/rostro) para reabrir la app en el
// mismo dispositivo, usando la API nativa WebAuthn del navegador. NO es un
// reemplazo de la autenticacion contra Supabase ni requiere servidor: es un
// candado local que solo revela el contenido si el sistema operativo
// confirma el biometrico del dueno del dispositivo (mismo modelo que el
// "desbloqueo rapido" de apps bancarias). La credencial vive en localStorage,
// por dispositivo y por usuario.

const PREFIJO_ALMACENAMIENTO = "agro-sky-biometrico-";

function claveAlmacenamiento(userId: string): string {
  return `${PREFIJO_ALMACENAMIENTO}${userId}`;
}

function bufferABase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlABuffer(base64url: string): ArrayBuffer {
  const relleno = (4 - (base64url.length % 4)) % 4;
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(relleno);
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

// Restringido a celulares a proposito: en Windows, tener Windows Hello
// configurado (aunque sea solo un PIN, sin huella real) hace que el
// navegador ofrezca "autenticador de plataforma" tambien en computadoras,
// y el usuario no quiere el candado biometrico ahi, solo en el celular.
export function esMobil(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
}

export async function biometricoDisponible(): Promise<boolean> {
  if (!esMobil()) return false;
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function biometricoRegistrado(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(claveAlmacenamiento(userId)));
}

export async function registrarBiometrico(
  userId: string,
  email: string,
  nombreCompleto: string,
): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Agro Sky", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: nombreCompleto,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    localStorage.setItem(claveAlmacenamiento(userId), bufferABase64url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

export async function desbloquearConBiometrico(userId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const credentialId = localStorage.getItem(claveAlmacenamiento(userId));
  if (!credentialId) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: base64urlABuffer(credentialId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

export function olvidarBiometrico(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(claveAlmacenamiento(userId));
}
