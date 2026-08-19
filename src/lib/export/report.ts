const BEATPORT_TITLE_SUFFIX =
  /\s*(?:[|–—-]\s*)?(?:on\s+)?Beatport(?:\.com)?\s*$/i;

export function cleanPageTitle(pageTitle: string): string {
  const firstPart = pageTitle.split('|')[0] ?? '';
  const withoutDownload = firstPart
    .replace(/\bdownloads?\b/gi, ' ')
    .replace(/^\s*[:\-–—]\s*/, ' ');
  const cleaned = withoutDownload
    .replace(BEATPORT_TITLE_SUFFIX, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Beatport list';
}

export function buildReportTitle(pageTitle: string): string {
  const name = cleanPageTitle(pageTitle);
  if (/^analysis of\b/i.test(name)) return name;
  return `Analysis of ${name}`;
}

export function formatReportDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const value = Number.isNaN(date.getTime()) ? now : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

export function formatReportSourceUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    return `${url.host}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return pageUrl;
  }
}

export function reportPrintQuery(search: string): boolean {
  return new URLSearchParams(search).get('print') === '1';
}

export function statsBasisLabel(
  trackCount: number,
  listCount?: number | null,
  complete?: boolean,
): string {
  if (complete !== true && listCount != null && listCount > trackCount) {
    return `Stats based on ${trackCount} of ${listCount} tracks`;
  }
  return `Stats based on ${trackCount} tracks`;
}
