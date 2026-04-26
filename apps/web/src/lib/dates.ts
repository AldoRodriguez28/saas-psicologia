/**
 * Convierte un string ISO de fecha (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ)
 * en un Date local evitando el desfase de timezone.
 *
 * El problema: `new Date('2026-04-26')` → UTC midnight → en México (UTC-6)
 * se muestra como '25 de abril'. Este helper usa la parte de fecha directamente.
 */
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}
