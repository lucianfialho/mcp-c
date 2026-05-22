import type { OpenAPISpec, ParameterObject, SchemaObject } from "./types.js";

function followPointer(ref: string, spec: OpenAPISpec): unknown {
  const parts = ref.replace("#/", "").split("/");
  let resolved: unknown = spec;
  for (const part of parts) {
    resolved = (resolved as Record<string, unknown>)?.[part];
  }
  return resolved;
}

export function resolveSchema(schema: SchemaObject, spec: OpenAPISpec): SchemaObject {
  if (!schema.$ref) return schema;
  return (followPointer(schema.$ref, spec) as SchemaObject) ?? schema;
}

export function resolveParameter(param: ParameterObject, spec: OpenAPISpec): ParameterObject {
  const ref = (param as ParameterObject & { $ref?: string }).$ref;
  if (!ref) return param;
  return (followPointer(ref, spec) as ParameterObject) ?? param;
}
