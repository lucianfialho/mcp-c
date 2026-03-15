import type { OpenAPISpec, SchemaObject } from "../parser/types.js";

export interface ValidationError {
  path: string;
  expected: string;
  got: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fieldsChecked: number;
}

export function validateResponse(
  data: unknown,
  operationPath: string,
  method: string,
  statusCode: number,
  spec: OpenAPISpec
): ValidationResult {
  const pathItem = spec.paths[operationPath];
  if (!pathItem) {
    return { valid: true, errors: [], fieldsChecked: 0 };
  }

  const operation = pathItem[method.toLowerCase() as keyof typeof pathItem] as
    | { responses?: Record<string, { content?: Record<string, { schema?: SchemaObject }> }> }
    | undefined;
  if (!operation?.responses) {
    return { valid: true, errors: [], fieldsChecked: 0 };
  }

  // Find matching response schema (try exact status, then "2XX", then "default")
  const responseSpec =
    operation.responses[String(statusCode)] ??
    operation.responses[`${Math.floor(statusCode / 100)}XX`] ??
    operation.responses["default"];

  if (!responseSpec?.content) {
    return { valid: true, errors: [], fieldsChecked: 0 };
  }

  const jsonContent = responseSpec.content["application/json"];
  if (!jsonContent?.schema) {
    return { valid: true, errors: [], fieldsChecked: 0 };
  }

  const schema = resolveSchema(jsonContent.schema, spec);
  const errors: ValidationError[] = [];
  const fieldsChecked = { count: 0 };

  validateValue(data, schema, "$", errors, fieldsChecked, spec);

  return {
    valid: errors.length === 0,
    errors,
    fieldsChecked: fieldsChecked.count,
  };
}

function validateValue(
  value: unknown,
  schema: SchemaObject,
  path: string,
  errors: ValidationError[],
  fieldsChecked: { count: number },
  spec: OpenAPISpec
): void {
  const resolved = resolveSchema(schema, spec);
  fieldsChecked.count++;

  if (value === null || value === undefined) {
    return; // nullable not strictly enforced
  }

  // Type check
  if (resolved.type) {
    const actualType = getJsonType(value);
    if (!typesMatch(resolved.type, actualType)) {
      errors.push({ path, expected: resolved.type, got: actualType });
      return;
    }
  }

  // Enum check
  if (resolved.enum && !resolved.enum.includes(String(value))) {
    errors.push({ path, expected: `enum(${resolved.enum.join("|")})`, got: String(value) });
  }

  // Array items
  if (resolved.type === "array" && Array.isArray(value) && resolved.items) {
    for (let i = 0; i < Math.min(value.length, 10); i++) {
      validateValue(value[i], resolved.items, `${path}[${i}]`, errors, fieldsChecked, spec);
    }
  }

  // Object properties
  if (resolved.type === "object" && typeof value === "object" && resolved.properties) {
    const obj = value as Record<string, unknown>;
    for (const [key, propSchema] of Object.entries(resolved.properties)) {
      if (obj[key] !== undefined) {
        validateValue(obj[key], propSchema, `${path}.${key}`, errors, fieldsChecked, spec);
      }
    }

    // Check required fields
    if (resolved.required) {
      for (const req of resolved.required) {
        if (obj[req] === undefined) {
          errors.push({ path: `${path}.${req}`, expected: "required", got: "missing" });
        }
      }
    }
  }
}

function getJsonType(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function typesMatch(schemaType: string, actualType: string): boolean {
  if (schemaType === actualType) return true;
  if (schemaType === "integer" && actualType === "number") return true;
  if (schemaType === "number" && actualType === "number") return true;
  return false;
}

function resolveSchema(schema: SchemaObject, spec: OpenAPISpec): SchemaObject {
  if (schema.$ref) {
    const parts = schema.$ref.replace("#/", "").split("/");
    let resolved: unknown = spec;
    for (const part of parts) {
      resolved = (resolved as Record<string, unknown>)?.[part];
    }
    return (resolved as SchemaObject) ?? schema;
  }
  return schema;
}
