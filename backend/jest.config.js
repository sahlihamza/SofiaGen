module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/index.js", "!src/routes.js"],
  coverageDirectory: "coverage",
  verbose: true,
  forceExit: true,
  globalSetup: "./tests/setup.js",
  globalTeardown: "./tests/teardown.js",
};