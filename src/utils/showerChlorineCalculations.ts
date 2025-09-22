import { ShowerChlorineData } from '@/types/database'

/**
 * Calculate chlorine absorption from showering
 * Based on corrected scientific formulas using peer-reviewed research:
 * - Volatilization: Jo et al. (1990), Water Research
 * - Dermal absorption: Brown et al. (1984), Regulatory Toxicology and Pharmacology
 * - Inhalation absorption: EPA Risk Assessment Guidelines (1991)
 */
export function calculateShowerChlorineAbsorption(
  showerMinutes: number,
  chlorinePPM: number
): ShowerChlorineData {
  // Constants based on scientific research (corrected values)
  const GALLONS_PER_MINUTE = 2.1 // Real-world average shower flow rate (EPA data)
  const LITERS_PER_GALLON = 3.785
  const VOLATILIZATION_RATE = 0.56 // 56% of chlorine volatilizes during showers
  const INHALATION_ABSORPTION_RATE = 0.70 // 70% absorption rate for inhaled chlorine
  const DERMAL_ABSORPTION_RATE = 0.05 // 5% dermal absorption rate (corrected from literature)
  const MG_CHLORINE_PER_TEASPOON_BLEACH = 318 // mg of chlorine per teaspoon of Clorox bleach

  // Step 1: Calculate total shower water in liters
  const totalShowerWaterLiters = GALLONS_PER_MINUTE * showerMinutes * LITERS_PER_GALLON

  // Step 2: Calculate total chlorine in shower water (mg)
  // PPM = mg/L, so chlorinePPM * liters = mg of chlorine
  const totalChlorineInShower = totalShowerWaterLiters * chlorinePPM

  // Step 3: Calculate chlorine distribution
  const chlorineVaporized = totalChlorineInShower * VOLATILIZATION_RATE
  const chlorineRemaining = totalChlorineInShower * (1 - VOLATILIZATION_RATE)

  // Step 4: Calculate chlorine absorbed via inhalation (from volatilized portion only)
  const chlorineInhaled = chlorineVaporized * INHALATION_ABSORPTION_RATE

  // Step 5: Calculate chlorine absorbed via skin (from non-volatilized portion only)
  // This corrects the double-counting error in the previous formula
  const chlorineAbsorbedSkin = chlorineRemaining * DERMAL_ABSORPTION_RATE

  // Step 6: Calculate total chlorine absorbed from shower
  const totalChlorineAbsorbed = chlorineInhaled + chlorineAbsorbedSkin

  // Step 7: Convert to bleach equivalent
  const dailyBleachEquivalent = totalChlorineAbsorbed / MG_CHLORINE_PER_TEASPOON_BLEACH
  const weeklyBleachEquivalent = dailyBleachEquivalent * 7
  const yearlyBleachEquivalent = dailyBleachEquivalent * 365

  return {
    totalShowerWaterLiters,
    totalChlorineInShower,
    chlorineVaporized,
    chlorineInhaled,
    chlorineAbsorbedSkin,
    totalChlorineAbsorbed,
    dailyBleachEquivalent,
    weeklyBleachEquivalent,
    yearlyBleachEquivalent
  }
}

/**
 * Calculate combined daily chlorine exposure from drinking water + shower
 */
export function calculateTotalDailyExposure(
  drinkingChlorinePerDay: number, // mg from drinking water
  showerChlorineAbsorbed: number  // mg from shower
): {
  totalDailyChlorine: number
  totalDailyBleachEquivalent: number
  drinkingPercentage: number
  showerPercentage: number
} {
  const MG_CHLORINE_PER_TEASPOON_BLEACH = 318

  const totalDailyChlorine = drinkingChlorinePerDay + showerChlorineAbsorbed
  const totalDailyBleachEquivalent = totalDailyChlorine / MG_CHLORINE_PER_TEASPOON_BLEACH

  const drinkingPercentage = (drinkingChlorinePerDay / totalDailyChlorine) * 100
  const showerPercentage = (showerChlorineAbsorbed / totalDailyChlorine) * 100

  return {
    totalDailyChlorine,
    totalDailyBleachEquivalent,
    drinkingPercentage,
    showerPercentage
  }
}

/**
 * Get descriptive text for shower duration impact
 */
export function getShowerImpactDescription(showerMinutes: number): {
  level: string
  color: string
  description: string
} {
  if (showerMinutes <= 5) {
    return {
      level: 'Low Impact',
      color: 'green',
      description: 'Quick showers minimize chlorine exposure'
    }
  }
  if (showerMinutes <= 10) {
    return {
      level: 'Moderate Impact',
      color: 'blue',
      description: 'Average shower duration with moderate exposure'
    }
  }
  if (showerMinutes <= 15) {
    return {
      level: 'Higher Impact',
      color: 'orange',
      description: 'Longer showers increase chlorine absorption significantly'
    }
  }
  return {
    level: 'High Impact',
    color: 'red',
    description: 'Extended showers maximize chlorine exposure through skin and lungs'
  }
}