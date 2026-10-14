import Link from "next/link";
import {
  HERO_SCRIM,
  HERO_TEXT,
  SIGNAL_FALLBACK_GRADIENT,
} from "@/lib/shader/signal-field-palette";
import { SignalFieldCanvas } from "./signal-field-canvas";

const rgb = ([r, g, b]: readonly number[]) => `rgb(${r} ${g} ${b})`;

// The hero is always dark, so focus rings use white instead of the theme accent.
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      data-signal-field-host
      className="relative isolate flex min-h-[calc(100svh-var(--header-height))] w-full items-center overflow-hidden"
      style={{ backgroundImage: SIGNAL_FALLBACK_GRADIENT, backgroundColor: rgb(HERO_SCRIM.color) }}
    >
      <SignalFieldCanvas />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: `rgb(${HERO_SCRIM.color.join(" ")} / ${HERO_SCRIM.alpha})`,
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: rgb(HERO_TEXT.body) }}
          >
            Research, organized
          </p>
          <h1
            id="home-hero-title"
            className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-6xl"
            style={{ color: rgb(HERO_TEXT.heading) }}
          >
            AI Research Workspace
          </h1>
          <p
            className="mt-4 max-w-xl text-base leading-relaxed text-pretty sm:text-lg"
            style={{ color: rgb(HERO_TEXT.body) }}
          >
            Gather sources, ask an AI research assistant, and see how your ideas connect, all
            in one calm workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/assistant"
              // Explicit native tab stops also work with Windows WebKit's
              // restricted implicit-link keyboard navigation preference.
              tabIndex={0}
              className={`inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-indigo-950 transition-opacity hover:opacity-90 ${FOCUS_RING}`}
            >
              Open Assistant
            </Link>
            <Link
              href="/visualize"
              tabIndex={0}
              className={`inline-flex h-11 items-center rounded-lg border border-white/50 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${FOCUS_RING}`}
            >
              Explore Research
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
