const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function getAllowedOrigins(): string[] {
  const origins = new Set(DEFAULT_DEV_ORIGINS);
  const fromEnv = process.env['FRONTEND_URL'];
  if (fromEnv) {
    origins.add(fromEnv);
  }
  return [...origins];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  return getAllowedOrigins().includes(origin);
}
