'use client';

interface ResultTableProps {
  data: Record<string, unknown>;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function ResultTable({ data }: ResultTableProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No result data.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2 text-left font-medium">Key</th>
            <th className="px-4 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2 align-top font-mono text-muted-foreground">
                {key}
              </td>
              <td className="px-4 py-2 align-top whitespace-pre-wrap font-mono text-xs">
                {renderValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
