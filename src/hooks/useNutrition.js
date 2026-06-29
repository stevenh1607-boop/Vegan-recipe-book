const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY

async function searchFood(ingredientName) {
  const res = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&dataType=SR%20Legacy,Survey%20(FNDDS)&pageSize=1&api_key=${USDA_API_KEY}`
  )
  const data = await res.json()
  return data.foods?.[0] || null
}

function extractNutrients(food) {
  const get = (nutrientId) => {
    const n = food.foodNutrients?.find(n => n.nutrientId === nutrientId)
    return n?.value || 0
  }
  return {
    caloriesPer100g: get(1008),
    proteinPer100g: get(1003),
    carbsPer100g: get(1005),
    fatPer100g: get(1004),
    fibrePer100g: get(1079),
  }
}

function toGrams(amount, unit, foodName) {
  const u = unit?.toLowerCase()
  const conversions = {
    g: amount,
    kg: amount * 1000,
    ml: amount,
    l: amount * 1000,
    tbsp: amount * 15,
    tsp: amount * 5,
    cup: amount * 240,
    cloves: amount * 5,
    whole: estimateWhole(foodName, amount),
    slice: amount * 30,
  }
  return conversions[u] ?? amount * 100
}

function estimateWhole(name, amount) {
  const n = name.toLowerCase()
  if (n.includes('onion')) return amount * 150
  if (n.includes('capsicum')) return amount * 160
  if (n.includes('zucchini')) return amount * 200
  if (n.includes('carrot')) return amount * 80
  if (n.includes('potato')) return amount * 150
  if (n.includes('tomato')) return amount * 120
  if (n.includes('lemon') || n.includes('lime')) return amount * 60
  if (n.includes('orange')) return amount * 130
  return amount * 100
}

export async function calculateNutrition(ingredients, serves = 2) {
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }

  await Promise.all(
    ingredients.map(async (ing) => {
      try {
        const food = await searchFood(ing.name)
        if (!food) return
        const nutrients = extractNutrients(food)
        const grams = toGrams(ing.amount, ing.unit, ing.name)
        const factor = grams / 100

        totals.calories += nutrients.caloriesPer100g * factor
        totals.protein += nutrients.proteinPer100g * factor
        totals.carbs += nutrients.carbsPer100g * factor
        totals.fat += nutrients.fatPer100g * factor
        totals.fibre += nutrients.fibrePer100g * factor
      } catch (e) {
        console.warn(`Nutrition lookup failed for: ${ing.name}`)
      }
    })
  )

  return {
    calories: Math.round(totals.calories / serves),
    protein: Math.round(totals.protein / serves * 10) / 10,
    carbs: Math.round(totals.carbs / serves * 10) / 10,
    fat: Math.round(totals.fat / serves * 10) / 10,
    fibre: Math.round(totals.fibre / serves * 10) / 10,
  }
}
