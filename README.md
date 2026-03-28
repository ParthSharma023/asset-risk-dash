# Asset Risk Management Dashboard

An interactive web dashboard for comparing infrastructure maintenance strategies through lifecycle cost modeling and probabilistic risk analysis. Built with React, TypeScript, and Chart.js.

**Live demo:** https://brave-island-0e162cd10.1.azurestaticapps.net/

---

## What is this?

Infrastructure assets — bridges, pipelines, HVAC systems, anything with a finite lifespan — degrade over time. When they fail, they're expensive to replace and can cause serious disruption. The question asset managers face is: *when and how should you intervene?*

This dashboard models four maintenance strategies and lets you compare their total cost and risk exposure over an asset's full lifespan. You adjust parameters (asset value, failure curve steepness, maintenance intervals) and see in real time how each strategy plays out.

---

## The Four Strategies

| Strategy | Description |
|---|---|
| **No Fix** | Run the asset until it catastrophically fails. Lowest short-term cost, highest long-term risk. |
| **Fix in Plan** | Scheduled maintenance on a fixed cycle (e.g., every 5 years), regardless of actual condition. |
| **Fix on Fail** | React only when something breaks. Low overhead, but repair costs are unpredictable. |
| **Fix on Risk** | Intervene when a calculated risk score crosses a threshold. Data-driven and proactive. |

---

## The Math

The dashboard is built on a few core modeling concepts. Here's how they work:

### Logistic (S-Curve) Failure Model

Most assets don't fail linearly — they're relatively stable early on, then degrade rapidly as they age. This is captured with a logistic curve:

```
f(x) = 1 / (1 + e^(-α(x - midpoint)))
```

This is the same sigmoid function used in logistic regression and neural networks. The parameter `α` (alpha) controls the steepness — a high alpha means the asset is fine for a long time and then fails suddenly; a low alpha means more gradual degradation.

### Likelihood of Failure (LOF)

LOF is the probability that an asset fails at a given point in its life, expressed as a value from 0 to 1:

```
LOF = min_lof + (1 - min_lof) × sigmoid(age_normalized, α, 0.7)
```

`age_normalized` is simply `t / T` — current age divided by total expected lifespan, so it always runs 0 to 1. `min_lof` is the baseline failure rate even for a brand-new asset (default: 5%), analogous to infant mortality in hardware reliability engineering.

### Risk Score

Risk is the product of how likely failure is and how costly it would be:

```
Risk = LOF × COF
```

`COF` (Consequence of Failure) = replacement cost. So risk is denominated in dollars — it's the expected cost of failure at any given moment. This is standard expected value: `probability × impact`.

### Per-Strategy Modeling

Each strategy has its own cost accumulation and LOF behavior:

**No Fix** — costs grow linearly as the asset ages, then a catastrophic replacement hits at ~90% of lifespan. Risk follows the S-curve and never resets.

**Fix in Plan** — maintenance cost is 15% of replacement cost per cycle. Risk follows a cosine wave within each cycle (rises between maintenance, drops after), with peak risk increasing as the asset ages to reflect cumulative wear.

**Fix on Fail** — near-zero baseline cost, but random repair events cost 30–50% of replacement cost each. Number of failures scales quadratically with age. Risk spikes to 1.0 at each failure event, then resets.

**Fix on Risk** — four targeted interventions at predetermined thresholds (at 30%, 45%, 60%, 75% of lifespan). Each costs 20% of replacement cost. LOF resets to near-baseline after each intervention. The LOF growth rate between interventions accelerates as the asset ages.

### Summary Metrics

- **Total Cost** = cumulative cost at end of lifespan
- **Average Risk** = mean of 500 evenly-spaced risk samples across the full lifespan

All simulations use 500 time points for smooth curves and a fixed random seed (42) for reproducibility.

---

## Parameters You Can Tune

| Parameter | Effect |
|---|---|
| **Replacement Cost** | Base value — all costs and risks scale from this |
| **Asset Lifespan** | Total years modeled |
| **Risk Alpha** | Steepness of the failure curve (higher = more sudden failure) |
| **Min LOF** | Baseline failure probability even when new |
| **Cycle Length** | How often Fix in Plan performs maintenance |
| **Risk Threshold** | The LOF level that triggers a Fix on Risk intervention |

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** for bundling
- **Chart.js** + **react-chartjs-2** for visualization
- Deployed on **Azure Static Web Apps**

---

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

```bash
npm run build    # production build
npm run preview  # preview the production build
```
