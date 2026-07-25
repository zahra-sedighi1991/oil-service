const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export function normalizeMobile(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
}

export function normalizePlate(value: string): string {
  return normalizeDigits(value)
    .replace(/\s|-/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .toUpperCase();
}
