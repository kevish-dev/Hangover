const parseJsonArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const toValueFields = (value: unknown) =>
  parseJsonArray(value)
    .map((item: any) => {
      if (typeof item === "string") return item.trim();
      return String(item?.value ?? item?.text ?? item?.title ?? "").trim();
    })
    .filter(Boolean)
    .map((value) => ({ value }));

export const toTagFields = (value: unknown) =>
  parseJsonArray(value)
    .map((item: any) => {
      if (typeof item === "string") return item.trim();
      return String(item?.tag ?? item?.value ?? item?.name ?? "").trim();
    })
    .filter(Boolean)
    .map((value) => ({ value }));

const toTodos = (value: unknown, fallback: unknown = []) => {
  const source = value ?? fallback;
  if (Array.isArray(source)) {
    return source.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof source === "string") {
    const parsed = parseJsonArray(source);
    if (parsed.length) return parsed.map((item) => String(item).trim()).filter(Boolean);
    return source.split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const toOptionalNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const toTasks = (value: unknown) =>
  parseJsonArray(value).map((task: any) => ({
    ...(task?.id ? { id: task.id } : {}),
    category: task?.category || "GENERAL",
    title: task?.title || "",
    description: task?.description || "",
    unitPrice: toOptionalNumber(task?.unitPrice),
    quantityNeeded: toOptionalNumber(task?.quantityNeeded),
    dueOffsetDays: toOptionalNumber(task?.dueOffsetDays),
  }));

export const toItineraryFields = (value: unknown) =>
  parseJsonArray(value).map((day: any, index) => ({
    ...(day?.id ? { id: day.id } : {}),
    day: day?.day || `Day ${day?.dayNumber ?? index + 1}`,
    title: day?.title || "",
    description: day?.description || "",
    todos: toTodos(day?.todos, day?.activities),
    tasks: toTasks(day?.tasks),
  }));

export const toAddOnFields = (value: unknown) =>
  parseJsonArray(value).map((addOn: any) => ({
    ...(addOn?.id ? { id: addOn.id } : {}),
    title: addOn?.title || "",
    description: addOn?.description || "",
    imageUrl: addOn?.imageUrl || "",
    price: toOptionalNumber(addOn?.price) ?? 0,
    maxQuantityPerBooking: toOptionalNumber(addOn?.maxQuantityPerBooking),
    maxQuantityPerSlot: toOptionalNumber(addOn?.maxQuantityPerSlot),
    purchaseCutoffOffsetDays: toOptionalNumber(addOn?.purchaseCutoffOffsetDays),
    isActive: addOn?.isActive ?? true,
  }));

export const toPackageFields = (value: unknown) =>
  parseJsonArray(value).map((item: any) => ({
    ...(item?.id ? { id: item.id } : {}),
    title: item?.title || "",
    price: toOptionalNumber(item?.price) ?? 0,
    tokenAmount: toOptionalNumber(item?.tokenAmount) ?? 0,
  }));

export const toFaqFields = (value: unknown) =>
  parseJsonArray(value).map((item: any) => ({
    ...(item?.id ? { id: item.id } : {}),
    question: item?.question || "",
    answer: item?.answer || "",
  }));

export const toArray = parseJsonArray;
