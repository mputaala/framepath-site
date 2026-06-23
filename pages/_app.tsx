import "../styles/globals.css";

import { MDXProvider } from "@mdx-js/react";
import type { AppProps } from "next/app";
import Head from "next/head";

import { mdxComponents } from "../src/components/mdx";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <MDXProvider components={mdxComponents}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icons/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/apple-touch-icon.png"
        />
      </Head>
      <Component {...pageProps} />
    </MDXProvider>
  );
};

export default App;
