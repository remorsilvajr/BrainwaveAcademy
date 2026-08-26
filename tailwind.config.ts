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
                    navy: "#0B1354",        // Sidebar & dark section backgrounds
                    pink: "#E5007D",        // Primary CTAs, active sidebar pills, badges
                    pinkHover: "#C4006B",   // Button hover states
                    sky: "#DDF0FF",         // Light blue banner & alert backgrounds
                    skyText: "#0066CC",     // Text for sky blue banners
                    cardBg: "#F8FAFC",      // Base background color behind cards
                },
            },
            borderRadius: {
                card: "16px",
                btn: "10px",
            },
        },
    },

    plugins: [],
};

export default config;