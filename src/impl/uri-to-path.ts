import { fileURLToPath } from 'node:url';

export function uriToPath(uri: string): string {
  const { pathname } = new URL(uri);

  return fileURLToPath('file://' + pathname.replace(FIRST_PATH_CHAR_PATTERN, char => `/${char}`));
}

const FIRST_PATH_CHAR_PATTERN = /^[^/]/;
