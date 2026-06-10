import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';  // This is correct, TypeScript just needs proper config
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Online Examination Portal',
  description: 'Secure online examination system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}