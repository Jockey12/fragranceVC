import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14211d",
        milk: "#f7f1e8",
        oyster: "#d8e3df",
        glass: "rgba(255, 255, 255, 0.34)",
        sage: "#91a98d",
        citron: "#d9c87d",
        ember: "#b46445",
      },
      fontFamily: {
        display: ['"Avenir Next"', '"SF Pro Display"', '"Helvetica Neue"', "sans-serif"],
        body: ['"Avenir Next"', '"SF Pro Text"', '"Helvetica Neue"', "sans-serif"],
      },
      boxShadow: {
        glass: "0 32px 90px rgba(20, 33, 29, 0.18)",
        glow: "0 18px 70px rgba(217, 200, 125, 0.34)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(1deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
