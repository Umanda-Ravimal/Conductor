'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export type TaskTypeOption =
  | 'web-search'
  | 'scraper'
  | 'health-check'
  | 'price-check';

const OPTIONS: {
  label: string;
  value: TaskTypeOption;
  apiType: 'web-search' | 'scraper' | 'health-check';
}[] = [
  { label: 'Search', value: 'web-search', apiType: 'web-search' },
  { label: 'Scraper', value: 'scraper', apiType: 'scraper' },
  { label: 'Price Check', value: 'price-check', apiType: 'scraper' },
  { label: 'Health Check', value: 'health-check', apiType: 'health-check' },
];

export function mapTaskTypeToApi(value: TaskTypeOption): string {
  const opt = OPTIONS.find((o) => o.value === value);
  return opt?.apiType ?? value;
}

interface TaskTypeSelectorProps {
  value: TaskTypeOption;
  onChange: (value: TaskTypeOption) => void;
}

export function TaskTypeSelector({ value, onChange }: TaskTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TaskTypeOption)}>
      <SelectTrigger>
        <SelectValue placeholder="Select task type" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
