export function sanitizeCommandName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";
}

export function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  let n = 2;
  while (used.has(candidate)) candidate = `${name}-${n++}`;
  used.add(candidate);
  return candidate;
}
