module.exports = {
  root: true,
  extends: [
    'plugin:vue-libs/recommended',
    'plugin:jest/recommended'
  ],
  globals: {
    '__DEV__': true
  },
  plugins: [
    'jest'
  ],
}