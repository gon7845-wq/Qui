import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

// Mêmes polices que le jeu (client/index.html). Chargées depuis Google Fonts au rendu.
const fredoka = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });
const jakarta = loadJakarta("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] });

export const DISPLAY = `${fredoka.fontFamily}, "Plus Jakarta Sans", sans-serif`;
export const BODY = `${jakarta.fontFamily}, system-ui, sans-serif`;

export const fontsReady = Promise.all([fredoka.waitUntilDone(), jakarta.waitUntilDone()]);
