import { useState } from 'react'
import RecipeGrid from './components/RecipeGrid'
import RecipeDetail from './components/RecipeDetail'
import RecipeScanner from './components/RecipeScanner'
import { useSupabaseRecipes } from './hooks/useSupabaseRecipes'

export default function App() {
  const { recipes, addRecipe, updateRecipe, loading } = useSupabaseRecipes()
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [view, setView] = useState('home') // home | detail | scanner

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe)
    setView('detail')
  }

  const handleBack = () => {
    setSelectedRecipe(null)
    setView('home')
  }

  const handleAddRecipe = (newRecipe) => {
    addRecipe(newRecipe)
    setView('home')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {(view === 'detail' || view === 'scanner') && (
            <button onClick={handleBack} className="text-green-200 hover:text-white text-2xl mr-2">←</button>
          )}
          <span className="text-2xl">🌱</span>
          <h1 className="text-xl font-bold tracking-tight">Vegan Recipe Book</h1>
        </div>
        <button
          onClick={() => setView('scanner')}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Add Recipe
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-stone-400">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
            <p className="text-sm">Loading your recipes…</p>
          </div>
        ) : view === 'home' ? (
          <RecipeGrid
            recipes={recipes}
            onSelectRecipe={handleSelectRecipe}
          />
        ) : view === 'detail' && selectedRecipe ? (
          <RecipeDetail
            recipe={selectedRecipe}
            onBack={handleBack}
            onUpdateRecipe={(updated) => {
              updateRecipe(updated)
              setSelectedRecipe(updated)
            }}
          />
        ) : view === 'scanner' ? (
          <RecipeScanner
            onAddRecipe={handleAddRecipe}
            onBack={handleBack}
          />
        ) : null}
      </main>
    </div>
  )
}
