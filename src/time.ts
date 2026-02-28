export function parseTime(str: string): number | null {
  const value = parseFloat(str);
  if (isNaN(value)) return null;
  const ms = str.endsWith("s") ? value * 1000 : value;
  return Math.round(ms);
}
