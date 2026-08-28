export function parseTechnologyInput(input: string): string[] {
  if (!input) return [];
  // Split on comma, semicolon, or newline
  return input
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
