import { builtinModules } from 'node:module';

/**
 * Checks whether the module with the given identifier is a Node.js built-in.
 *
 * @param moduleId - Target module identifier.
 *
 * @returns `true` if module id starts with `node:` prefix, or matches to Node.js built-in.
 */
export function isNodeJSBuiltin(moduleId: string): boolean {
  return getNodeJSBuiltins().has(moduleId.startsWith('node:') ? moduleId.slice(5) : moduleId);
}

function getNodeJSBuiltins(): ReadonlySet<string> {
  return (nodeJSBuiltins ??= new Set(builtinModules));
}

let nodeJSBuiltins: Set<string> | undefined;
