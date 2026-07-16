export const normalizeEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
};

export const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

export const compactTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 20);

export const nullableText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

