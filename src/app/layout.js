import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Smartlook from 'smartlook-client'

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HomeProtein',
  description: 'HomeProtein is a Meal Subscription Brand which gets you Protein-packed Meals cooked by Moms from their kitchens to your doorstep.',
};


export default function RootLayout({ children }) {

  if (typeof window !== "undefined") {
    Smartlook.init('6069357b361092f4fa3bb98752ef46a02bdaa5a3');
  }

  return (
    <html lang="en">
      <head>
        {/* <Script strategy="afterInteractive">
          window.smartlook||(function(d) {`
            var o=smartlook=function(){ o.api.push(arguments)},h=d.getElementsByTagName('head')[0];
            var c=d.createElement('script');o.api=new Array();c.async=true;c.type='text/javascript';
            c.charset='utf-8';c.src='https://web-sdk.smartlook.com/recorder.js';h.appendChild(c);
            })(document);
            smartlook('init', '6069357b361092f4fa3bb98752ef46a02bdaa5a3', { region: 'eu' `});
        </Script> */}

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
