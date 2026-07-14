# Lal's Motor Winders (Fiji) PTE Limited

Landing page modeled exactly on [dala.craftedbygc.com](https://dala.craftedbygc.com) — black void, violet accent, constellation particles, monolithic typography.

## Preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Structure

Matches Dala's section rhythm:
1. Full-viewport hero with stacked display title + CTA
2. Right-aligned introduction
3. Center manifesto copy
4. Left-aligned services
5. Right-aligned telecom (Vodafone / Digicel)
6. About
7. Full-viewport final CTA
8. Contact

## Tech

- Three.js WebGL particle constellation (noise drift + mouse parallax)
- Inter as PPNeueMontreal substitute (weight 200 body / 400 display)
- Dala color tokens: `#000000`, `#8052ff`, `#ffb829`
