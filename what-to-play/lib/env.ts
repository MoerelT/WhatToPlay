export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl() {
  const configured = process.env.APP_URL ?? "http://localhost:3000";
  const url = new URL(configured);

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be a plain application origin");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production");
  }

  return url.origin;
}
