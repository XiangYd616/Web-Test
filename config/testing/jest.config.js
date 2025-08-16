module.exports = {
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/tests"
  ],
  "testMatch": [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],
  "collectCoverageFrom": [
    "backend/**/*.js",
    "frontend/**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/coverage/**"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testTimeout": 30000
};