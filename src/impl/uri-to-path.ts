import { fileURLToPath, pathToFileURL } from 'node:url';

export function uriToPath(uri: string): string {
  const { pathname } = new URL(uri);

  console.debug(
    uri,
    pathname,
    pathname.replace(FIRST_PATH_CHAR_PATTERN, char => `/${char}`),
    pathToFileURL(process.cwd()),
  );

  return fileURLToPath(
    new URL(
      pathname.replace(FIRST_PATH_CHAR_PATTERN, char => `/${char}`),
      pathToFileURL(process.cwd()),
    ).href,
  );
}

const FIRST_PATH_CHAR_PATTERN = /^[^/]/;
