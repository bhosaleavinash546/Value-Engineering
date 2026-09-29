# Site checks

Browser tests for valueengineeringhub.com. They run automatically on every push
(`.github/workflows/tests.yml`) and you can run them yourself:

```sh
cd tests
npm install
npx playwright install chromium   # first time only
node run.js                       # everything (about 4 minutes)
node run.js academy narration     # just some groups
```

| Group | What it checks |
|---|---|
| `pages` | All 19 pages: accessibility (WCAG 2 AA) in dark and light mode, fits a 375px phone, no script errors |
| `links` | Crawls the site: no broken links or `#anchors` |
| `narration` | Lesson text matches the audio script word for word, timings are sound, seeking highlights the right paragraph |
| `guides` | Homepage and the ten guides: old links redirect, every tool works, nav, phone menu, skip link |
| `academy` | Catalogue and sign-in gate, labs, exam gate, a full exam pass and certificate, answer shuffling, feedback button, phone layout |

Nothing here talks to the real Supabase project. Signed-in tests switch Supabase
off inside the test browser only, and feedback requests are intercepted.

If `narration` fails after a text change, run the **Generate narration** workflow
for the modules it names.
