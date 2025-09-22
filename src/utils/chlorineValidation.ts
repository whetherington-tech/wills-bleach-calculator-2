/**
 * Chlorine data validation utilities
 * Ensures data quality and prevents bad data insertion
 */

export interface ChlorineValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  warnings: string[];
  errors: string[];
  qualityScore: number; // 0-100
}

export interface ChlorineData {
  averageChlorine: number;
  minChlorine?: number;
  maxChlorine?: number;
  sampleCount?: number;
  sourceUrl?: string;
  utilityName?: string;
  city?: string;
  state?: string;
  pwsid?: string;
}

/**
 * EPA regulatory limits and typical ranges
 */
export const EPA_LIMITS = {
  MAXIMUM_ALLOWABLE: 4.0, // EPA MRDL for chlorine
  MINIMUM_DETECTABLE: 0.1, // Below this is essentially zero
  TYPICAL_MIN: 0.2, // EPA requires minimum 0.2 at distribution entry
  TYPICAL_MAX: 2.5, // Most utilities stay well below 4.0
  SWIMMING_POOL_MIN: 1.0, // For comparison
  SWIMMING_POOL_MAX: 3.0  // For comparison
};

/**
 * Validate chlorine data against EPA standards and typical ranges
 */
export function validateChlorineData(data: ChlorineData): ChlorineValidationResult {
  const result: ChlorineValidationResult = {
    isValid: true,
    confidence: 100,
    warnings: [],
    errors: [],
    qualityScore: 100
  };

  // Critical validation - EPA limits
  if (data.averageChlorine < EPA_LIMITS.MINIMUM_DETECTABLE) {
    result.errors.push(`Average chlorine ${data.averageChlorine} PPM is below detectable limits (${EPA_LIMITS.MINIMUM_DETECTABLE} PPM)`);
    result.isValid = false;
  }

  if (data.averageChlorine > EPA_LIMITS.MAXIMUM_ALLOWABLE) {
    result.errors.push(`Average chlorine ${data.averageChlorine} PPM exceeds EPA maximum allowable limit (${EPA_LIMITS.MAXIMUM_ALLOWABLE} PPM)`);
    result.isValid = false;
  }

  // Range validation
  if (data.minChlorine !== undefined) {
    if (data.minChlorine < 0) {
      result.errors.push(`Minimum chlorine cannot be negative: ${data.minChlorine} PPM`);
      result.isValid = false;
    }
    if (data.minChlorine > EPA_LIMITS.MAXIMUM_ALLOWABLE) {
      result.errors.push(`Minimum chlorine ${data.minChlorine} PPM exceeds EPA maximum (${EPA_LIMITS.MAXIMUM_ALLOWABLE} PPM)`);
      result.isValid = false;
    }
  }

  if (data.maxChlorine !== undefined) {
    if (data.maxChlorine > EPA_LIMITS.MAXIMUM_ALLOWABLE) {
      result.errors.push(`Maximum chlorine ${data.maxChlorine} PPM exceeds EPA maximum (${EPA_LIMITS.MAXIMUM_ALLOWABLE} PPM)`);
      result.isValid = false;
    }
    if (data.minChlorine !== undefined && data.maxChlorine < data.minChlorine) {
      result.errors.push(`Maximum chlorine (${data.maxChlorine}) cannot be less than minimum (${data.minChlorine})`);
      result.isValid = false;
    }
  }

  // Range consistency checks
  if (data.minChlorine !== undefined && data.averageChlorine < data.minChlorine) {
    result.errors.push(`Average chlorine (${data.averageChlorine}) cannot be less than minimum (${data.minChlorine})`);
    result.isValid = false;
  }

  if (data.maxChlorine !== undefined && data.averageChlorine > data.maxChlorine) {
    result.errors.push(`Average chlorine (${data.averageChlorine}) cannot be greater than maximum (${data.maxChlorine})`);
    result.isValid = false;
  }

  // Quality warnings for unusual but not invalid values
  if (data.averageChlorine < EPA_LIMITS.TYPICAL_MIN) {
    result.warnings.push(`Average chlorine ${data.averageChlorine} PPM is below typical municipal range (${EPA_LIMITS.TYPICAL_MIN}-${EPA_LIMITS.TYPICAL_MAX} PPM)`);
    result.confidence -= 20;
    result.qualityScore -= 15;
  }

  if (data.averageChlorine > EPA_LIMITS.TYPICAL_MAX) {
    result.warnings.push(`Average chlorine ${data.averageChlorine} PPM is above typical municipal range (${EPA_LIMITS.TYPICAL_MIN}-${EPA_LIMITS.TYPICAL_MAX} PPM)`);
    result.confidence -= 15;
    result.qualityScore -= 10;
  }

  // Swimming pool level warning (might indicate wrong data source)
  if (data.averageChlorine >= EPA_LIMITS.SWIMMING_POOL_MIN && data.averageChlorine <= EPA_LIMITS.SWIMMING_POOL_MAX) {
    result.warnings.push(`Chlorine level ${data.averageChlorine} PPM is in swimming pool range - verify this is drinking water data`);
    result.confidence -= 10;
  }

  // Sample count validation
  if (data.sampleCount !== undefined) {
    if (data.sampleCount < 4) {
      result.warnings.push(`Low sample count (${data.sampleCount}) may indicate insufficient data for reliable average`);
      result.confidence -= 10;
      result.qualityScore -= 5;
    }
    if (data.sampleCount > 365) {
      result.warnings.push(`Very high sample count (${data.sampleCount}) - verify this is annual data`);
      result.confidence -= 5;
    }
  }

  // Ensure confidence and quality score stay within bounds
  result.confidence = Math.max(0, Math.min(100, result.confidence));
  result.qualityScore = Math.max(0, Math.min(100, result.qualityScore));

  return result;
}

/**
 * Validate geographic consistency between PWSID and extracted data
 */
export function validateGeographicConsistency(
  pwsid: string,
  utilityName: string,
  city?: string,
  state?: string,
  sourceUrl?: string
): { isConsistent: boolean; warnings: string[]; confidence: number } {
  const warnings: string[] = [];
  let confidence = 100;

  // Extract state from PWSID (first 2 characters for US utilities)
  const pwsidState = pwsid.substring(0, 2);

  if (state && state.toUpperCase() !== pwsidState) {
    warnings.push(`State mismatch: PWSID indicates ${pwsidState}, but extracted state is ${state}`);
    confidence -= 50;
  }

  // Check for common cross-state utility name issues
  const utilityLower = utilityName.toLowerCase();
  const suspiciousPatterns = [
    { pattern: /franklin.*michigan|michigan.*franklin/i, warning: "Franklin Michigan data may be contaminating Franklin Tennessee" },
    { pattern: /metro.*nashville|nashville.*metro/i, warning: "Nashville Metro Water data detected - verify correct utility" },
    { pattern: /columbus|cleveland|cincinnati/i, warning: "Ohio utility names detected - verify state consistency" },
    { pattern: /portland.*maine|maine.*portland/i, warning: "Maine utility data detected - verify state consistency" }
  ];

  for (const { pattern, warning } of suspiciousPatterns) {
    if (pattern.test(utilityLower)) {
      warnings.push(warning);
      confidence -= 30;
    }
  }

  // URL domain validation
  if (sourceUrl) {
    const urlDomainWarnings = validateSourceUrlDomain(sourceUrl, city, state || pwsidState);
    warnings.push(...urlDomainWarnings.warnings);
    confidence -= urlDomainWarnings.confidencePenalty;
  }

  return {
    isConsistent: confidence > 50,
    warnings,
    confidence: Math.max(0, Math.min(100, confidence))
  };
}

/**
 * Validate that source URL domain matches utility location
 */
export function validateSourceUrlDomain(
  sourceUrl: string,
  city?: string,
  state?: string
): { warnings: string[]; confidencePenalty: number } {
  const warnings: string[] = [];
  let confidencePenalty = 0;

  try {
    const url = new URL(sourceUrl);
    const domain = url.hostname.toLowerCase();

    // Check for obviously wrong state domains
    const wrongStateDomains = [
      { pattern: /\.mi\.gov|michigan\.gov|\.mi\.us/i, state: 'Michigan', penalty: 40 },
      { pattern: /\.me\.gov|maine\.gov|\.me\.us/i, state: 'Maine', penalty: 40 },
      { pattern: /\.oh\.gov|ohio\.gov|\.oh\.us/i, state: 'Ohio', penalty: 40 },
      { pattern: /\.ca\.gov|california\.gov|\.ca\.us/i, state: 'California', penalty: 40 },
      { pattern: /nashville\.gov/i, state: 'Nashville (if not Nashville utility)', penalty: 30 }
    ];

    for (const { pattern, state: domainState, penalty } of wrongStateDomains) {
      if (pattern.test(domain)) {
        warnings.push(`Source URL appears to be from ${domainState}: ${domain}`);
        confidencePenalty += penalty;
      }
    }

    // Check for third-party domains that might have mixed data
    const thirdPartyDomains = [
      { pattern: /noviams\.com/i, warning: "Third-party utility management site - may contain mixed data", penalty: 15 },
      { pattern: /awwa\.org/i, warning: "AWWA site may contain sample/template data", penalty: 10 },
      { pattern: /epa\.gov/i, warning: "EPA site may contain aggregate/sample data", penalty: 5 }
    ];

    for (const { pattern, warning, penalty } of thirdPartyDomains) {
      if (pattern.test(domain)) {
        warnings.push(warning);
        confidencePenalty += penalty;
      }
    }

  } catch (error) {
    warnings.push(`Invalid source URL format: ${sourceUrl}`);
    confidencePenalty += 20;
  }

  return { warnings, confidencePenalty };
}

/**
 * Check if new data should replace existing data
 */
export function shouldReplaceExistingData(
  existingData: ChlorineData & { data_source?: string; confidence?: number },
  newData: ChlorineData & { data_source?: string; confidence?: number }
): { shouldReplace: boolean; reason: string } {
  // Never replace manual entries with automated extractions
  if (existingData.data_source === 'Manual User Entry' && newData.data_source !== 'Manual User Entry') {
    return { shouldReplace: false, reason: 'Preserving manual entry over automated extraction' };
  }

  // Always replace automated with manual
  if (existingData.data_source !== 'Manual User Entry' && newData.data_source === 'Manual User Entry') {
    return { shouldReplace: true, reason: 'Manual entry takes precedence over automated extraction' };
  }

  // Compare confidence scores if available
  const existingConfidence = existingData.confidence || 50;
  const newConfidence = newData.confidence || 50;

  if (newConfidence > existingConfidence + 20) {
    return { shouldReplace: true, reason: `New data has significantly higher confidence (${newConfidence} vs ${existingConfidence})` };
  }

  if (existingConfidence > newConfidence + 10) {
    return { shouldReplace: false, reason: `Existing data has higher confidence (${existingConfidence} vs ${newConfidence})` };
  }

  // Default to not replacing to avoid data churn
  return { shouldReplace: false, reason: 'Preserving existing data to avoid unnecessary changes' };
}