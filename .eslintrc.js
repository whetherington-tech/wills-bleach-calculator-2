module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Relax rules for production build
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/no-unescaped-entities': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
}