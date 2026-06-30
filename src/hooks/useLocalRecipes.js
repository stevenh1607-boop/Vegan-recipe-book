import { useState, useEffect } from 'react'
import seedData from '../data/recipes.json'

const STORAGE_KEY = 'vegan-recipe-book:recipes'

function loadRecipes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // corrupted JSON or blocked localStorage — fall through to seed
  }
  return seedData
}

export function useLocalRecipes() {
  const [recipes, setRecipes] = useState(loadRecipes)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
    } catch {
      // storage full or blocked — carry on in-memory
    }
  }, [recipes])

  return [recipes, setRecipes]
}
