export const GST_RATE = 0.05;

export const roundCurrency = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

/** Prices configured for trips, packages and ad-ons are tax-exclusive. */
export const addGst = (subtotal) => roundCurrency(Number(subtotal || 0) * (1 + GST_RATE));

/** All booking/payment totals are stored as GST-inclusive values. */
export const gstBreakdown = (total) => {
  const gross = roundCurrency(total);
  const subtotal = roundCurrency(gross / (1 + GST_RATE));
  return {
    subtotal,
    gst: roundCurrency(gross - subtotal),
    total: gross,
  };
};

export const amountDueAfterPayment = (total, paid) =>
  roundCurrency(Math.max(0, Number(total || 0) - Number(paid || 0)));
