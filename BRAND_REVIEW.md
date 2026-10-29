# Pipe Rescue brand review

Reviewed the supplied **charity: water Brand Usage Guide, February 2020**, all 14 pages: [local PDF](Brand%20Usage%20Guide/cw_Brand-UsageGuide.pdf).

| Guidance | Pages | Website treatment |
|---|---|---|
| Jerry Can yellow with rich and soft supporting colors | 3 | Yellow `#FFC907`, navy `#003366`, blue `#77A8BB`, cream `#FFF7E1`, black `#1A1A1A`, gray `#CBCCD1`, peach `#FED8C1`, and rust `#BF6C46`. White is retained for cards and the full logo background. |
| Clear, inspirational language and spacious visuals | 4 | Clear game instructions, separated panels, encouraging failure text, and possibility-focused clean-water messages. |
| Hope and dignity rather than guilt | 5 | Removed the failure message that described a community waiting on the player. The home introduction describes solving a puzzle and exploring clean water's value, without implying gameplay creates real-world impact. |
| Preserve Jerry Can/logo color and proportions | 6 | Supplied horizontal PNG is unchanged, with proportional width/height, no filters, no rotation, and no cropping. Removed decorative substitute glyphs; the game header now uses an original pipe icon, visibly separate from the official logo. |
| Prefer a white or black logo background | 6, 9 | Horizontal logo sits on a plain white panel with 24px padding. |
| Keep the organization's name on a single line | 6 | The complete name remains within the logo image. Visible references in body/footer copy use a non-wrapping span. |
| Preserve photographic edits and respectful cropping | 7 | Not applicable: the site uses no photography. No photographs were added or modified. |
| Pair dirty-water imagery with clean-water imagery; never fabricate dirty water | 8 | Not applicable: no dirty-water imagery or photo edits are used. Game pipes are original interface graphics. |
| Avoid faces and busy backgrounds when placing logos/text | 9–10 | No overlaid photography. Text is on solid backgrounds; navy text is used on softer blue indicators for contrast. |
| Digital formats, RGB, and suitable resolution | 11 | Logo is a supplied PNG, 500×59 pixels, displayed at 200px wide with automatic height. Icons and pipe previews are scalable SVG. |
| Subbrand identities | 12 | Not applicable: no Spring, Well, or Pool logos or claims are used. |
| Partnership logo lockups | 13 | Not applicable: the game claims no partnership and uses no combined partner-logo lockup. The supplied charity: water logo remains separate from the game's title. |

Pages 1–2 introduce the document and its contents; page 14 is blank. The guide does not specify a required website typeface, so the existing readable Arial/Helvetica system font stack is retained. No external font or game dependency was added.

The existing fictional-points/rewards and independent-coursework notices remain visible. This review addresses the guide's applicable design rules; it does not assert official endorsement or partnership.

## Changes

- Replaced the previous cyan/slate palette with the guide's navy, soft blue, cream, black, gray, and yellow colors.
- Applied the same palette to connected pipes, preview tiles, markers, status cards, and confetti.
- Kept dark text on yellow actions and navy text on softer blue markers.
- Replaced ambiguous text-symbol icons with consistent SVG pipe, droplet, and grid icons.
- Preserved the original horizontal logo and increased its display width from 160px to 200px.
- Prevented the name from wrapping and revised failure/home text to be encouraging and accurate about fictional gameplay.

## Verification

Chromium confirmed the exact palette values, unchanged logo aspect ratio, plain white logo background, no logo filters/transforms, and non-wrapping name at 375px and 1440px. The full three-level browser regression suite passed with no console errors. Pipe outlines use navy so the guide’s softer gray stays legible on white.
