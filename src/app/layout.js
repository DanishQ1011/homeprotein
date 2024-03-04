import { Inter } from 'next/font/google';
import Script from 'next/script';
import Hotjar from '@hotjar/browser';
import './globals.css';
import React, { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HomeProtein',
  description: 'HomeProtein is a Meal Subscription Brand which gets you Protein-packed Meals cooked by Moms from their kitchens to your doorstep.',
};

export default function RootLayout({ children }) {
  const siteId = 3890019;
  const hotjarVersion = 6;
  Hotjar.init(siteId, hotjarVersion);

  return (
    <html lang="en">
      <head>
      {/* <script>
          (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:3890019,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      </script> */}

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
