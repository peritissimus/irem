import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  {
    files: [
      '*.js',
      'scripts/**/*.js',
      'scripts/**/*.mjs',
      'src/**/*.js',
      'tests/**/*.js',
      'vite.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        DEFAULT_POST: 'readonly',
        DEFAULT_POSTS: 'readonly',
        ERROR_MESSAGES: 'readonly',
        FB: 'readonly',
        FACEBOOK_ID: 'readonly',
        INSTAGRAM_ID: 'readonly',
        LANG: 'readonly',
        POST_DESCRIPTION: 'readonly',
        SETTINGS: 'readonly',
        SITE_DESCRIPTION: 'readonly',
        SUPPORT_WEBGL: 'readonly',
        TWITTER_POST_DESCRIPTION: 'readonly',
        TWITTER_SITE_DESCRIPTION: 'readonly',
      },
    },
    rules: {
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
]
