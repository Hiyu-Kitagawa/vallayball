import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        court: {
          line: "#f7d774",
          floor: "#e9b96f",
          green: "#0f766e",
          navy: "#123142",
          sky: "#d8f3f0",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(18, 49, 66, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
