import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antigravity Postman - SDE Workspace',
  description: 'A professional-grade API Client Platform (Postman Clone) designed with React, Next.js, FastAPI, and SQLite.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
