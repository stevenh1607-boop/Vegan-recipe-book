import { useState, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// Vision accuracy matters more than speed/cost here — messy handwriting,
// low-light photos, multi-column print layouts. Opus is the stronger reader.
const VISION_MODEL = "claude-opus-4-6";

const VALID_SEASONS = ["winter", "autumn", "spring", "summer"];

// Claude is asked for a slightly looser shape than recipes.json uses
// (ingredients: item/amount/unit, season: single string) — normalizeRecipe()
// below maps it onto the exact CLAUDE.md schema before it ever reaches state.
const SYSTEM_PROMPT = `You are a recipe parser. Extract recipe data and return ONLY valid JSON matching this schema, no markdown fences, no commentary:
{
  "name": "string",
  "description": "string",
  "season": "winter" | "autumn" | "spring" | "summer" | "all",
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "serves": number,
  "tags": [string],
  "ingredients": [{ "name": "string", "amount": number, "unit": "g|ml|tbsp|tsp|cup|cloves|whole" }],
  "method": [string],
  "tips": [string]
}
If a field is unknown, use a sensible default (0 for numbers, [] for arrays, "" for strings). Never omit a key.`;

// ─── Schema normalization ───────────────────────────────────────────────────
// Maps Claude's raw JSON output onto the exact recipe shape defined in
// CLAUDE.md, so RecipeScanner never hands App.jsx anything malformed.
function normalizeRecipe(raw, { imageUrl, source }) {
  const rawSeason = typeof raw.season === "string" ? raw.season.toLowerCase() : "";
  const season = VALID_SEASONS.includes(rawSeason) ? [rawSeason] : [];

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ing) => ({
        name: String(ing.name ?? ing.item ?? "").trim(),
        amount: typeof ing.amount === "number" ? ing.amount : Number(ing.amount) || 0,
        unit: String(ing.unit ?? "whole").trim(),
      }))
    : [];

  return {
    id: crypto.randomUUID(),
    name: String(raw.name ?? "Untitled recipe").trim(),
    description: String(raw.description ?? "").trim(),
    season,
    prepTime: typeof raw.prepTime === "number" ? raw.prepTime : Number(raw.prepTime) || 0,
    cookTime: typeof raw.cookTime === "number" ? raw.cookTime : Number(raw.cookTime) || 0,
    serves: typeof raw.serves === "number" ? raw.serves : Number(raw.serves) || 2,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    ingredients,
    method: Array.isArray(raw.method) ? raw.method.map(String) : [],
    tips: Array.isArray(raw.tips) ? raw.tips.map(String) : [],
    nutrition: null,
    image: imageUrl ?? null,
    rating: null,
    comments: "",
    dateAdded: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    dateCooked: null,
    source, // "scanner" | "url"
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm text-green-700 font-medium">{label}</p>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
      <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
      <p className="flex-1 text-sm text-red-700">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 text-lg leading-none font-bold shrink-0"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}

function RecipePreviewCard({ recipe }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-1">
          Parsed Recipe
        </p>
        <h2 className="text-xl font-bold text-gray-900 leading-snug">{recipe.name}</h2>
        {recipe.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recipe.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">🥦</span>
          <strong>{recipe.ingredients.length}</strong> ingredients
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">📋</span>
          <strong>{recipe.method.length}</strong> steps
        </span>
        {recipe.prepTime > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">⏱</span>
            Prep {recipe.prepTime}m
          </span>
        )}
        {recipe.cookTime > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">🍳</span>
            Cook {recipe.cookTime}m
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">🍽</span>
          Serves {recipe.serves}
        </span>
      </div>

      {recipe.season.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.season.map((s) => (
            <span
              key={s}
              className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecipeScanner({ onAddRecipe, onBack }) {
  // Input state
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef(null);

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Parse state
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [rawParseText, setRawParseText] = useState(null);

  // UI state
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | preview | parse-error
  const [error, setError] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function resetToIdle() {
    setStatus("idle");
    setUploadedImageUrl(null);
    setImagePreviewUrl(null);
    setParsedRecipe(null);
    setRawParseText(null);
    setError(null);
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleError(msg) {
    setError(msg);
    setStatus("idle");
  }

  // ── Step 2: Cloudinary Upload ─────────────────────────────────────────────

  async function uploadToCloudinary(file) {
    setStatus("uploading");
    setError(null);

    // Local preview while uploading
    setImagePreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setUploadedImageUrl(data.secure_url);
      return data.secure_url;
    } catch (err) {
      handleError(`Image upload failed: ${err.message}`);
      return null;
    }
  }

  // ── Step 3: Claude Parse ──────────────────────────────────────────────────

  async function parseWithClaude({ imageUrl, pageUrl }) {
    setStatus("parsing");
    setError(null);

    const source = imageUrl ? "scanner" : "url";

    const userContent = imageUrl
      ? [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: "Parse this recipe image and return the JSON as instructed.",
          },
        ]
      : [
          {
            type: "text",
            text: `Parse the recipe at this URL and return the JSON as instructed.\nURL: ${pageUrl}`,
          },
        ];

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error?.message || `API error (${res.status})`;
        throw new Error(msg.replace(ANTHROPIC_KEY, "[key]"));
      }

      const data = await res.json();
      const rawText = data.content?.[0]?.text ?? "";
      setRawParseText(rawText);

      try {
        // Strip any accidental markdown fences just in case
        const clean = rawText.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();
        const raw = JSON.parse(clean);
        const recipe = normalizeRecipe(raw, { imageUrl: imageUrl ?? null, source });
        setParsedRecipe(recipe);
        setStatus("preview");
      } catch {
        setStatus("parse-error");
      }
    } catch (err) {
      handleError(`Recipe parsing failed: ${err.message.replace(ANTHROPIC_KEY ?? "", "[key]")}`);
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const secureUrl = await uploadToCloudinary(file);
    if (secureUrl) {
      await parseWithClaude({ imageUrl: secureUrl });
    }
  }

  async function handleUrlFetch() {
    const url = urlInput.trim();
    if (!url) return;

    // Basic URL sanity check
    try {
      new URL(url);
    } catch {
      setError("Enter a valid URL (e.g. https://example.com/recipe)");
      return;
    }

    await parseWithClaude({ pageUrl: url });
  }

  function handleAddRecipe() {
    if (!parsedRecipe) return;
    onAddRecipe(parsedRecipe);
    onBack();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-800 p-1 rounded-lg transition-colors"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-900">Scan a Recipe</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Error banner ── */}
        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {/* ── Loading states ── */}
        {status === "uploading" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Uploading preview"
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}
            <Spinner label="Uploading image to Cloudinary…" />
          </div>
        )}

        {status === "parsing" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Uploaded"
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}
            <Spinner label="Claude is reading the recipe…" />
          </div>
        )}

        {/* ── Parse error: show raw text ── */}
        {status === "parse-error" && rawParseText && (
          <div className="space-y-4">
            <ErrorBanner
              message="Couldn't parse the response as JSON. Raw output is shown below."
              onDismiss={() => setError(null)}
            />
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-green-300 whitespace-pre-wrap break-words">
                {rawParseText}
              </pre>
            </div>
            <button
              onClick={resetToIdle}
              className="w-full py-3 rounded-xl border-2 border-green-600 text-green-700 font-semibold hover:bg-green-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Preview & confirm ── */}
        {status === "preview" && parsedRecipe && (
          <div className="space-y-4">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt={parsedRecipe.name}
                className="w-full h-52 object-cover rounded-2xl border border-gray-200"
              />
            )}
            <RecipePreviewCard recipe={parsedRecipe} />
            <div className="flex gap-3">
              <button
                onClick={resetToIdle}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleAddRecipe}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 active:scale-95 transition-all"
              >
                Add to My Recipes
              </button>
            </div>
          </div>
        )}

        {/* ── Input panel (hidden while loading or previewing) ── */}
        {(status === "idle") && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Photograph a recipe or paste a URL — Claude will extract the details.
            </p>

            {/* Two-option layout */}
            <div className="grid grid-cols-2 gap-3">

              {/* Option A: Camera — label wraps the input so iOS Safari allows the tap */}
              <label
                htmlFor="recipe-photo-input"
                className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-green-300 rounded-2xl p-6 text-center hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <span className="text-4xl">📷</span>
                <span className="text-sm font-semibold text-gray-700">Take a photo</span>
                <span className="text-xs text-gray-400">or pick from library</span>
                <input
                  id="recipe-photo-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Option B: URL — shown as a non-interactive placeholder tile */}
              <div className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center">
                <span className="text-4xl">🔗</span>
                <span className="text-sm font-semibold text-gray-700">Paste a URL</span>
                <span className="text-xs text-gray-400">recipe page link</span>
              </div>
            </div>

            {/* URL input row */}
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                placeholder="https://example.com/my-recipe"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400"
              />
              <button
                onClick={handleUrlFetch}
                disabled={!urlInput.trim()}
                className="px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Fetch
              </button>
            </div>

            {/* Divider hint */}
            <p className="text-xs text-center text-gray-400">
              Image is uploaded to Cloudinary · Parsing by Claude ({VISION_MODEL})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
