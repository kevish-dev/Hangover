export function isConnectionConstrained() {
  const { connection } = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  return !navigator.onLine || Boolean(connection?.saveData) ||
    ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
}


export function canAutoplayVideo() {
  return !isConnectionConstrained() && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}
