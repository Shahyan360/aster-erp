import tseslint from 'typescript-eslint';
export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**', 'public/**'] },
    {
        files: ['src/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            // Existing template and shared-grid APIs still use any; migration is separate.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
            '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': false }],
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
        }
    }
);
