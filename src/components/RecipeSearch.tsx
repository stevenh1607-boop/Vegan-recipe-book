// src/components/RecipeSearch.tsx

import { useState } from 'react';
import { searchRecipes, type Meal, type Ingredient } from '../services/mealdb.js';

export function RecipeSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const meals = await searchRecipes(query);
      setResults(meals);

      if (meals.length === 0) {
        setError('No recipes found. Try a different search term.');
      }
    } catch (err) {
      setError('Failed to fetch recipes. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      
      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search vegan recipes..."
          style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '0.5rem 1.25rem', fontSize: '1rem' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
      )}

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {results.map(meal => (
          <div key={meal.id} style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            
            <img
              src={meal.thumbnail}
              alt={meal.name}
              style={{ width: '100%', height: 160, objectFit: 'cover' }}
            />

            <div style={{ padding: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{meal.name}</h3>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#666' }}>
                {meal.category} · {meal.area}
              </p>

              {/* Ingredients list */}
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
                {meal.ingredients.slice(0, 5).map((ing: Ingredient) => (
                  <li key={ing.name}>{ing.measure} {ing.name}</li>
                ))}
                {meal.ingredients.length > 5 && (
                  <li style={{ color: '#999' }}>+{meal.ingredients.length - 5} more...</li>
                )}
              </ul>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}