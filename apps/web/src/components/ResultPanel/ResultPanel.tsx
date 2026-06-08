'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ResultTable } from './ResultTable';

interface ResultPanelProps {
  result: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ResultPanel({ result }: ResultPanelProps) {
  if (result === null || result === undefined) {
    return null;
  }

  const extractedItems =
    isRecord(result) && Array.isArray(result['extractedItems'])
      ? (result['extractedItems'] as unknown[])
      : null;

  return (
    <Card className="animate-in fade-in duration-500">
      <CardHeader>
        <CardTitle className="text-lg">Result</CardTitle>
      </CardHeader>
      <CardContent>
        {extractedItems ? (
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-4 text-xs">
            {JSON.stringify(extractedItems, null, 2)}
          </pre>
        ) : isRecord(result) ? (
          <ResultTable data={result} />
        ) : (
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
