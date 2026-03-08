import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "var(--color-primary)",
                secondary: "var(--color-secondary)",
                "accent-1": "var(--color-accent-1)",
                "accent-2": "var(--color-accent-2)",
                success: "var(--color-success)",
                neutral: "var(--color-neutral)",
                bg: {
                    primary: "var(--bg-primary)",
                    card: "var(--bg-card)",
                    alt: "var(--bg-card-alt)",
                },
                border: "var(--border)",
                text: {
                    primary: "var(--text-primary)",
                    muted: "var(--text-muted)",
                },
                data: "var(--color-data)",
                glow: "var(--glow)"
            },
            borderRadius: {
                card: "var(--radius-card)",
                pill: "var(--radius-pill)"
            },
            boxShadow: {
                card: "var(--shadow-card)",
                "card-hover": "var(--shadow-card-hover)"
            },
            backdropBlur: {
                card: "var(--card-backdrop)"
            }
        },
    },
    plugins: [],
};
export default config;
