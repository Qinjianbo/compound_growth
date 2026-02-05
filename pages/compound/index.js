function parseMoney(text) {
  const normalized = String(text || "").replace(/,/g, "").trim()
  if (!normalized) return 0
  const value = Number(normalized)
  return Number.isFinite(value) ? value : NaN
}

function formatMoney(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return "-"
  const fixed = Math.round(num * 100) / 100
  const parts = fixed.toFixed(2).split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${parts[0]}.${parts[1]}`
}

function computeYearlySchedule({ principal, monthly, annualRate, years }) {
  const monthlyRate = annualRate / 12
  let balance = principal
  let totalContribution = principal
  let totalInterest = 0

  const rows = [
    {
      year: 0,
      endBalance: balance,
      totalContribution,
      totalInterest,
    },
  ]

  for (let year = 1; year <= years; year += 1) {
    for (let m = 0; m < 12; m += 1) {
      const interest = balance * monthlyRate
      totalInterest += interest
      balance += interest
      balance += monthly
      totalContribution += monthly
    }

    rows.push({
      year,
      endBalance: balance,
      totalContribution,
      totalInterest,
    })
  }

  return rows
}

Page({
  schedule: null,

  data: {
    principalText: "10000",
    monthlyText: "1000",
    annualRateText: "3.5",

    errorText: "",
    hasResult: false,

    result10: "-",
    result20: "-",
    result30: "-",
    totalContribution30: "-",
    totalInterest30: "-",

    yearRows: [],
    chartGridLines: [],
    chartXLabels: [],
    chartYLabels: [],
    chartSegmentsBalance: [],
    chartSegmentsContrib: [],
    chartDots: [],
    chartPaddingLeft: 0,
    chartPaddingTop: 0,
    chartPlotW: 0,
    chartPlotH: 0,
  },

  onReady() {
    this.calculate()
  },

  onPrincipalInput(e) {
    this.setData({ principalText: e.detail.value, hasResult: false, errorText: "" })
  },
  onMonthlyInput(e) {
    this.setData({ monthlyText: e.detail.value, hasResult: false, errorText: "" })
  },
  onAnnualRateInput(e) {
    this.setData({ annualRateText: e.detail.value, hasResult: false, errorText: "" })
  },

  reset() {
    this.setData({
      principalText: "",
      monthlyText: "",
      annualRateText: "",
      errorText: "",
      hasResult: false,
      yearRows: [],
      chartGridLines: [],
      chartXLabels: [],
      chartYLabels: [],
      chartSegmentsBalance: [],
      chartSegmentsContrib: [],
      chartDots: [],
      chartPaddingLeft: 0,
      chartPaddingTop: 0,
      chartPlotW: 0,
      chartPlotH: 0,
    })
  },

  calculate() {
    const principal = parseMoney(this.data.principalText)
    const monthly = parseMoney(this.data.monthlyText)
    const annualRatePercent = parseMoney(this.data.annualRateText)

    if (!Number.isFinite(principal) || principal < 0) {
      this.setData({ errorText: "请填写有效的初始金额（>= 0）", hasResult: false })
      return
    }
    if (!Number.isFinite(monthly) || monthly < 0) {
      this.setData({ errorText: "请填写有效的每月定存金额（>= 0）", hasResult: false })
      return
    }
    if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
      this.setData({ errorText: "请填写有效的年化利率（>= 0）", hasResult: false })
      return
    }

    const annualRate = annualRatePercent / 100
    const schedule = computeYearlySchedule({
      principal,
      monthly,
      annualRate,
      years: 30,
    })

    this.schedule = schedule

    const row10 = schedule[10]
    const row20 = schedule[20]
    const row30 = schedule[30]

    const yearRows = schedule.map((r) => ({
      year: r.year,
      endBalanceText: formatMoney(r.endBalance),
      totalContributionText: formatMoney(r.totalContribution),
      totalInterestText: formatMoney(r.totalInterest),
    }))

    this.setData(
      {
        errorText: "",
        hasResult: true,
        result10: formatMoney(row10.endBalance),
        result20: formatMoney(row20.endBalance),
        result30: formatMoney(row30.endBalance),
        totalContribution30: formatMoney(row30.totalContribution),
        totalInterest30: formatMoney(row30.totalInterest),
        yearRows,
      },
      () => {
        this.buildChart(schedule)
      },
    )
  },

  buildChart(schedule) {
    const query = wx.createSelectorQuery().in(this)
    query.select(".chart-wrap").boundingClientRect().exec((res) => {
      const rect = res && res[0]
      if (!rect) return

      const width = rect.width
      const height = rect.height
      const scale = width / 375
      const padding = {
        left: 56 * scale,
        right: 16 * scale,
        top: 18 * scale,
        bottom: 34 * scale,
      }
      const plotW = Math.max(1, width - padding.left - padding.right)
      const plotH = Math.max(1, height - padding.top - padding.bottom)

      const years = schedule.map((r) => r.year)
      const balances = schedule.map((r) => r.endBalance)
      const contributions = schedule.map((r) => r.totalContribution)
      const maxY = Math.max(...balances, ...contributions, 1)

      const xAt = (year) => padding.left + (year / 30) * plotW
      const yAt = (val) => padding.top + (1 - val / maxY) * plotH

      const chartGridLines = []
      for (let i = 0; i <= 4; i += 1) {
        chartGridLines.push({ y: padding.top + (plotH * i) / 4 })
      }

      const chartYLabels = []
      for (let i = 0; i <= 4; i += 1) {
        const ratio = (4 - i) / 4
        const val = maxY * ratio
        const y = padding.top + (plotH * i) / 4
        const text =
          val >= 1e6
            ? `${(val / 1e6).toFixed(1)}M`
            : val >= 1e4
              ? `${(val / 1e4).toFixed(1)}万`
              : `${Math.round(val)}`
        chartYLabels.push({ y, text })
      }

      const chartXLabels = []
      for (let year = 0; year <= 30; year += 5) {
        chartXLabels.push({ x: xAt(year), text: String(year) })
      }

      const buildSegments = (series) => {
        const segments = []
        for (let i = 0; i < series.length - 1; i += 1) {
          const x1 = xAt(years[i])
          const y1 = yAt(series[i])
          const x2 = xAt(years[i + 1])
          const y2 = yAt(series[i + 1])
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.sqrt(dx * dx + dy * dy)
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI
          segments.push({ x: x1, y: y1, len, angle })
        }
        return segments
      }

      const chartSegmentsContrib = buildSegments(contributions)
      const chartSegmentsBalance = buildSegments(balances)

      const chartDots = [
        { x: xAt(30), y: yAt(contributions[30]), type: "contrib" },
        { x: xAt(30), y: yAt(balances[30]), type: "balance" },
      ]

      this.setData({
        chartGridLines,
        chartXLabels,
        chartYLabels,
        chartSegmentsBalance,
        chartSegmentsContrib,
        chartDots,
        chartPaddingLeft: padding.left,
        chartPaddingTop: padding.top,
        chartPlotW: plotW,
        chartPlotH: plotH,
      })
    })
  },
})
