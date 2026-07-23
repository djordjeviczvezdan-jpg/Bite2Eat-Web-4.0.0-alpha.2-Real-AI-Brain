import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bite2Eat — Restaurant Ordering Platform",
    template: "%s | Bite2Eat"
  },
  description: "AI-powered ordering, checkout and restaurant operations.",
  applicationName: "Bite2Eat",
  openGraph: {
    type: "website",
    siteName: "Bite2Eat",
    title: "Bite2Eat — Restaurant Ordering Platform",
    description: "AI-powered ordering, checkout and restaurant operations."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
