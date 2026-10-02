import './globals.css';
import { ShieldCheck } from 'lucide-react';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';

export const metadata = {
  title: 'Coin A,M | Institutional Asset Security',
  description: 'Global institutional non-custodial asset security protocol.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="google-site-verification" content="vZEW1q5YcuccPg3pDH34xDYx09DGHlz3fbn4okapBTA" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <FirebaseClientProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
