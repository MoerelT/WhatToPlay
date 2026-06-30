export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}
