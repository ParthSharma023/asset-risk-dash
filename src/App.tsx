import './App.css'
import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { generateDashboardCurves } from './calculations'
import type { DashboardParams, StrategyKey } from './calculations'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

ChartJS.defaults.responsive = true
ChartJS.defaults.maintainAspectRatio = false
ChartJS.defaults.devicePixelRatio = 2

const defaultParams: DashboardParams = {
  lifespanYears: 30,
  replacementCost: 1_000_000,
  riskAlpha: 6,
  minLof: 0.05,
  cycleLengthYears: 5,
  threshold: 0.4,
  points: 500,
}

function App() {
  const [params, setParams] = useState<DashboardParams>(defaultParams)

  const curves = useMemo(
    () => generateDashboardCurves(params),
    [params],
  )

  const labels = curves.cost.map((p) => p.t.toFixed(1))

  const currency = (v: number) =>
    `$${v.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`
  const percent = (v: number) =>
    `${(v * 100).toFixed(2)}%`

  const costData = {
    labels,
    datasets: [
      {
        label: 'No Fix',
        data: curves.cost.map((p) => p.noFix),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225,29,72,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix in Plan',
        data: curves.cost.map((p) => p.fixInPlan),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix on Fail',
        data: curves.cost.map((p) => p.fixOnFail),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix on Risk',
        data: curves.cost.map((p) => p.fixOnRisk),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.2)',
        tension: 0.2,
      },
    ],
  }

  const riskData = {
    labels,
    datasets: [
      {
        label: 'No Fix',
        data: curves.risk.map((p) => p.noFix),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225,29,72,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix in Plan',
        data: curves.risk.map((p) => p.fixInPlan),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix on Fail',
        data: curves.risk.map((p) => p.fixOnFail),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.2)',
        tension: 0.2,
      },
      {
        label: 'Fix on Risk',
        data: curves.risk.map((p) => p.fixOnRisk),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.2)',
        tension: 0.2,
      },
    ],
  }

  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 0,
        hitRadius: 6,
        hoverRadius: 4,
      },
      line: {
        borderWidth: 2,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            const value = ctx.parsed.y
            return `${label}: ${currency(value)}`
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (years)',
        },
        ticks: {
          maxTicksLimit: 8,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Dollars',
        },
      },
    },
  }

  const riskOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            const value = ctx.parsed.y
            return `${label}: ${currency(value)}`
          },
        },
      },
    },
    scales: {
      ...commonOptions.scales,
      y: {
        title: {
          display: true,
          text: 'Risk (Expected \$)',
        },
      },
    },
  }

  const updateParam = <K extends keyof DashboardParams>(
    key: K,
    value: number,
  ) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const strategyMeta: {
    key: StrategyKey
    name: string
    description: string
  }[] = [
    {
      key: 'noFix',
      name: 'No Fix',
      description:
        'Lowest upfront, highest end-of-life cost.',
    },
    {
      key: 'fixInPlan',
      name: 'Fix in Plan',
      description:
        'Predictable cycles with moderate cost.',
    },
    {
      key: 'fixOnFail',
      name: 'Fix on Fail',
      description:
        'Unpredictable failures and emergency repairs.',
    },
    {
      key: 'fixOnRisk',
      name: 'Fix on Risk',
      description:
        'Optimized balance of cost and risk.',
    },
  ]

  const recommended = (() => {
    let best = strategyMeta[0]
    let bestScore = Number.POSITIVE_INFINITY
    for (const s of strategyMeta) {
      const cost = curves.totalCosts[s.key]
      const avgRisk = curves.averageRisk[s.key]
      const score = cost + avgRisk
      if (score < bestScore) {
        bestScore = score
        best = s
      }
    }
    return best
  })()

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Asset Risk Management Dashboard</h1>
          <p className="subtitle">Calculations Reference Simulator</p>
        </div>
      </header>

      <main className="layout">
        <section className="controls">
          <h2>Adjustable Parameters</h2>
          <div className="control-grid">
            <div className="control-group">
              <label>
                Lifespan (years)
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={params.lifespanYears}
                  onChange={(e) =>
                    updateParam(
                      'lifespanYears',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {params.lifespanYears} years
                </span>
              </label>
            </div>

            <div className="control-group">
              <label>
                Replacement Cost ($)
                <input
                  type="range"
                  min={50_000}
                  max={5_000_000}
                  step={50_000}
                  value={params.replacementCost}
                  onChange={(e) =>
                    updateParam(
                      'replacementCost',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {currency(params.replacementCost)}
                </span>
              </label>
            </div>

            <div className="control-group">
              <label>
                Risk Alpha (curve steepness)
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={params.riskAlpha}
                  onChange={(e) =>
                    updateParam(
                      'riskAlpha',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {params.riskAlpha.toFixed(1)}
                </span>
              </label>
            </div>

            <div className="control-group">
              <label>
                Minimum LOF (infant mortality)
                <input
                  type="range"
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  value={params.minLof}
                  onChange={(e) =>
                    updateParam(
                      'minLof',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {percent(params.minLof)}
                </span>
              </label>
            </div>

            <div className="control-group">
              <label>
                Cycle Length (years) – Fix in Plan
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={params.cycleLengthYears}
                  onChange={(e) =>
                    updateParam(
                      'cycleLengthYears',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {params.cycleLengthYears} years
                </span>
              </label>
            </div>

            <div className="control-group">
              <label>
                Risk Threshold (fraction of COF)
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={params.threshold}
                  onChange={(e) =>
                    updateParam(
                      'threshold',
                      Number(e.target.value),
                    )
                  }
                />
                <span className="value">
                  {percent(params.threshold)} (
                  {currency(curves.thresholdDollar)})
                </span>
              </label>
            </div>
          </div>

          <div className="control-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                setParams((prev) => ({ ...prev }))
              }
            >
              Update Dashboard
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setParams(defaultParams)}
            >
              Reset to Defaults
            </button>
          </div>

          <div className="notes">
            <p>
              All curves use 500 time steps, random events are
              generated with a fixed seed (42) for reproducible
              results. Costs are cumulative; risk is expected loss
              in dollars (LOF × COF).
            </p>
          </div>
        </section>

        <section className="charts-column">
          <div className="charts">
            <div className="chart-card">
              <h2>Risk Over Time</h2>
              <div className="chart-container">
                <Line data={riskData} options={riskOptions} />
              </div>
            </div>

            <div className="chart-card">
              <h2>Cumulative Cost Over Time</h2>
              <div className="chart-container">
                <Line data={costData} options={commonOptions} />
              </div>
            </div>
          </div>
        </section>

        <section className="strategy-panel">
          <h2>Strategy Comparison</h2>
          <div className="strategy-cards">
            {strategyMeta.map((s) => (
              <div
                key={s.key}
                className={`strategy-card strategy-card--${s.key}`}
              >
                <div className="strategy-card-header">
                  <span className="strategy-name">
                    {s.name}
                  </span>
                </div>
                <div className="strategy-metrics">
                  <div>
                    <div className="metric-label">
                      Total Cost
                    </div>
                    <div className="metric-value">
                      {currency(curves.totalCosts[s.key])}
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">
                      Avg Risk
                    </div>
                    <div className="metric-value">
                      {currency(curves.averageRisk[s.key])}
                    </div>
                  </div>
                </div>
                <p className="strategy-description">
                  {s.description}
                </p>
              </div>
            ))}
          </div>

          <div className="recommended-card">
            <div className="recommended-header">
              <span className="badge">Recommended</span>
              <h3>{recommended.name}</h3>
            </div>
            <p className="recommended-copy">
              Based on your parameters, this strategy offers a
              strong balance of total lifecycle cost and
              average risk.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
