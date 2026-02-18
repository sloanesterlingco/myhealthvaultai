// src/utils/firestoreSanitize.ts
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    // @ts-ignore
    return value.map(stripUndefined).filter((v) => v !== undefined) as T;
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
