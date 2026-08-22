import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./config/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: "#006BAD",      // Dark blue button & headers
                    secondary: "#D0ECFE",    // Light blue background tint
                    cardBg: "rgba(217, 217, 217, 0.2)", // Translucent card background
                },
            },
            fontFamily: {
                heading: ["var(--font-heading)", "sans-serif"],
                body: ["var(--font-body)", "sans-serif"],
                button: ["var(--font-button)", "sans-serif"],
            },
            borderRadius: {
                card: "50px",   // Exact 50px radius from Figma
                btn: "12px",    // Exact 12px radius from Figma
            },
        },
    },
    plugins: [],
};

export default config;