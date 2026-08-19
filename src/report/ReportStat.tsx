export interface ReportStatProps {
  label: string;
  value: string;
  caption: string;
}

export function ReportStat({ label, value, caption }: ReportStatProps) {
  return (
    <div className="report-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
    </div>
  );
}
