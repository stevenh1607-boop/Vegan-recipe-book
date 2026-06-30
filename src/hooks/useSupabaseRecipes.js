import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import seedData from '../data/recipes.json'

export function useSupabaseRecipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  // Initial load
  useEffect(() => {
    supabase
      .from('recipes')
      .select('data')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase load error:', error)
          setRecipes(seedData)
        } else if (data.length === 0) {
          seedInitial()
        } else {
          setRecipes(data.map(r => r.data))
        }
        setLoading(false)
      })
  }, [])

  async function seedInitial() {
    const rows = seedData.map(r => ({ id: r.id, data: r }))
    const { error } = await supabase.from('recipes').insert(rows)
    if (!error) setRecipes(seedData)
  }

  // Real-time subscription — changes from any device update local state
  useEffect(() => {
    const channel = supabase
      .channel('recipes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRecipes(prev =>
              prev.some(r => r.id === payload.new.data.id)
                ? prev  // already added optimistically on this device
                : [payload.new.data, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setRecipes(prev =>
              prev.map(r => r.id === payload.new.data.id ? payload.new.data : r)
            )
          } else if (payload.eventType === 'DELETE') {
            setRecipes(prev => prev.filter(r => r.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function addRecipe(recipe) {
    setRecipes(prev => [recipe, ...prev])  // optimistic
    const { error } = await supabase
      .from('recipes')
      .insert({ id: recipe.id, data: recipe })
    if (error) {
      console.error('Failed to save recipe:', error)
      setRecipes(prev => prev.filter(r => r.id !== recipe.id))  // revert
    }
  }

  async function updateRecipe(recipe) {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))  // optimistic
    const { error } = await supabase
      .from('recipes')
      .upsert({ id: recipe.id, data: recipe })
    if (error) {
      console.error('Failed to update recipe:', error)
    }
  }

  return { recipes, addRecipe, updateRecipe, loading }
}
