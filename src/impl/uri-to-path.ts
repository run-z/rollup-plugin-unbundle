import path from 'node:path';

export function uriToPath(uri: string): string {
  const { pathname } = new URL(uri);

  console.debug(
    uri,
    pathname,
    path.parse(process.cwd()).root,
    path.join(path.parse(process.cwd()).root, pathname),
  );

  return path.resolve(path.parse(process.cwd()).root, pathname);
}
