module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  moduleNameMapper: {
    '^@creator-platform/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          baseUrl: '.',
          paths: {
            '@creator-platform/contracts': ['../../packages/contracts/src/index.ts'],
          },
        },
      },
    ],
  },
};
