/** @type {import("prettier").Config} */
module.exports = {
  // Core formatting
  semi: true,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,

  // Trailing commas where valid in ES5 (objects, arrays, etc.)
  trailingComma: 'es5',

  // Keep consistent arrow function style
  arrowParens: 'always',

  // Angular/HTML specifics
  htmlWhitespaceSensitivity: 'ignore',
  bracketSameLine: false,

  // Ensure formatting applies consistently
  endOfLine: 'lf',
};
