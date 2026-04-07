/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0a1122",
        glass: "rgba(18, 27, 47, 0.55)",
        neon: {
          cyan: "#23d3ff",
          mint: "#39ffb6",
          pink: "#ff4fd8"
        }
      },
      boxShadow: {
        neon: "0 0 30px rgba(35, 211, 255, 0.3)",
        card: "0 20px 45px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at 20% 20%, rgba(35, 211, 255, 0.3), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255, 79, 216, 0.25), transparent 30%), linear-gradient(140deg, #05080f 0%, #0a1122 45%, #101a32 100%)"
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.2s ease-in-out infinite"
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(35, 211, 255, 0.0)" },
          "50%": { boxShadow: "0 0 25px rgba(35, 211, 255, 0.4)" }
        }
      }
    }
  },
  plugins: []
};
