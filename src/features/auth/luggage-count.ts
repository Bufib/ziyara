export const minimumLuggageCount = 0;
export const maximumLuggageCount = 50;

export function getLuggageCount(value: string) {
  if (!/^\d{1,2}$/.test(value)) {
    return null;
  }

  const luggageCount = Number(value);

  return Number.isInteger(luggageCount) &&
    luggageCount >= minimumLuggageCount &&
    luggageCount <= maximumLuggageCount
    ? luggageCount
    : null;
}
