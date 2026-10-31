export function academicYearStart(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !month) {
    return date.getFullYear();
  }
  return month >= 9 ? year : year - 1;
}

export function academicYearLabel(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}\u2013${end}`;
}

export function requestYearLabel(year?: number): string {
  const start = year && year > 0 ? year : academicYearStart();
  return academicYearLabel(start);
}
