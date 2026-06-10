export const toPositiveInt = (value: number | string | undefined, fallback = 1) => {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

export const resolveQuantityStep = (rawStep: number | undefined, moq: number) => {
  const safeMoq = toPositiveInt(moq, 1);
  const parsedStep = toPositiveInt(rawStep, safeMoq);
  return parsedStep > 1 ? parsedStep : safeMoq;
};

export const snapQuantityToStep = (value: number | string, moq: number, step: number) => {
  const safeMoq = toPositiveInt(moq, 1);
  const safeStep = toPositiveInt(step, safeMoq);
  const parsed = Number.parseInt(String(value), 10);
  const clamped = Math.max(Number.isFinite(parsed) ? parsed : safeMoq, safeMoq);

  if (safeStep <= 1) return clamped;

  const remainder = (clamped - safeMoq) % safeStep;
  return remainder === 0 ? clamped : clamped + (safeStep - remainder);
};

export const getMaxValidQuantity = (
  availableStock: number,
  moq: number,
  step: number,
  isPhysical: boolean
) => {
  if (!isPhysical) return undefined;

  const stock = Number.parseInt(String(availableStock), 10);
  if (!Number.isFinite(stock) || stock <= 0) return 0;

  const safeMoq = toPositiveInt(moq, 1);
  if (stock < safeMoq) return 0;

  const safeStep = toPositiveInt(step, safeMoq);
  if (safeStep <= 1) return stock;

  return safeMoq + Math.floor((stock - safeMoq) / safeStep) * safeStep;
};

export const formatSpecKey = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
