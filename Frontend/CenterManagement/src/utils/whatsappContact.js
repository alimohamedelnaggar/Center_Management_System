// Platform support number used by "تواصل مع الإدارة" WhatsApp buttons.
// Configure with the VITE_PLATFORM_CONTACT_WHATSAPP env var (never hardcode).

export function platformContactPhone() {
  const raw = import.meta.env?.VITE_PLATFORM_CONTACT_WHATSAPP;
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits || null;
}

export function platformContactWhatsApp(message) {
  const phone = platformContactPhone();
  if (!phone) return null;
  const base = `https://wa.me/${phone}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `${base}${text}`;
}
