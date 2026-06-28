import { EnvironmentVariable } from '../types';

/**
 * Resolves all {{variableName}} instances in a string based on the active variables.
 */
export function resolveVariablesString(text: string, variables: EnvironmentVariable[]): string {
  if (!text) return text;
  const activeVars = variables.filter(v => v.enabled && v.key);
  const varMap = new Map(activeVars.map(v => [v.key, v.value]));

  // Matches {{var}} or {{ var }}
  const pattern = /\{\{\s*([^}\s]+)\s*\}\}/g;
  return text.replace(pattern, (match, varName) => {
    return varMap.has(varName) ? varMap.get(varName)! : match;
  });
}

/**
 * Utility to check if a string contains unresolved variables (useful for highlighting in UI).
 */
export function hasVariables(text: string): boolean {
  if (!text) return false;
  return /\{\{\s*([^}\s]+)\s*\}\}/.test(text);
}

/**
 * Lists all variable keys referenced in a string (e.g., for autocompleting or status indicators).
 */
export function getReferencedVariables(text: string): string[] {
  if (!text) return [];
  const pattern = /\{\{\s*([^}\s]+)\s*\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}
