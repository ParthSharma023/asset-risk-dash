// Core mathematical and simulation logic for the Asset Risk Management Dashboard

export type StrategyKey = 'noFix' | 'fixInPlan' | 'fixOnFail' | 'fixOnRisk'

export interface DashboardParams {
  lifespanYears: number
  replacementCost: number
  riskAlpha: number
  minLof: number
  cycleLengthYears: number
  threshold: number // fraction 0–1
  points: number
}

export interface CurvePoint {
  t: number // absolute time
  x: number // normalized time 0–1
  noFix: number
  fixInPlan: number
  fixOnFail: number
  fixOnRisk: number
}

export interface Curves {
  cost: CurvePoint[]
  risk: CurvePoint[]
  totalCosts: Record<StrategyKey, number>
  averageRisk: Record<StrategyKey, number>
  thresholdDollar: number
}

// --- Utility: deterministic RNG (seed=42) ---

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Core functions from spec ---

export function logisticCurve(x: number, alpha: number, midpoint = 0.5): number {
  return 1 / (1 + Math.exp(-alpha * (x - midpoint)))
}

export function calculateLof(
  ageNormalized: number,
  lofAlpha: number,
  minLof = 0.05,
): number {
  const f = logisticCurve(ageNormalized, lofAlpha, 0.7)
  return minLof + (1 - minLof) * f
}

// --- Cost curves ---

function generateCostCurves(
  lifespan: number,
  _costCurveAlpha: number,
  replacementCost: number,
  cycleLength: number,
  points: number,
): CurvePoint[] {
  const result: CurvePoint[] = []

  const rng = mulberry32(42)

  // Pre-generate failure events and interventions based on spec so they are consistent across t-steps

  // Fix on Fail – failure events
  const maxFailures = Math.max(
    3,
    Math.floor(2 + 3 * Math.pow(1, 2)), // at t=T
  )
  const failTimes: number[] = []
  const failCosts: number[] = []

  for (let i = 0; i < maxFailures; i++) {
    const basePosition = 0.3 + ((i + 1) / maxFailures) * 0.7
    const randomOffset = (rng() * 0.1 - 0.05) // Uniform(-0.05, 0.05)
    const failurePosition = Math.min(
      1,
      Math.max(0.3, basePosition + randomOffset),
    )
    const failureTime = failurePosition * lifespan
    failTimes.push(failureTime)

    const repairFraction = 0.3 + rng() * 0.2 // Uniform(0.3, 0.5)
    failCosts.push(repairFraction * replacementCost)
  }

  // Fix on Risk – interventions
  const interventions: number[] = []
  const N_interventions = 4
  const C_intervention = 0.2 * replacementCost
  for (let k = 1; k <= N_interventions; k++) {
    const position = (0.3 + k * 0.15) // (0.3 + k × 0.15) × T
    const tIntervention = Math.min(position, 1) * lifespan
    interventions.push(tIntervention)
  }

  // Pre-calc
  const baselineNoFixRate = 0.05 * replacementCost
  const baselineFixInPlanRate = 0.02 * replacementCost
  const baselineFixOnFailRate = 0.01 * replacementCost
  const baselineFixOnRiskRate = 0.02 * replacementCost

  // Accumulators
  let cumulativeNoFix = 0
  let cumulativeFixInPlan = 0
  let cumulativeFixOnFail = 0
  let cumulativeFixOnRisk = 0

  for (let i = 0; i < points; i++) {
    const x = i / (points - 1)
    const t = x * lifespan

    // No Fix
    const baselineNoFix = (baselineNoFixRate * t) / lifespan
    const catastrophicReplacement =
      t >= 0.9 * lifespan ? replacementCost : 0
    cumulativeNoFix = baselineNoFix + catastrophicReplacement

    // Fix in Plan
    const baselineFixInPlan = (baselineFixInPlanRate * t) / lifespan
    const nCycles = Math.floor(lifespan / cycleLength)
    const C_cycle = 0.15 * replacementCost
    let cycleCost = 0
    for (let c = 1; c <= nCycles; c++) {
      const tCycle = c * cycleLength
      if (t >= tCycle) {
        cycleCost += C_cycle
      }
    }
    cumulativeFixInPlan = baselineFixInPlan + cycleCost

    // Fix on Fail
    const baselineFail = (baselineFixOnFailRate * t) / lifespan
    let emergencyCost = 0
    for (let j = 0; j < failTimes.length; j++) {
      if (t >= failTimes[j]) {
        emergencyCost += failCosts[j]
      }
    }
    cumulativeFixOnFail = baselineFail + emergencyCost

    // Fix on Risk
    const baselineRisk = (baselineFixOnRiskRate * t) / lifespan
    let riskInterventionCost = 0
    for (const tInt of interventions) {
      if (t >= tInt) {
        riskInterventionCost += C_intervention
      }
    }
    cumulativeFixOnRisk = baselineRisk + riskInterventionCost

    result.push({
      t,
      x,
      noFix: cumulativeNoFix,
      fixInPlan: cumulativeFixInPlan,
      fixOnFail: cumulativeFixOnFail,
      fixOnRisk: cumulativeFixOnRisk,
    })
  }

  return result
}

// --- Risk curves ---

function generateRiskCurves(
  lifespan: number,
  riskAlpha: number,
  minLof: number,
  cof: number,
  cycleLength: number,
  threshold: number,
  points: number,
): CurvePoint[] {
  const result: CurvePoint[] = []
  const rng = mulberry32(42)

  // Fix on Fail failure times as before
  const maxFailures = Math.max(
    3,
    Math.floor(2 + 3 * Math.pow(1, 2)),
  )
  const failTimes: number[] = []
  for (let i = 0; i < maxFailures; i++) {
    const basePosition = 0.3 + ((i + 1) / maxFailures) * 0.7
    const randomOffset = rng() * 0.1 - 0.05
    const failurePosition = Math.min(
      1,
      Math.max(0.3, basePosition + randomOffset),
    )
    const failureTime = failurePosition * lifespan
    failTimes.push(failureTime)
  }
  failTimes.sort((a, b) => a - b)

  // Fix on Risk
  const thresholdLof = threshold
  let currentLof = minLof * 1.5

  let lastFailureTime = 0
  let failureIndex = 0

  for (let i = 0; i < points; i++) {
    const x = i / (points - 1)
    const t = x * lifespan
    const ageNormalized = x

    // No Fix
    const lofNoFix = calculateLof(ageNormalized, riskAlpha, minLof)
    const riskNoFix = lofNoFix * cof

    // Fix in Plan – cyclic pattern
    const cyclePosition = (t % cycleLength) / cycleLength
    const wave = (1 - Math.cos(2 * Math.PI * cyclePosition)) / 2
    const peakLof =
      minLof + (0.3 - minLof) * (1 + 0.5 * ageNormalized)
    const lofFixInPlan =
      minLof + (peakLof - minLof) * wave
    const riskFixInPlan = lofFixInPlan * cof

    // Fix on Fail – reactive pattern
    const baselineLof = minLof * 2
    let lofFixOnFail = baselineLof

    while (
      failureIndex < failTimes.length &&
      t > failTimes[failureIndex]
    ) {
      lastFailureTime = failTimes[failureIndex]
      failureIndex++
      lofFixOnFail = baselineLof * 2
    }

    const nextFailureTime =
      failureIndex < failTimes.length
        ? failTimes[failureIndex]
        : lifespan

    if (t < nextFailureTime) {
      const progress =
        (t - lastFailureTime) /
        (nextFailureTime - lastFailureTime || 1)
      const growth =
        baselineLof +
        (0.9 - baselineLof) *
          logisticCurve(progress, 2 * riskAlpha, 0.6)
      lofFixOnFail = Math.min(growth, 0.999)
    } else if (t === nextFailureTime) {
      lofFixOnFail = 1.0
    }

    const riskFixOnFail = lofFixOnFail * cof

    // Fix on Risk – optimized pattern
    const growthRate =
      0.001 * riskAlpha * (1 + 2 * ageNormalized)
    currentLof += growthRate
    if (currentLof >= thresholdLof) {
      currentLof = minLof * 1.5
    }
    const lofFixOnRisk = currentLof
    const riskFixOnRisk = lofFixOnRisk * cof

    result.push({
      t,
      x,
      noFix: riskNoFix,
      fixInPlan: riskFixInPlan,
      fixOnFail: riskFixOnFail,
      fixOnRisk: riskFixOnRisk,
    })
  }

  return result
}

// --- Summary metrics ---

function calculateTotalCosts(costPoints: CurvePoint[]): Record<StrategyKey, number> {
  const last = costPoints[costPoints.length - 1]
  return {
    noFix: last.noFix,
    fixInPlan: last.fixInPlan,
    fixOnFail: last.fixOnFail,
    fixOnRisk: last.fixOnRisk,
  }
}

function calculateAverageRisk(riskPoints: CurvePoint[]): Record<StrategyKey, number> {
  const n = riskPoints.length
  let sum: Record<StrategyKey, number> = {
    noFix: 0,
    fixInPlan: 0,
    fixOnFail: 0,
    fixOnRisk: 0,
  }
  for (const p of riskPoints) {
    sum.noFix += p.noFix
    sum.fixInPlan += p.fixInPlan
    sum.fixOnFail += p.fixOnFail
    sum.fixOnRisk += p.fixOnRisk
  }
  return {
    noFix: sum.noFix / n,
    fixInPlan: sum.fixInPlan / n,
    fixOnFail: sum.fixOnFail / n,
    fixOnRisk: sum.fixOnRisk / n,
  }
}

export function generateDashboardCurves(params: DashboardParams): Curves {
  const {
    lifespanYears,
    replacementCost,
    riskAlpha,
    minLof,
    cycleLengthYears,
    threshold,
    points,
  } = params

  const lifespan = lifespanYears
  const cof = replacementCost
  const costCurveAlpha = riskAlpha * 0.8

  const costPoints = generateCostCurves(
    lifespan,
    costCurveAlpha,
    replacementCost,
    cycleLengthYears,
    points,
  )
  const riskPoints = generateRiskCurves(
    lifespan,
    riskAlpha,
    minLof,
    cof,
    cycleLengthYears,
    threshold,
    points,
  )

  const totalCosts = calculateTotalCosts(costPoints)
  const averageRisk = calculateAverageRisk(riskPoints)
  const thresholdDollar = threshold * cof

  return {
    cost: costPoints,
    risk: riskPoints,
    totalCosts,
    averageRisk,
    thresholdDollar,
  }
}

