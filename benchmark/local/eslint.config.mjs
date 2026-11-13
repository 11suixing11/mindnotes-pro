import rootConfig from '../../eslint.config.js'
import globals from 'globals'

export default [
  ...rootConfig,
  {
    files: [
      'benchmark/local/compare{,.test}.mjs',
      'benchmark/local/fixtures{,.test}.mjs',
      'benchmark/local/report{,.test}.mjs',
      'benchmark/local/runtime{,.test}.mjs',
      'benchmark/local/run-storage.mjs',
      'benchmark/local/storage.test.mjs',
      'benchmark/local/eslint.config.mjs',
    ],
    languageOptions: { globals: globals.node },
  },
]
