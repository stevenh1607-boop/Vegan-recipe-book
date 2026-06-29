const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const CLAUDE_HEADERS = {
  'x-api-key': ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
  'content-type': 'application/json',
}

const RECIPE_PARSE_PROMPT = `Extract the recipe and return ONLY a JSON object with these exact fields:
{
  "name": string,
  "description": string (1-2 sentences),
  "season": array of zero or more of ["spring","summer","autumn","winter"],
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "serves": number,
  "tags": string[],
  "ingredients": [{ "name": string, "amount": number, "unit": string }],
  "method": string[],
  "tips": string[],
  "source": string (URL or "scanned image" or "manual")
}
Do not include id, nutrition, image, rating, comments, dateAdded, or dateCooked.
If you cannot confidently extract a field use a sensible default (empty array, 0, etc.).
Return raw JSON only — no markdown fences, no explanation.`

export async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: fd }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Cloudinary upload failed')
  return data.secure_url
}

export async function parseRecipeFromImage(imageUrl) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: CLAUDE_HEADERS,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: RECIPE_PARSE_PROMPT },
        ],
      }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude API error')
  return JSON.parse(data.content[0].text)
}

export async function parseRecipeFromUrl(url) {
  let pageText = ''
  try {
    const proxyRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
    const html = await proxyRes.text()
    pageText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)
  } catch {
    // fall through — let Claude infer from the URL alone
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: CLAUDE_HEADERS,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `${RECIPE_PARSE_PROMPT}\n\nRecipe source URL: ${url}\n\nPage content:\n${pageText}`,
      }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude API error')
  return JSON.parse(data.content[0].text)
}

export function buildRecipe(parsed, imageUrl = null, source = 'scanned') {
  return {
    ...parsed,
    id: crypto.randomUUID(),
    image: imageUrl ?? null,
    nutrition: null,
    rating: null,
    comments: '',
    dateAdded: new Date().toISOString().split('T')[0],
    dateCooked: null,
    source: parsed.source || source,
  }
}
