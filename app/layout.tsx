import { Inder, IBM_Plex_Sans, Encode_Sans } from "next/font/google";
import "./globals.css";

// Header Font (Swap Encode_Sans for your exact header font if needed)
const headingFont = Encode_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

// Body Text Font
const bodyFont = Inder({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-body",
});

// Buttons and Navigation Font
const buttonFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-button",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${buttonFont.variable}`}
    >
      <body className="font-body">{children}</body>
    </html>
  );
}