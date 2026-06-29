const SEASON_EMOJI = {
  summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌸'
}

export default function RecipeCard({ recipe, onClick }) {
  const stars = '⭐'.repeat(recipe.rating || 0)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center overflow-hidden">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl">🌱</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-stone-800 leading-tight">{recipe.name}</h3>
          <div className="flex gap-1 shrink-0">
            {recipe.season.map(s => (
              <span key={s} title={s}>{SEASON_EMOJI[s]}</span>
            ))}
          </div>
        </div>
        <p className="text-stone-500 text-sm line-clamp-2 mb-3">{recipe.description}</p>
        <div className="flex items-center justify-between text-xs text-stone-400">
          <div className="flex gap-3">
            <span>⏱ {recipe.prepTime + recipe.cookTime} min</span>
            <span>👥 {recipe.serves}</span>
          </div>
          {recipe.rating && <span>{stars}</span>}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {recipe.tags.slice(0, 3).map(tag => (
            <span key={tag} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
