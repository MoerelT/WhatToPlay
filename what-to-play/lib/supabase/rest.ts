import { requireEnv } from "@/lib/env";

type QueryParams = Record<string, string | number | boolean | undefined>;

const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = () =>
  process.env.SUPABASE_SECRET_KEY ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY");

function buildUrl(table: string, params: QueryParams = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl());

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function request<T>(
  table: string,
  init: RequestInit & { params?: QueryParams } = {},
) {
  const response = await fetch(buildUrl(table, init.params), {
    ...init,
    headers: {
      apikey: serviceRoleKey(),
      Authorization: `Bearer ${serviceRoleKey()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${table} request failed: ${details}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function selectRows<T>(table: string, params: QueryParams = {}) {
  return request<T[]>(table, {
    method: "GET",
    params,
    headers: {
      Prefer: "",
    },
  });
}

export async function insertRows<T>(table: string, rows: unknown[]) {
  return request<T[]>(table, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

export async function upsertRows<T>(
  table: string,
  rows: unknown[],
  onConflict: string,
) {
  return request<T[]>(table, {
    method: "POST",
    params: { on_conflict: onConflict },
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
}

export async function updateRows<T>(
  table: string,
  values: Record<string, unknown>,
  params: QueryParams,
) {
  return request<T[]>(table, {
    method: "PATCH",
    params,
    body: JSON.stringify(values),
  });
}

export async function deleteRows<T>(table: string, params: QueryParams) {
  return request<T[]>(table, {
    method: "DELETE",
    params,
  });
}
