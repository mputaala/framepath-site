import { Container } from "../components/Container";
import { Screenshot } from "../components/mdx/Screenshot";

type Feature = {
  stage: "Write" | "Plan" | "Shoot";
  title: string;
  description: string;
  /** Logical id from config/screenshot-allowlist.json. */
  screenshotId: string;
};

const FEATURES: Feature[] = [
  {
    stage: "Write",
    title: "Write or import your screenplay.",
    description:
      "Each scene becomes a card you can break down element by element — action, dialogue, transitions, and the characters who appear.",
    screenshotId: "write-mac",
  },
  {
    stage: "Plan",
    title: "Build a shot list and storyboard alongside the script.",
    description:
      "Sketch frames, add shot details, and track characters, locations, and props in one view — without leaving the scene you're planning.",
    screenshotId: "plan-mac",
  },
  {
    stage: "Shoot",
    title: "Run the shoot from your iPad.",
    description:
      "Mark shots complete in shoot mode, slate with the built-in clapperboard, and keep the day moving without juggling spreadsheets.",
    screenshotId: "shoot-ipad",
  },
];

export const Features = () => {
  return (
    <section
      aria-labelledby="features-heading"
      className="border-b border-graphite-800 py-24 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="features-heading"
            className="text-3xl font-semibold tracking-extra-tight text-graphite-50 sm:text-4xl"
          >
            From the page to the call sheet.
          </h2>
          <p className="mt-4 text-pretty text-lg text-graphite-300">
            FramePath covers the three stages of an indie shoot in one app.
          </p>
        </div>

        <ul className="mt-16 grid gap-12 sm:gap-16 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.stage} className="flex flex-col">
              <Screenshot
                id={feature.screenshotId}
                className="w-full rounded-xl border border-graphite-800"
              />
              <div className="mt-6 flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ember-400">
                  {feature.stage}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-graphite-50">
                  {feature.title}
                </h3>
                <p className="mt-3 text-pretty text-base text-graphite-300">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
