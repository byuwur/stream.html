/**
 * File: popup/config/popup.settings.js
 * @file Ordered social handles and default popup timing, colors, and typography.
 * Deps: Loaded before popup.js.
 */
// In order:	1. Twitch, 2. YT,     3. IG,     4. FB,     5. Twitter
/**
 * Display handles in Twitch, YouTube, Instagram, Facebook, and Twitter/X order.
 * @type {Array<string>}
 */
const values = ["/byUwUr", "@byUwUr", "@byUwUr", "@byUwUr", "@byUwUr"];
/**
 * Resource defaults applied before validated URL overrides.
 * @type {Object}
 */
const settings = {
  options: {
    pauseTime: "5",
    inbetweenPauseTime: "5",
    socialsDisplayed: "3"
  },
  colors: {
    iconBoxColor: "rgba(64, 0, 0, 1)",
    textBoxColor: "rgba(255, 255, 255, 1)",
    iconColor: "rgba(255, 255, 255, 1)",
    fontColor: "rgba(64, 0, 0, 1)"
  },
  fonts: {
    primaryFont: "Courier New",
    fontWeight: "700",
    fontSize: "64",
    textYOffset: "0"
  }
};
