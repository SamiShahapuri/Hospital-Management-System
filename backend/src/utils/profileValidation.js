import { isValidEmail } from "./validation.js";

export function validateProfileUpdates(body, { allowAddress = false } = {}) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const allowed = new Set(["phone", "email", "photo", ...(allowAddress ? ["address"] : [])]);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    return { error: "Only contact details and profile photo can be changed. Identity details are protected." };
  }

  const updates = {};
  if ("phone" in input) {
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const digits = phone.replace(/\D/g, "").length;
    if (phone && (phone.length > 30 || digits < 7 || digits > 15 || !/^\+?[0-9 ()-]+$/.test(phone))) {
      return { error: "Enter a valid contact number (7–15 digits)." };
    }
    updates.phone = phone;
  }
  if ("email" in input) {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (!isValidEmail(email) || email.length > 254) return { error: "Enter a valid email address." };
    updates.email = email;
  }
  if ("address" in input) {
    const address = typeof input.address === "string" ? input.address.trim() : "";
    if (address.length > 300) return { error: "Address must be 300 characters or fewer." };
    updates.address = address;
  }
  if ("photo" in input) {
    const photo = typeof input.photo === "string" ? input.photo : "";
    if (photo) {
      const match = photo.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) return { error: "Upload a PNG, JPG or WEBP image." };
      const approximateBytes = Math.floor(match[2].length * 3 / 4);
      if (approximateBytes > 1_500_000) return { error: "Profile photo must be 1.5 MB or smaller." };
    }
    updates.photo = photo;
  }
  if (!Object.keys(updates).length) return { error: "Choose at least one profile detail to update." };
  return { updates };
}
