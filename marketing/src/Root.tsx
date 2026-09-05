import { Composition } from "remotion";
import { Manche, MANCHE_FPS, MANCHE_FRAMES } from "./compositions/Manche";
import { Rafale, RAFALE_FPS, rafaleFrames } from "./compositions/Rafale";
import { Bulletin, BULLETIN_FPS, BULLETIN_FRAMES } from "./compositions/Bulletin";
import { buildBulletin, buildManche, buildRafale } from "./lib/scenario";

export const DEFAULT_HOST = "qui-production-8582.up.railway.app";
const SIZE = { width: 1080, height: 1920 };

// Les compositions portent le nom du template (scripts/plan.mjs → --template).
export const Root = () => (
  <>
    <Composition
      id="manche"
      component={Manche}
      durationInFrames={MANCHE_FRAMES}
      fps={MANCHE_FPS}
      {...SIZE}
      defaultProps={{ scenario: buildManche("studio", { tone: "spicy" }), host: DEFAULT_HOST, music: null }}
    />
    <Composition
      id="rafale"
      component={Rafale}
      durationInFrames={rafaleFrames(5)}
      fps={RAFALE_FPS}
      {...SIZE}
      defaultProps={{ scenario: buildRafale("studio"), host: DEFAULT_HOST, music: null }}
      calculateMetadata={({ props }) => ({ durationInFrames: rafaleFrames(props.scenario.questions.length) })}
    />
    <Composition
      id="bulletin"
      component={Bulletin}
      durationInFrames={BULLETIN_FRAMES}
      fps={BULLETIN_FPS}
      {...SIZE}
      defaultProps={{ scenario: buildBulletin("studio"), host: DEFAULT_HOST, music: null }}
    />
  </>
);
