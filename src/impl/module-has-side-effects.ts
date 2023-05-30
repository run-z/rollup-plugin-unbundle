import { ImportResolution } from '@run-z/npk';
import { minimatch } from 'minimatch';

export function moduleHasSideEffects(resolved: ImportResolution): boolean | undefined {
  // Try to resolve to file system path.
  const deref = resolved.deref().asSubPackage();

  if (!deref) {
    return;
  }

  const { host, uri } = deref;
  const {
    packageInfo: {
      packageJson: { sideEffects },
    },
  } = host;

  if (sideEffects == null) {
    // `sideEffects` unspecified.
    return;
  }
  if (typeof sideEffects === 'boolean') {
    // Explicit `sideEffects` flag.
    return sideEffects;
  }

  if (deref.importSpec.kind === 'path' && Array.isArray(sideEffects)) {
    const path = new URL(uri).pathname;

    for (const pattern of sideEffects as string[]) {
      if (
        minimatch(
          path,
          pattern.includes('/')
            ? new URL(host.fs.resolvePath(host, pattern)).pathname
            : `**/${pattern}`,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  return;
}
