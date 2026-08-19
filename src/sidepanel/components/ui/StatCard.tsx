export interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="panel-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
