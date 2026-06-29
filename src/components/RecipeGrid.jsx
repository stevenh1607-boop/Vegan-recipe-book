import { useState } from 'react'
import RecipeCard from './RecipeCard'

const SEASONS = ['all', 'summer', 'autumn', 'winter', 'spring']

export default function RecipeGrid({ recipes, onSelectRecipe }) {
  const [search, setSearch] = useState('')
  const [season, setSeason] = useState('all')

  const filtered = recipes.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
    const matchesSeason = season === 'all' || r.season.includes(season)
    return matchesSearch && matchesSeason
  })

  return (
    <div>
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search recipes, ingredients, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white shadow-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-2">
          {SEASONS.map(s => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                season === s
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-green-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-stone-400 text-sm mb-4">{filtered.length} recipe{filtered.length !== 1 ? 's' : ''}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🥦</p>
          <p className="text-lg">No recipes found</p>
          <p className="text-sm">Try a different search or add a new recipe</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onSelectRecipe(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
