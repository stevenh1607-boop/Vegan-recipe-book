import { useState } from 'react'
import RecipeCard from './RecipeCard'

const SEASONS = ['all', 'summer', 'autumn', 'winter', 'spring']

export default function RecipeGrid({ recipes, onSelectRecipe }) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [season, setSeason] = useState('all')

  const commit = () => setSearch(input)

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
        <div className="flex flex-1 items-center bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
          <input
            type="text"
            placeholder="Search recipes, ingredients, tags..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="flex-1 px-4 py-3 text-stone-700 placeholder-stone-400 focus:outline-none bg-transparent"
          />
          {input && (
            <button
              onClick={() => { setInput(''); setSearch('') }}
              className="px-2 text-stone-300 hover:text-stone-500 text-lg"
              aria-label="Clear search"
            >×</button>
          )}
          <button
            onClick={commit}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 text-white transition-colors"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

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
