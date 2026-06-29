// src/services/mealdb.ts

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// ── Types ──────────────────────────────────────────────

export interface Ingredient {
  name: string;
  measure: string;
}

export interface Meal {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  youtubeUrl: string | null;
  ingredients: Ingredient[];
  tags: string[];
}

export interface MealSummary {
  id: string;
  name: string;
  thumbnail: string;
}

export interface Category {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
}

// ── Normalizer ─────────────────────────────────────────

function normalizeIngredients(raw: Record<string, string>): Ingredient[] {
  const ingredients: Ingredient[] = [];

  for (let i = 1; i <= 20; i++) {
    const name = raw[`strIngredient${i}`]?.trim();
    const measure = raw[`strMeasure${i}`]?.trim();
    if (!name) continue;
    ingredients.push({ name, measure: measure ?? '' });
  }

  return ingredients;
}

function normalizeMeal(raw: Record<string, string>): Meal {
  return {
    id: raw.idMeal ?? '',
    name: raw.strMeal ?? '',
    category: raw.strCategory ?? '',
    area: raw.strArea ?? '',
    instructions: raw.strInstructions ?? '',
    thumbnail: raw.strMealThumb ?? '',
    youtubeUrl: raw.strYoutube || null,
    ingredients: normalizeIngredients(raw),
    tags: raw.strTags ? raw.strTags.split(',').map(t => t.trim()) : [],
  };
}

// ── Fetch Helper ───────────────────────────────────────

async function fetchMealDB<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`);

  if (!res.ok) {
    throw new Error(`TheMealDB request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ── API Functions ──────────────────────────────────────

export async function searchRecipes(query: string): Promise<Meal[]> {
  if (!query.trim()) return [];

  const data = await fetchMealDB<{ meals: Record<string, string>[] | null }>(
    `/search.php?s=${encodeURIComponent(query)}`
  );

  return (data.meals ?? []).map(normalizeMeal);
}

export async function getRecipeById(id: string): Promise<Meal | null> {
  const data = await fetchMealDB<{ meals: Record<string, string>[] | null }>(
    `/lookup.php?i=${id}`
  );

  return data.meals?.[0] ? normalizeMeal(data.meals[0]) : null;
}

export async function getRandomRecipe(): Promise<Meal | null> {
  const data = await fetchMealDB<{ meals: Record<string, string>[] | null }>(
    `/random.php`
  );

  return data.meals?.[0] ? normalizeMeal(data.meals[0]) : null;
}

export async function getCategories(): Promise<Category[]> {
  const data = await fetchMealDB<{
    categories: {
      idCategory: string;
      strCategory: string;
      strCategoryThumb: string;
      strCategoryDescription: string;
    }[]
  }>('/categories.php');

  return (data.categories ?? []).map(c => ({
    id: c.idCategory,
    name: c.strCategory,
    thumbnail: c.strCategoryThumb,
    description: c.strCategoryDescription,
  }));
}

export async function filterByCategory(category: string): Promise<MealSummary[]> {
  const data = await fetchMealDB<{
    meals: { idMeal: string; strMeal: string; strMealThumb: string }[] | null
  }>(`/filter.php?c=${encodeURIComponent(category)}`);

  return (data.meals ?? []).map(m => ({
    id: m.idMeal,
    name: m.strMeal,
    thumbnail: m.strMealThumb,
  }));
}

export async function filterByIngredient(ingredient: string): Promise<MealSummary[]> {
  const data = await fetchMealDB<{
    meals: { idMeal: string; strMeal: string; strMealThumb: string }[] | null
  }>(`/filter.php?i=${encodeURIComponent(ingredient)}`);

  return (data.meals ?? []).map(m => ({
    id: m.idMeal,
    name: m.strMeal,
    thumbnail: m.strMealThumb,
  }));
}

export async function filterByArea(area: string): Promise<MealSummary[]> {
  const data = await fetchMealDB<{
    meals: { idMeal: string; strMeal: string; strMealThumb: string }[] | null
  }>(`/filter.php?a=${encodeURIComponent(area)}`);

  return (data.meals ?? []).map(m => ({
    id: m.idMeal,
    name: m.strMeal,
    thumbnail: m.strMealThumb,
  }));
}