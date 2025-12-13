import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pokémon GO PvP Team Generator',
  description:
    'Generate optimized teams for Play! Pokémon and GO Battle League tournaments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {children}
      </body>
    </html>
  );
}
