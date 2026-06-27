export const minutesFromNow = (minutes) =>
  new Date(Date.now() + minutes * 60 * 1000);

export const hoursFromNow = (hours) =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

export const daysFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);
