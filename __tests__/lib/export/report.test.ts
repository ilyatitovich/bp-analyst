import { describe, expect, it } from 'vitest';
import {
  buildReportTitle,
  cleanPageTitle,
  formatReportDate,
  formatReportSourceUrl,
  reportPrintQuery,
  statsBasisLabel,
} from '../../../src/lib/export/report';

describe('cleanPageTitle', () => {
  it('uses the first pipe segment and strips Beatport suffixes', () => {
    expect(cleanPageTitle('Deep House Top 100 | Beatport')).toBe('Deep House Top 100');
    expect(cleanPageTitle('Defected | Charts | Beatport')).toBe('Defected');
    expect(cleanPageTitle('Defected - Beatport')).toBe('Defected');
    expect(cleanPageTitle('Hot Creations on Beatport')).toBe('Hot Creations');
  });

  it('removes a leading download word from Beatport titles', () => {
    expect(cleanPageTitle('Download Deep House Top 100 | Beatport')).toBe(
      'Deep House Top 100',
    );
    expect(cleanPageTitle('Downloads: Defected Records | Beatport')).toBe(
      'Defected Records',
    );
  });

  it('falls back when the title is only Beatport', () => {
    expect(cleanPageTitle('Beatport')).toBe('Beatport list');
    expect(cleanPageTitle('  | Beatport  ')).toBe('Beatport list');
  });
});

describe('buildReportTitle', () => {
  it('prefixes Analysis of for chart and label pages', () => {
    expect(buildReportTitle('Deep House Top 100 | Beatport')).toBe(
      'Analysis of Deep House Top 100',
    );
    expect(buildReportTitle('Defected | Beatport')).toBe('Analysis of Defected');
  });

  it('does not double-prefix an existing analysis title', () => {
    expect(buildReportTitle('Analysis of Tech House Top 100')).toBe(
      'Analysis of Tech House Top 100',
    );
  });
});

describe('formatReportDate', () => {
  it('formats ISO timestamps in UTC', () => {
    expect(formatReportDate('2026-08-18T22:15:00.000Z')).toBe('18 Aug 2026');
  });
});

describe('formatReportSourceUrl', () => {
  it('shows host and path without protocol', () => {
    expect(
      formatReportSourceUrl(
        'https://www.beatport.com/genre/deep-house/12/top-100?page=1',
      ),
    ).toBe('www.beatport.com/genre/deep-house/12/top-100');
  });

  it('returns the original string when the url is invalid', () => {
    expect(formatReportSourceUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('reportPrintQuery', () => {
  it('detects the print flag', () => {
    expect(reportPrintQuery('?print=1')).toBe(true);
    expect(reportPrintQuery('?print=0')).toBe(false);
    expect(reportPrintQuery('')).toBe(false);
  });
});

describe('statsBasisLabel', () => {
  it('always names the captured track count', () => {
    expect(statsBasisLabel(150, 150, true)).toBe('Stats based on 150 tracks');
    expect(statsBasisLabel(100)).toBe('Stats based on 100 tracks');
  });

  it('shows N of M while the list is still loading', () => {
    expect(statsBasisLabel(25, 100, false)).toBe('Stats based on 25 of 100 tracks');
  });
});
