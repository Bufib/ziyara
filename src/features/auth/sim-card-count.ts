export const minimumSimCardCount = 0;
export const maximumSimCardCount = 50;

export function getSimCardCount(value: string) {
  if (!/^\d{1,2}$/.test(value)) {
    return null;
  }

  const simCardCount = Number(value);

  return Number.isInteger(simCardCount) &&
    simCardCount >= minimumSimCardCount &&
    simCardCount <= maximumSimCardCount
    ? simCardCount
    : null;
}
