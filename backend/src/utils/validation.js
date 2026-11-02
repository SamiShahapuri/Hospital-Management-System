export function isValidEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function parseFutureDate(value, now = Date.now()) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(nowMs) || date.getTime() <= nowMs) {
    return null;
  }
  return date;
}

export function normalizeBillItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    return { error: "Add between 1 and 20 bill items" };
  }

  const normalizedItems = [];
  for (const item of items) {
    const description = typeof item?.description === "string" ? item.description.trim() : "";
    const quantity = Number(item?.quantity);
    const unitPrice = Number(item?.unitPrice);
    if (!description || description.length > 200 ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 ||
        !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1000000) {
      return {
        error: "Each item needs a description, whole-number quantity, and valid non-negative unit price"
      };
    }
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    normalizedItems.push({ description, quantity, unitPrice, lineTotal });
  }

  const subtotal = Math.round(
    normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100
  ) / 100;
  return { items: normalizedItems, subtotal };
}
