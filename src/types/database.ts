export interface WaterUtility {
  id: string
  pwsid: string
  utility_name: string
  utility_type: string
  city: string
  state: string
  county: string
  population_served: number
  service_connections: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WaterSystem {
  pwsid: string
  pws_name: string
  city_name: string
  state_code: string
  zip_code: string
  population_served_count: string
  primary_source_code: string
  [key: string]: any
}

export interface ZipCodeMapping {
  id: string
  zip_code: string
  pwsid: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface LcrSample {
  pwsid: string
  sample_id: string
  contaminant_code: string
  sample_measure: string
  unit_of_measure: string
  sampling_start_date: string
  sampling_end_date: string
  [key: string]: any
}

export interface ShowerChlorineData {
  totalShowerWaterLiters: number
  totalChlorineInShower: number
  chlorineVaporized: number
  chlorineInhaled: number
  chlorineAbsorbedSkin: number
  totalChlorineAbsorbed: number
  dailyBleachEquivalent: number
  weeklyBleachEquivalent: number
  yearlyBleachEquivalent: number
}

export interface CalculationResult {
  glassesPerDay: number
  chlorinePerGlass: number
  chlorinePerYear: number
  bleachEquivalent: number
  utility: WaterUtility | WaterSystem
  zipCode: string
  chlorinePPM: number
  chlorineData: any
  showerMinutes?: number
  showerChlorineData?: ShowerChlorineData
  totalDailyChlorineExposure?: number
  totalDailyBleachEquivalent?: number
}
