import './globals.css';
import '../../dist/styles.css';

import type { Metadata } from 'next';

import { ThemeBuilder } from './theme-builder';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className='h-full'
    >
      <body className='flex min-h-full flex-col'>
        <ThemeBuilder>{children}</ThemeBuilder>
      </body>
    </html>
  );
}
