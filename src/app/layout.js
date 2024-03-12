import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HomeProtein',
  description: 'HomeProtein is a Meal Subscription Brand which gets you Protein-packed Meals cooked by Moms from their kitchens to your doorstep.',
};


export default function RootLayout({ children }) {

  return (
    <html lang="en">
      <head>


        <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-SXXTS7KV2L" />
        <Script strategy="afterInteractive" id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SXXTS7KV2L');
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
