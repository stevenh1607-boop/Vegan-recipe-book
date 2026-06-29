# Vegan Recipe Book — Claude Instructions

## Project overview
Personal vegan recipe manager. iPad-first, mobile-friendly. Built with React + Vite + Tailwind CSS v4. TypeScript used in the services layer only; components are `.jsx`.

## Stack
- **Framework:** React 18 + Vite 8
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin — use utility classes, no custom CSS files
- **Language:** JSX for components, TypeScript for `src/services/`
- **Data:** `src/data/recipes.json` is the local store (no backend yet)
- **APIs:** USDA FoodData Central (nutrition), Cloudinary (image upload), Anthropic Claude (recipe parsing)

## Project structure
```
src/
  App.jsx                  # View router: home | detail | scanner
  data/
    recipes.json           # Local recipe store — source of truth
  components/
    RecipeGrid.jsx         # Home page: search + season filter + card grid
    RecipeCard.jsx         # Card tile with image, tags, rating, season emoji
    RecipeDetail.jsx       # Full recipe page: checklist, macros, rating, notes
    RecipeScanner.jsx      # Add recipe: camera / URL / manual
  hooks/
    useNutrition.js        # USDA macro calculator
  services/
    mealdb.ts              # TheMealDB API (typed)
```

## Recipe shape
Every recipe in `recipes.json` must match this interface exactly:
```json
{
  "id": "string (unique)",
  "name": "string",
  "description": "string",
  "season": ["winter"|"autumn"|"spring"|"summer"],
  "prepTime": 15,
  "cookTime": 30,
  "serves": 2,
  "tags": ["string"],
  "ingredients": [{ "name": "string", "amount": 1, "unit": "g|ml|tbsp|tsp|cup|cloves|whole" }],
  "method": ["step string"],
  "tips": ["tip string"],
  "nutrition": null,
  "image": null,
  "rating": null,
  "comments": "",
  "dateAdded": "YYYY-MM-DD",
  "dateCooked": null,
  "source": "claude-suggestion|manual|scanner|url"
}
```

## Environment variables (all in `.env`, gitignored)
```
VITE_USDA_API_KEY=
VITE_CLOUDINARY_CLOUD_NAME=duauwvje8
VITE_CLOUDINARY_API_KEY=
VITE_CLOUDINARY_UPLOAD_PRESET=recipe_uploads
VITE_ANTHROPIC_API_KEY=
```
Access via `import.meta.env.VITE_*`. Never commit `.env`.

## Key conventions
- **No TypeScript in components** — keep `.jsx`, use JSDoc if types are needed
- **Tailwind only** — no inline styles, no CSS modules, no styled-components
- **State lives in App.jsx** — components receive data and callbacks as props
- **Nutrition is lazy** — calculated on first `RecipeDetail` view via USDA, then cached back into recipe state via `onUpdateRecipe`
- **No router library** — view state is `useState` in App.jsx: `'home' | 'detail' | 'scanner'`
- **IDs** — use `crypto.randomUUID()` for new recipe IDs

## Cloudinary upload (unsigned)
```js
const fd = new FormData()
fd.append('file', file)
fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
const { secure_url } = await res.json()
```

## Claude API (called directly from browser — dev only)
```js
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: '...' }],
  }),
})
```
**Note:** Direct browser API calls are fine for local dev but must move to a server function before deploying publicly.

## What's built ✅
- Recipe grid with search + season filter
- Recipe card with image, tags, season emoji, rating
- Recipe detail with tap-to-check ingredients/steps, USDA nutrition, star rating, editable notes
- USDA nutrition hook (parallel lookups, cached on first view)

## What's next 🔲
- RecipeScanner: camera capture → Cloudinary → Claude vision parse
- localStorage persistence (recipes survive refresh)
- GitHub Pages deploy (`base: '/vegan-recipe-book/'` already set in vite.config.js)
- Serve-size scaling on RecipeDetail
- Share/export recipe as image or PDF
