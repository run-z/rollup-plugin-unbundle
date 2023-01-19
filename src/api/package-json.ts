/**
 * Subset of [package.json](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) properties.
 */
export interface PackageJson {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: PackageJson.Dependencies | undefined;
  readonly peerDependencies?: PackageJson.Dependencies | undefined;
  readonly devDependencies?: PackageJson.Dependencies | undefined;
  readonly [key: string]: unknown;
}

export namespace PackageJson {
  /**
   * Package dependencies specifier.
   *
   * A map containing name/version_range pairs as map entries.
   */
  export interface Dependencies {
    readonly [name: string]: string;
  }
}
