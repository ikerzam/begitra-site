/** A string with its `{name}` placeholders filled in; a placeholder without a value stays as it is. */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A `YYYY-MM-DD` day written out in a locale: `September 30, 2026`, `30 de septiembre de 2026`. */
export function formatDate(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** Binary megabytes to one decimal, as Windows and the browsers show a download's size. */
export function megabytes(size: number, locale: string): string {
  const value = (size / (1024 * 1024)).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value} MB`;
}
