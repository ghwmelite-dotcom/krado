# Krado — booking, payments & daily money for Ghana's artisans

> **Krado** (Twi): *ready, prepared.* "Me krado" — I'm ready.
> Tagline: **"Krado? Lock your slot."**

A WhatsApp-first, MoMo-native booking and daily-money system for Ghanaian
artisans — barbers, hairdressers, seamstresses, makeup artists. Built on the
Cloudflare stack by Hodges & Co. / OHWPStudios.

## Why "Krado"

- Means "ready" in Twi — exactly what both sides of the marketplace want:
  the client ready for their slot, the artisan ready for the day.
- Two syllables, easy to say in any Ghanaian language and internationally.
- Verb-able: "Krado me" / "Have you krado'd?" — brands that become verbs win.
- Pairs naturally with the deposit feature: the lock icon + "Krado? Lock
  your slot."

Backup names (in case of trademark/domain conflicts):
| Name | Meaning | Vibe |
|---|---|---|
| Wura | owner/boss (Twi) | What you call your barber anyway |
| SharpSharp | quickly (Pidgin) | Speed-first, very streetwise |
| YɛnKɔ | let's go (Twi) | Energetic, youth-leaning |

Suggested domains: `krado.app` (prod), `krado.ohwpstudios.org` (staging),
handle `@usekrado` / `@kradoapp`.

## Package contents

```
krado/
├── README.md              ← you are here
├── CLAUDE.md              ← Claude Code project instructions (start here in CC)
├── schema.sql             ← D1 starter schema (migration 0001)
└── docs/
    ├── PRD.md             ← v1 product requirements (CCPM-ready frontmatter)
    ├── ARCHITECTURE.md    ← Cloudflare stack, data flows, integrations
    └── DESIGN_SYSTEM.md   ← Krado design tokens, kente strip spec, voice
```

## How to start in Claude Code

```powershell
# 1. Create the project
mkdir C:\Projects\krado; cd C:\Projects\krado
# 2. Drop this package's files in, then:
claude
# 3. First prompt:
#    "Read CLAUDE.md and docs/PRD.md, then scaffold the monorepo per
#     docs/ARCHITECTURE.md. Start with the D1 schema and the Hono API."
```

With your CCPM workflow: `"turn docs/PRD.md into the krado-v1 epic"`,
then decompose and sync to GitHub as usual.

## v1 in one sentence

A barber in Madina onboards in under two minutes, gets a booking link
(`krado.app/kojo`), and from then on clients lock slots with a GHS 10 MoMo
deposit — no-shows die, the day's earnings and susu savings show on one
screen, and quiet WhatsApp nudges bring regulars back on their natural cycle.
