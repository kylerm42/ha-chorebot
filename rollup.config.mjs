import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/chorebot-list-card.js',
    format: 'es',
    sourcemap: !production
  },
  plugins: [
    resolve(),
    typescript(),
    production && terser()
  ]
};
