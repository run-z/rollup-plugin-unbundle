import { Import } from '../api/import.js';

export function urlToImport(uri: URL): Import.URI {
  return {
    kind: 'uri',
    spec: uri.href,
    scheme: uri.href,
    path: uri.pathname,
  };
}
