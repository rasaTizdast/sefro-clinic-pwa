const snakeToCamel = (s: string): string => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const camelToSnake = (s: string): string => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

type Obj = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

export const transformKeys = (data: unknown, converter: (s: string) => string): unknown => {
  if (isArray(data)) {
    return data.map((item) => transformKeys(item, converter));
  }
  if (isPlainObject(data)) {
    const result: Obj = {};
    for (const [key, value] of Object.entries(data)) {
      result[converter(key)] = transformKeys(value, converter);
    }
    return result;
  }
  return data;
};

export const toCamelCase = (data: unknown): unknown => transformKeys(data, snakeToCamel);

export const toSnakeCase = (data: unknown): unknown => transformKeys(data, camelToSnake);
