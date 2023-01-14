export default {
  preset: 'ts-jest/presets/default-esm',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/mod.ts', '!**/node_modules/**'],
  coverageDirectory: 'target/coverage',
  coverageThreshold: {
    global: {},
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'All Tests',
        outputDirectory: './target/test-results',
        classNameTemplate: '{classname}: {title}',
        titleTemplate: '{classname}: {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
  },
};
