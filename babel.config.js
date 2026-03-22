module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  plugins: [
    // React Compiler (自动优化 memoization)
    // 注：需要 npm install babel-plugin-react-compiler
    // ['babel-plugin-react-compiler', {}],

    // React Refresh (HMR 支持)
    '@babel/plugin-transform-react-jsx-self',
    '@babel/plugin-transform-react-jsx-source',

    // 其他优化
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-decorators'
  ],
  env: {
    production: {
      plugins: [
        // 生产环境追加优化
        [
          'transform-remove-console',
          {
            exclude: ['error', 'warn']
          }
        ]
      ]
    }
  }
}
