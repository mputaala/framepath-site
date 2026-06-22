import Head from "next/head";

// US-154 Prompt 2 placeholder. Prompt 3 lands the hand-authored Hero,
// three Feature sections, and Footer with App Store + TestFlight links.
const Home = () => {
  return (
    <>
      <Head>
        <title>FramePath</title>
        <meta
          name="description"
          content="FramePath is coming — a planning app for filmmakers."
        />
        <meta name="robots" content="noindex" />
      </Head>
      <main className="flex min-h-screen items-center justify-center p-8">
        <h1 className="text-3xl font-semibold sm:text-4xl md:text-5xl">
          FramePath is coming.
        </h1>
      </main>
    </>
  );
};

export default Home;
