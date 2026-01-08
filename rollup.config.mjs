import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";

const production = !process.env.ROLLUP_WATCH;

// Build all active cards (deprecated cards are in src/deprecated/ for reference only)
// IMPORTANT: Cards MUST be built to dist/ for HACS Plugin compatibility
// HACS looks for frontend files in dist/ directory (see https://hacs.xyz/docs/publish/plugin/)
export default [
  // ChoreBot Grouped Card
  {
    input: "src/grouped-card.ts",
    output: {
      file: "dist/chorebot-grouped-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript(),
      production && terser(),
    ],
  },
  // ChoreBot Add Task Card
  {
    input: "src/add-task-card.ts",
    output: {
      file: "dist/chorebot-add-task-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript(),
      production && terser(),
    ],
  },
  // ChoreBot Person Points Card
  {
    input: "src/person-points-card.ts",
    output: {
      file: "dist/chorebot-person-points-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript(),
      production && terser(),
    ],
  },
  // ChoreBot Person Rewards Card
  {
    input: "src/person-rewards-card.ts",
    output: {
      file: "dist/chorebot-person-rewards-card.js",
      format: "es",
      sourcemap: !production,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript(),
      production && terser(),
    ],
  },
];
