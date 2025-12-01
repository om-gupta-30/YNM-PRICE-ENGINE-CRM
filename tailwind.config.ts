import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#74060d",
          gold: "#d1a85a",
          "dark-gold": "#b8944a",
          cream: "#f8eee7",
          accent: "#8b0a12",
          "light-red": "#9a0e16",
        },
        // Legacy support - map to brand colors
        primary: "#74060d",
        secondary: "#d1a85a",
        background: "#f8eee7",
        text: "#1A1A1A",
        "deep-gold": "#b8944a",
        "premium-gold": "#d1a85a",
        "dark-gold": "#b8944a",
        burgundy: "#74060d",
        "deep-burgundy": "#74060d",
        navy: "#74060d",
        "deep-navy": "#74060d",
        charcoal: "#1A1A1A",
        cream: "#f8eee7",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-in-out",
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
        "float": "float 20s infinite ease-in-out",
        "shimmer": "shimmer 3s infinite",
        "float-around": "floatAround 25s infinite ease-in-out",
        "expand-sides": "expandSides 8s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.1" },
          "25%": { transform: "translate(30px, -30px) scale(1.1)", opacity: "0.25" },
          "50%": { transform: "translate(-20px, 20px) scale(0.9)", opacity: "0.15" },
          "75%": { transform: "translate(20px, 30px) scale(1.05)", opacity: "0.2" },
        },
        shimmer: {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        floatAround: {
          "0%, 100%": { 
            transform: "translate(0, 0) scale(1) rotate(0deg)",
          },
          "10%": { 
            transform: "translate(15vw, 10vh) scale(1.1) rotate(5deg)",
          },
          "20%": { 
            transform: "translate(25vw, 5vh) scale(0.9) rotate(-5deg)",
          },
          "30%": { 
            transform: "translate(35vw, 20vh) scale(1.15) rotate(8deg)",
          },
          "40%": { 
            transform: "translate(50vw, 15vh) scale(0.85) rotate(-8deg)",
          },
          "50%": { 
            transform: "translate(65vw, 30vh) scale(1.2) rotate(10deg)",
          },
          "60%": { 
            transform: "translate(75vw, 25vh) scale(0.9) rotate(-10deg)",
          },
          "70%": { 
            transform: "translate(85vw, 40vh) scale(1.1) rotate(7deg)",
          },
          "80%": { 
            transform: "translate(70vw, 50vh) scale(0.95) rotate(-7deg)",
          },
          "90%": { 
            transform: "translate(40vw, 60vh) scale(1.05) rotate(3deg)",
          },
        },
        expandSides: {
          "0%, 100%": { 
            transform: "scaleX(1) scaleY(1)",
          },
          "25%": { 
            transform: "scaleX(1.3) scaleY(0.9)",
          },
          "50%": { 
            transform: "scaleX(0.9) scaleY(1.3)",
          },
          "75%": { 
            transform: "scaleX(1.2) scaleY(0.95)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;

