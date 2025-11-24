import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";

const production = !process.env.ROLLUP_WATCH;

// Build all three cards
export default [
  // ChoreBot List Card (original)
  {
    input: "src/main.ts",
    output: {
      file: "dist/chorebot-list-card.js",
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
  // ChoreBot Rewards Card
  {
    input: "src/rewards-card.ts",
    output: {
      file: "dist/chorebot-rewards-card.js",
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
];
