import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0b6b3a",
          dark: "#075029",
          light: "#13864a",
        },
        gold: "#f4c430",
      },
    },
  },
  plugins: [],
};

export default config;
