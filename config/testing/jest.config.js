module.exports = {
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/tests",
    "<rootDir>/backend/tests"
  ],
  "testMatch": [
    "**/__tests__/**/*.(js|ts)",
    "**/?(*.)+(spec|test).(js|ts)"
  ],
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "moduleFileExtensions": [
    "js",
    "ts",
    "json"
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