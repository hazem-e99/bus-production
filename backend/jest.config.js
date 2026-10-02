module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // Unit specs live next to the code (src/**/*.spec.ts); API e2e specs live in test/ (*.e2e-spec.ts).
  testRegex: '\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
};
