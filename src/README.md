# VAVEhub page sources

The homepage and the ten playbook pages (`/job-plan/`, `/cost-levers/`, …) are **generated**.
Edit the files here, then rebuild:

```
python3 tools/build.py
```

| Folder | What lives there |
|---|---|
| `partials/` | Shared page head, top navigation and footer — edit once, every page updates |
| `home/` | Homepage pieces: hero, intro, FAQ, diagnosis, contact |
| `pages/` | One file per playbook topic — the content of that page |
| `academy/` | The VE Academy (`training.html`): `_head.html`, one file per module (`m1.html` … `m13.html`) and `_tail.html` (final exam, certificate and scripts) |

Page titles, descriptions, "In 30 seconds" summaries, "Try it / Learn it" links and the
previous/next order are set in the `PAGES` list at the top of `tools/build.py`.

Links written as `#section-id` are rewritten automatically to the right page, and the sitemap is
regenerated on every build. Don't hand-edit the generated `index.html` or `*/index.html` files —
the next build overwrites them. The same goes for `training.html`, which is assembled from
`academy/`. The certificate, verify and legal pages are not generated and are edited directly.

**Narration:** the Academy voiceover is generated from the built `training.html`. After changing
the text of a module (paragraphs, headings, list items), run the "Generate narration audio"
workflow for that module (for example `m4`) so the audio matches the page again.
