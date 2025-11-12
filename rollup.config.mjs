import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const production = !process.env.ROLLUP_WATCH;

// Build both cards
export default [
  // ChoreBot List Card (original)
  {
    input: "src/main.ts",
    output: {
      file: "dist/chorebot-list-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [resolve(), typescript(), production && terser()],
  },
  // ChoreBot Grouped Card (new)
  {
    input: "src/grouped-card.ts",
    output: {
      file: "dist/chorebot-grouped-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [resolve(), typescript(), production && terser()],
  },
];
