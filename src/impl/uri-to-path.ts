import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function uriToPath(uri: string): string {
  if (uri.startsWith('file:')) {
    return fileURLToPath(uri);
  }

  const { pathname } = new URL(uri);

  return path.resolve(path.parse(process.cwd()).root, pathname);
}
