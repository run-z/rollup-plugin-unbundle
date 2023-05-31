import path from 'node:path';

export function uriToPath(uri: string): string {
  const { pathname } = new URL(uri);

  return path.resolve(path.parse(process.cwd()).root, pathname);
}
