import "../styles/globals.css";
// ALTCHA widget styles (US-213) — global CSS must be imported here per
// Next.js rules; the widget itself is dynamically imported by SupportForm.
import "altcha/altcha.css";

import { MDXProvider } from "@mdx-js/react";
import type { AppProps } from "next/app";
import Head from "next/head";

import { Analytics } from "../src/components/Analytics";
import { mdxComponents } from "../src/components/mdx";
import { Header } from "../src/sections/Header";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <MDXProvider components={mdxComponents}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icons/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icons/favicon-32x32.png"
          type="image/png"
          sizes="32x32"
        />
        <link
          rel="icon"
          href="/icons/favicon-16x16.png"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      {/* Stationary global navigation (framepath-support#3). Rendered here so
          every route shares one sticky toolbar above its own <main>/<Footer>. */}
      <Header />
      <Component {...pageProps} />
      {/* Cloudflare Web Analytics (US-162). Cookieless, no fingerprint,
          no consent banner. Renders nothing while the beacon token in
          src/config/analytics.ts is still the placeholder. */}
      <Analytics />
    </MDXProvider>
  );
};

export default App;
