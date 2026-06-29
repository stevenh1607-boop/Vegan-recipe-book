import { useState, useRef } from 'react'
import {
  uploadToCloudinary,
  parseRecipeFromImage,
  parseRecipeFromUrl,
  buildRecipe,
} from '../services/recipeParser'

const MODES = ['camera', 'url', 'manual']
const MODE_LABELS = { camera: '📷 Camera / Upload', url: '🔗 URL', manual: '✏️ Manual' }
const SEASONS = ['spring', 'summer', 'autumn', 'winter']
const UNITS = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'cloves', 'whole', 'slice', 'kg', 'l']

const emptyRecipe = () => ({
  name: '', description: '', season: [], prepTime: 0, cookTime: 0, serves: 2,
  tags: '', ingredients: [{ name: '', amount: '', unit: 'g' }],
  method: [''], tips: [''],
})

export default function RecipeScanner({ onAddRecipe, onCancel }) {
  const [mode, setMode] = useState('camera')
  const [stage, setStage] = useState('idle') // idle | uploading | parsing | review | error
  const [parsedRecipe, setParsedRecipe] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState(null)
  const [manual, setManual] = useState(emptyRecipe())
  const fileInputRef = useRef()

  // ── Camera / file upload ────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setError(null)
    try {
      setStage('uploading')
      const url = await uploadToCloudinary(file)
      setImageUrl(url)
      setStage('parsing')
      const parsed = await parseRecipeFromImage(url)
      setParsedRecipe(buildRecipe(parsed, url, 'scanned image'))
      setStage('review')
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }

  // ── URL import ──────────────────────────────────────────

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return
    setError(null)
    try {
      setStage('parsing')
      const parsed = await parseRecipeFromUrl(urlInput.trim())
      setParsedRecipe(buildRecipe(parsed, null, urlInput.trim()))
      setStage('review')
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }

  // ── Manual submit ───────────────────────────────────────

  const handleManualSubmit = () => {
    const recipe = buildRecipe({
      ...manual,
      tags: manual.tags.split(',').map(t => t.trim()).filter(Boolean),
      ingredients: manual.ingredients.filter(i => i.name.trim()),
      method: manual.method.filter(s => s.trim()),
      tips: manual.tips.filter(t => t.trim()),
      prepTime: Number(manual.prepTime) || 0,
      cookTime: Number(manual.cookTime) || 0,
      serves: Number(manual.serves) || 2,
    }, null, 'manual')
    setParsedRecipe(recipe)
    setStage('review')
  }

  // ── Review: inline edit helpers ─────────────────────────

  const updateReview = (field, value) =>
    setParsedRecipe(r => ({ ...r, [field]: value }))

  const updateIngredient = (i, field, value) =>
    setParsedRecipe(r => {
      const ings = [...r.ingredients]
      ings[i] = { ...ings[i], [field]: value }
      return { ...r, ingredients: ings }
    })

  const addIngredient = () =>
    setParsedRecipe(r => ({ ...r, ingredients: [...r.ingredients, { name: '', amount: '', unit: 'g' }] }))

  const removeIngredient = (i) =>
    setParsedRecipe(r => ({ ...r, ingredients: r.ingredients.filter((_, idx) => idx !== i) }))

  const updateStep = (arr, i, value) =>
    setParsedRecipe(r => { const a = [...r[arr]]; a[i] = value; return { ...r, [arr]: a } })

  const addStep = (arr) =>
    setParsedRecipe(r => ({ ...r, [arr]: [...r[arr], ''] }))

  const removeStep = (arr, i) =>
    setParsedRecipe(r => ({ ...r, [arr]: r[arr].filter((_, idx) => idx !== i) }))

  const reset = () => {
    setStage('idle'); setParsedRecipe(null); setImagePreview(null)
    setImageUrl(null); setUrlInput(''); setError(null); setManual(emptyRecipe())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────

  if (stage === 'review' && parsedRecipe) {
    return <ReviewPanel
      recipe={parsedRecipe}
      imagePreview={imagePreview}
      updateReview={updateReview}
      updateIngredient={updateIngredient}
      addIngredient={addIngredient}
      removeIngredient={removeIngredient}
      updateStep={updateStep}
      addStep={addStep}
      removeStep={removeStep}
      onConfirm={() => onAddRecipe(parsedRecipe)}
      onReset={reset}
    />
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <h2 className="text-xl font-bold text-stone-800 mb-6">Add a Recipe</h2>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {MODES.map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); reset() }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === m ? 'bg-green-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-green-50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Status banners */}
      {stage === 'uploading' && <StatusBanner text="Uploading image..." />}
      {stage === 'parsing' && <StatusBanner text="Parsing recipe with AI..." />}
      {stage === 'error' && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
          <p className="text-red-700 text-sm font-medium mb-2">Something went wrong</p>
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button onClick={reset} className="text-sm text-red-600 underline">Try again</button>
        </div>
      )}

      {/* Camera / Upload mode */}
      {mode === 'camera' && stage === 'idle' && (
        <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm text-center">
          {imagePreview ? (
            <img src={imagePreview} className="w-full h-64 object-cover rounded-xl mb-4" alt="preview" />
          ) : (
            <div className="h-48 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex flex-col items-center justify-center mb-4 border-2 border-dashed border-green-200">
              <span className="text-4xl mb-2">📷</span>
              <p className="text-stone-400 text-sm">Take a photo or upload a recipe image</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors w-full"
          >
            Choose Photo
          </button>
        </div>
      )}

      {/* URL mode */}
      {mode === 'url' && stage === 'idle' && (
        <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-stone-700 mb-2">Recipe URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
          />
          <button
            onClick={handleUrlImport}
            disabled={!urlInput.trim()}
            className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors w-full disabled:opacity-50"
          >
            Import Recipe
          </button>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && stage === 'idle' && (
        <ManualForm manual={manual} setManual={setManual} onSubmit={handleManualSubmit} />
      )}

      <button onClick={onCancel} className="mt-6 text-stone-400 text-sm hover:text-stone-600 w-full text-center">
        Cancel
      </button>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function StatusBanner({ text }) {
  return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4 mb-6">
      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
      <span className="text-green-700 text-sm font-medium">{text}</span>
    </div>
  )
}

function ManualForm({ manual, setManual, onSubmit }) {
  const set = (field, value) => setManual(m => ({ ...m, [field]: value }))
  const toggleSeason = (s) => setManual(m => ({
    ...m,
    season: m.season.includes(s) ? m.season.filter(x => x !== s) : [...m.season, s],
  }))

  return (
    <div className="space-y-4">
      <FormCard title="Basic Info">
        <Field label="Name"><input value={manual.name} onChange={e => set('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Description"><textarea value={manual.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prep (min)"><input type="number" min="0" value={manual.prepTime} onChange={e => set('prepTime', e.target.value)} className={inputCls} /></Field>
          <Field label="Cook (min)"><input type="number" min="0" value={manual.cookTime} onChange={e => set('cookTime', e.target.value)} className={inputCls} /></Field>
          <Field label="Serves"><input type="number" min="1" value={manual.serves} onChange={e => set('serves', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Tags (comma-separated)"><input value={manual.tags} onChange={e => set('tags', e.target.value)} placeholder="curry, one-pot, chickpeas" className={inputCls} /></Field>
        <Field label="Season">
          <div className="flex gap-2 flex-wrap">
            {SEASONS.map(s => (
              <button key={s} type="button" onClick={() => toggleSeason(s)}
                className={`px-3 py-1.5 rounded-xl text-sm capitalize transition-colors ${manual.season.includes(s) ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-green-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>
      </FormCard>

      <FormCard title="🛒 Ingredients">
        {manual.ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={ing.amount} onChange={e => { const a = [...manual.ingredients]; a[i] = { ...a[i], amount: e.target.value }; set('ingredients', a) }} placeholder="Amt" className={`${inputCls} w-16`} />
            <select value={ing.unit} onChange={e => { const a = [...manual.ingredients]; a[i] = { ...a[i], unit: e.target.value }; set('ingredients', a) }} className={`${inputCls} w-20`}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <input value={ing.name} onChange={e => { const a = [...manual.ingredients]; a[i] = { ...a[i], name: e.target.value }; set('ingredients', a) }} placeholder="Ingredient" className={`${inputCls} flex-1`} />
            <button type="button" onClick={() => set('ingredients', manual.ingredients.filter((_, idx) => idx !== i))} className="text-stone-300 hover:text-red-400 text-lg">×</button>
          </div>
        ))}
        <button type="button" onClick={() => set('ingredients', [...manual.ingredients, { name: '', amount: '', unit: 'g' }])} className="text-green-700 text-sm hover:underline">+ Add ingredient</button>
      </FormCard>

      <FormCard title="👨‍🍳 Method">
        {manual.method.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center shrink-0 mt-2 font-bold">{i + 1}</span>
            <textarea value={step} onChange={e => { const a = [...manual.method]; a[i] = e.target.value; set('method', a) }} rows={2} className={`${inputCls} flex-1`} />
            <button type="button" onClick={() => set('method', manual.method.filter((_, idx) => idx !== i))} className="text-stone-300 hover:text-red-400 text-lg mt-1">×</button>
          </div>
        ))}
        <button type="button" onClick={() => set('method', [...manual.method, ''])} className="text-green-700 text-sm hover:underline">+ Add step</button>
      </FormCard>

      <FormCard title="💡 Tips (optional)">
        {manual.tips.map((tip, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={tip} onChange={e => { const a = [...manual.tips]; a[i] = e.target.value; set('tips', a) }} className={`${inputCls} flex-1`} />
            <button type="button" onClick={() => set('tips', manual.tips.filter((_, idx) => idx !== i))} className="text-stone-300 hover:text-red-400 text-lg">×</button>
          </div>
        ))}
        <button type="button" onClick={() => set('tips', [...manual.tips, ''])} className="text-green-700 text-sm hover:underline">+ Add tip</button>
      </FormCard>

      <button onClick={onSubmit} className="bg-green-700 text-white w-full py-3 rounded-xl font-medium hover:bg-green-600 transition-colors">
        Preview Recipe →
      </button>
    </div>
  )
}

function ReviewPanel({ recipe, imagePreview, updateReview, updateIngredient, addIngredient, removeIngredient, updateStep, addStep, removeStep, onConfirm, onReset }) {
  const toggleSeason = (s) =>
    updateReview('season', recipe.season.includes(s)
      ? recipe.season.filter(x => x !== s)
      : [...recipe.season, s])

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-stone-800">Review & Edit</h2>
        <button onClick={onReset} className="text-sm text-stone-400 hover:text-stone-600">Start over</button>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="h-48 rounded-2xl overflow-hidden mb-6">
          <img src={imagePreview} className="w-full h-full object-cover" alt="recipe" />
        </div>
      )}

      <div className="space-y-4">
        <FormCard title="Basic Info">
          <Field label="Name"><input value={recipe.name} onChange={e => updateReview('name', e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea value={recipe.description} onChange={e => updateReview('description', e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prep (min)"><input type="number" value={recipe.prepTime} onChange={e => updateReview('prepTime', Number(e.target.value))} className={inputCls} /></Field>
            <Field label="Cook (min)"><input type="number" value={recipe.cookTime} onChange={e => updateReview('cookTime', Number(e.target.value))} className={inputCls} /></Field>
            <Field label="Serves"><input type="number" value={recipe.serves} onChange={e => updateReview('serves', Number(e.target.value))} className={inputCls} /></Field>
          </div>
          <Field label="Tags (comma-separated)">
            <input
              value={Array.isArray(recipe.tags) ? recipe.tags.join(', ') : recipe.tags}
              onChange={e => updateReview('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className={inputCls}
            />
          </Field>
          <Field label="Season">
            <div className="flex gap-2 flex-wrap">
              {SEASONS.map(s => (
                <button key={s} type="button" onClick={() => toggleSeason(s)}
                  className={`px-3 py-1.5 rounded-xl text-sm capitalize transition-colors ${recipe.season.includes(s) ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-green-50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </FormCard>

        <FormCard title="🛒 Ingredients">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} placeholder="Amt" className={`${inputCls} w-16`} />
              <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} className={`${inputCls} w-20`}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient" className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => removeIngredient(i)} className="text-stone-300 hover:text-red-400 text-lg">×</button>
            </div>
          ))}
          <button type="button" onClick={addIngredient} className="text-green-700 text-sm hover:underline">+ Add ingredient</button>
        </FormCard>

        <FormCard title="👨‍🍳 Method">
          {recipe.method.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center shrink-0 mt-2 font-bold">{i + 1}</span>
              <textarea value={step} onChange={e => updateStep('method', i, e.target.value)} rows={2} className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => removeStep('method', i)} className="text-stone-300 hover:text-red-400 text-lg mt-1">×</button>
            </div>
          ))}
          <button type="button" onClick={() => addStep('method')} className="text-green-700 text-sm hover:underline">+ Add step</button>
        </FormCard>

        <FormCard title="💡 Tips">
          {recipe.tips.map((tip, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={tip} onChange={e => updateStep('tips', i, e.target.value)} className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => removeStep('tips', i)} className="text-stone-300 hover:text-red-400 text-lg">×</button>
            </div>
          ))}
          <button type="button" onClick={() => addStep('tips')} className="text-green-700 text-sm hover:underline">+ Add tip</button>
        </FormCard>

        <button onClick={onConfirm} className="bg-green-700 text-white w-full py-3 rounded-xl font-medium hover:bg-green-600 transition-colors text-lg">
          ✓ Add to Recipe Book
        </button>
      </div>
    </div>
  )
}

function FormCard({ title, children }) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm space-y-3">
      {title && <h3 className="font-semibold text-stone-700 mb-1">{title}</h3>}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'
