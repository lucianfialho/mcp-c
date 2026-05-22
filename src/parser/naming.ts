export function resolveOperationId(operationId: string | undefined, method: string, path: string): string {
  if (!operationId || operationId.includes("/") || operationId.includes("{")) {
    return generateOperationId(method, path);
  }
  return operationId;
}

function generateOperationId(method: string, path: string): string {
  const segments = path
    .split("/")
    .filter((s) => s && !s.startsWith("{"))
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, ""));

  if (segments.length === 0) return method;

  const resource = segments[segments.length - 1];
  const singular = resource.endsWith("s") ? resource.slice(0, -1) : resource;

  switch (method) {
    case "get":
      if (path.endsWith("}")) return `get${capitalize(singular)}`;
      return `list${capitalize(resource)}`;
    case "post":
      return `create${capitalize(singular)}`;
    case "put":
    case "patch":
      return `update${capitalize(singular)}`;
    case "delete":
      return `delete${capitalize(singular)}`;
    default:
      return `${method}${capitalize(resource)}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
