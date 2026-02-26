const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    { ignores: ['.build/**', 'node_modules/**'] },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
            globals: {
                process: 'readonly',
                console: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                Buffer: 'readonly',
            },
        },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'prefer-template': 'error',
    },
    },
];
