import { terser } from 'rollup-plugin-terser'

export default [{
  external: ['vue', 'vuex'],
  input: 'src/index.js',
  output: [
    {
      file: 'dist/vuex-use-model.esm.js',
      format: 'esm',
      globals: {
        vue: 'Vue',
        vuex: 'Vuex'
      }
    },
    {
      file: 'dist/vuex-use-model.umd.js',
      format: 'umd',
      name: 'vuex-use-model',
      globals: {
        vue: 'Vue',
        vuex: 'Vuex'
      }
    }
  ],
  plugins: [
    terser({ module: true })
  ]
}]
