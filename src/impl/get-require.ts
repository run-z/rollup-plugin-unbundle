import module from 'node:module';

export function getRequire(): NodeRequire {
  return (requireModule ??= module.createRequire(import.meta.url));
}

let requireModule: NodeRequire | undefined;
