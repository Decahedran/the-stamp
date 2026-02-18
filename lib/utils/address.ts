const ADDRESS_REGEX = /^[a-z0-9_]+$/;

export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function isValidAddress(value: string, min = 3, max = 20): boolean {
  return value.length >= min && value.length <= max && ADDRESS_REGEX.test(value);
}
