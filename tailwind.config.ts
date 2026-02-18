import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        stamp: {
          paper: "#fffaf0",
          ink: "#2f2a24",
          accent: "#7a3e2b",
          muted: "#e7ddcf"
        }
      },
      boxShadow: {
        postcard: "0 6px 18px rgba(47, 42, 36, 0.12)"
      },
      borderRadius: {
        postcard: "16px"
      }
    }
  },
  plugins: []
};

export default config;
