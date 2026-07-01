import { useState, useEffect } from 'react'
import { calculateNutrition } from '../hooks/useNutrition'
import { uploadToCloudinary } from '../services/recipeParser'

function scaleAmount(amount, servings, baseServes) {
  const scaled = amount * (servings / baseServes)
  if (scaled === 0) return 0
  // Round to nearest quarter for small amounts, 1dp for larger
  if (scaled < 1) return Math.round(scaled * 4) / 4
  return Math.round(scaled * 10) / 10
}

const SEASON_EMOJI = {
  summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌸'
}
function nutritionLooksValid(n) {
  if (!n) return false
  return Object.values(n).some(v => typeof v === 'number' && v > 0)
}

export default function RecipeDetail({ recipe, onBack, onUpdateRecipe }) {
  const [rating, setRating] = useState(recipe.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comments, setComments] = useState(recipe.comments || '')
  const [editingComments, setEditingComments] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState([])
  const [checkedIngredients, setCheckedIngredients] = useState([])
  const [servings, setServings] = useState(recipe.serves)
  const [nutrition, setNutrition] = useState(recipe.nutrition || null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const url = await uploadToCloudinary(file)
      onUpdateRecipe({ ...recipe, image: url })
    } catch (err) {
      setPhotoError('Upload failed — try again')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

 useEffect(() => {
    if (!nutritionLooksValid(recipe.nutrition) && recipe.ingredients?.length > 0) {
      setLoadingNutrition(true)
      calculateNutrition(recipe.ingredients, recipe.serves)
        .then(data => {
          setNutrition(data)
          onUpdateRecipe({ ...recipe, nutrition: data })
        })
        .catch(err => console.error('Nutrition calc failed:', err))
        .finally(() => setLoadingNutrition(false))
    }
  }, [recipe.id])

  const handleRating = (value) => {
    setRating(value)
    onUpdateRecipe({ ...recipe, rating: value })
  }

  const handleSaveComments = () => {
    onUpdateRecipe({ ...recipe, comments })
    setEditingComments(false)
  }

  const toggleStep = (index) => {
    setCheckedSteps(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  const toggleIngredient = (index) => {
    setCheckedIngredients(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* Hero Image */}
      <div className="relative h-64 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-8xl">🌱</span>
        )}

        {/* Photo edit button */}
        <label
          htmlFor={`photo-upload-${recipe.id}`}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer backdrop-blur-sm transition-colors"
        >
          {uploadingPhoto ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {recipe.image ? 'Change photo' : 'Add photo'}
            </>
          )}
          <input
            id={`photo-upload-${recipe.id}`}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={uploadingPhoto}
            className="hidden"
          />
        </label>

        {photoError && (
          <div className="absolute top-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-xl text-center">
            {photoError}
          </div>
        )}
      </div>

      {/* Title + Meta */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold text-stone-800 leading-tight">{recipe.name}</h1>
          <div className="flex gap-1 text-xl shrink-0">
            {recipe.season.map(s => (
              <span key={s} title={s}>{SEASON_EMOJI[s]}</span>
            ))}
          </div>
        </div>
        <p className="text-stone-500 mb-4">{recipe.description}</p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm text-stone-500 bg-stone-100 rounded-xl px-4 py-3 items-center">
          <span>⏱ Prep {recipe.prepTime} min</span>
          <span>🍳 Cook {recipe.cookTime} min</span>
          <div className="flex items-center gap-2 ml-auto">
            <span>👥</span>
            <button
              onClick={() => setServings(s => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full bg-white border border-stone-300 text-stone-600 flex items-center justify-center hover:bg-stone-200 transition-colors font-bold"
            >−</button>
            <span className="font-semibold text-stone-700 w-6 text-center">{servings}</span>
            <button
              onClick={() => setServings(s => s + 1)}
              className="w-7 h-7 rounded-full bg-white border border-stone-300 text-stone-600 flex items-center justify-center hover:bg-stone-200 transition-colors font-bold"
            >+</button>
            <span>serves</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {recipe.tags.map(tag => (
          <span key={tag} className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* Nutrition Panel */}
      <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold text-stone-700 mb-3">📊 Nutrition per serve</h2>
        {loadingNutrition ? (
          <div className="flex items-center gap-3 text-stone-400 py-2">
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Calculating nutrition...</span>
          </div>
        ) : nutrition ? (
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: 'Calories', value: nutrition.calories, unit: 'kcal' },
              { label: 'Protein', value: nutrition.protein, unit: 'g' },
              { label: 'Carbs', value: nutrition.carbs, unit: 'g' },
              { label: 'Fat', value: nutrition.fat, unit: 'g' },
              { label: 'Fibre', value: nutrition.fibre, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-stone-50 rounded-xl py-2 px-1">
                <p className="text-lg font-bold text-green-700">{value}</p>
                <p className="text-xs text-stone-400">{unit}</p>
                <p className="text-xs text-stone-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-sm">Nutrition data unavailable</p>
        )}
      </div>

      {/* Ingredients */}
      <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold text-stone-700 mb-3">🛒 Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={i}
              onClick={() => toggleIngredient(i)}
              className={`flex items-center gap-3 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
                checkedIngredients.includes(i)
                  ? 'bg-green-50 text-stone-400 line-through'
                  : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                checkedIngredients.includes(i)
                  ? 'border-green-500 bg-green-500'
                  : 'border-stone-300'
              }`}>
                {checkedIngredients.includes(i) && (
                  <span className="text-white text-xs">✓</span>
                )}
              </span>
              <span className="font-medium">{scaleAmount(ing.amount, servings, recipe.serves)} {ing.unit}</span>
              <span>{ing.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Method */}
      <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold text-stone-700 mb-3">👨‍🍳 Method</h2>
        <ol className="space-y-3">
          {recipe.method.map((step, i) => (
            <li
              key={i}
              onClick={() => toggleStep(i)}
              className={`flex gap-3 cursor-pointer p-2 rounded-xl transition-colors ${
                checkedSteps.includes(i) ? 'opacity-40' : 'hover:bg-stone-50'
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 transition-colors ${
                checkedSteps.includes(i)
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700'
              }`}>
                {checkedSteps.includes(i) ? '✓' : i + 1}
              </span>
              <p className={`text-stone-600 leading-relaxed ${checkedSteps.includes(i) ? 'line-through' : ''}`}>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
          <h2 className="font-semibold text-amber-800 mb-2">💡 Tips</h2>
          <ul className="space-y-1">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="text-amber-700 text-sm flex gap-2">
                <span>•</span><span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rating */}
      <div className="bg-white border border-stone-100 rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold text-stone-700 mb-3">⭐ Your Rating</h2>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-3xl transition-transform hover:scale-110"
            >
              {star <= (hoverRating || rating) ? '⭐' : '☆'}
            </button>
          ))}
        </div>

        {/* Comments */}
        <div>
          {editingComments ? (
            <div className="space-y-2">
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add notes about this recipe..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveComments}
                  className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingComments(false)}
                  className="text-stone-400 px-4 py-1.5 rounded-lg text-sm hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingComments(true)}
              className="min-h-12 p-3 rounded-xl bg-stone-50 text-stone-500 text-sm cursor-pointer hover:bg-stone-100 transition-colors"
            >
              {comments || 'Tap to add notes...'}
            </div>
          )}
        </div>
      </div>

      {/* Footer meta */}
      <p className="text-center text-xs text-stone-300">
        Added {recipe.dateAdded} · Source: {recipe.source}
      </p>
    </div>
  )
}
