import type { Param, ParameterObject, SchemaObject } from "./types.js";

export function paramFromSpec(p: ParameterObject): Param {
  const schema = p.schema ?? {};
  return {
    name: p.name,
    in: p.in as Param["in"],
    type: schemaToType(schema),
    required: p.required ?? p.in === "path",
    description: p.description ?? schema.description ?? "",
    enum: schema.enum,
    default: schema.default,
  };
}

export function schemaToType(schema: SchemaObject): string {
  if (schema.enum) return "enum";
  if (schema.type === "array") {
    const itemType = schema.items ? schemaToType(schema.items) : "string";
    return `${itemType}[]`;
  }
  return schema.type ?? "string";
}
