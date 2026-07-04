# ValueForge

**Value Engineering · Product Cost Optimisation · Competitive Benchmarking**

A deep, interactive single-page reference covering the complete VAVE discipline:

- The **6-phase SAVE International job plan** (Information → Function Analysis → Creative → Evaluation → Development → Presentation)
- **36 cost-reduction levers** across six families: Design, Materials, Manufacturing, Sourcing, Packaging & Logistics, Complexity & Lifecycle
- **12 idea-generation techniques** — TRIZ, SCAMPER, FAST-driven ideation, Brainwriting 6-3-5, morphological analysis and more
- The **modern cost-engineering technology stack** — AI should-cost, cleansheets, CT-scan teardowns, generative design, LLM copilots
- **Teardown & benchmarking methodology** with an animated cost waterfall
- **8 industry playbooks**: Automotive & EV, Consumer Products, Heavy Machinery, Home Appliances, Aerospace & Defence, Electronics, Medical Devices, Industrial & Energy

Pure HTML/CSS/JS — no frameworks, no build step, no dependencies. Deployed via GitHub Pages.

*Designed & Developed by Avinash Bhosale*

## Activating integrations (5 minutes each)

All integrations live in **`site-config.js`** — fill a value, commit, and the feature switches on:

| Feature | Service (free tier) | What to paste |
|---|---|---|
| Newsletter capture | [buttondown.com](https://buttondown.com) | your username → `buttondownUser` |
| Contact form inbox | [formspree.io](https://formspree.io) | form ID → `formspreeId` |
| "Book a call" button | [calendly.com](https://calendly.com) | event link → `calendlyUrl` |
| Visitor analytics | [goatcounter.com](https://www.goatcounter.com) | site code → `goatcounterCode` |

Until configured, the newsletter and contact form gracefully fall back to opening
a pre-filled email draft, and the booking button stays hidden.
