// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google"; // optional

export const metadata = {
  title: "Lexa – AI History Tutor",
  description: "Your AI tutor for 13–16-year-olds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
