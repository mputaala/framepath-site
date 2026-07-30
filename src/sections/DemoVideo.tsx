import { Container } from "../components/Container";

export const DemoVideo = () => {
  return (
    <section
      aria-labelledby="demo-heading"
      className="border-b border-graphite-800 py-24 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="demo-heading"
            className="text-3xl font-semibold tracking-extra-tight text-graphite-50 sm:text-4xl"
          >
            See it in action.
          </h2>
          <p className="mt-4 text-pretty text-lg text-graphite-300">
            From screenplay to shoot-day plan in a single workflow.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <video
            controls
            playsInline
            preload="none"
            poster="/videos/demo-poster.jpg"
            className="w-full rounded-2xl border border-graphite-800 shadow-2xl shadow-black/50"
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </Container>
    </section>
  );
};
