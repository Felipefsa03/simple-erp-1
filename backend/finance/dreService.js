const BASE_DRE = {
  revenue: { services: 120000, products: 15000, other: 5000 },
  cogs: { materials: 18000, lab: 6000, commissions: 24000 },
  operatingExpenses: { payroll: 22000, rent: 8000, admin: 6000, marketing: 4000 },
  taxes: 9000,
};

const withTotals = (dre) => {
  const revenueTotal = dre.revenue.services + dre.revenue.products + dre.revenue.other;
  const cogsTotal = dre.cogs.materials + dre.cogs.lab + dre.cogs.commissions;
  const grossValue = revenueTotal - cogsTotal;
  const operatingTotal = dre.operatingExpenses.payroll + dre.operatingExpenses.rent + dre.operatingExpenses.admin + dre.operatingExpenses.marketing;
  const operatingValue = grossValue - operatingTotal;
  const netValue = operatingValue - dre.taxes;

  const pct = (value) => (revenueTotal > 0 ? Number(((value / revenueTotal) * 100).toFixed(2)) : 0);

  return {
    revenue: { ...dre.revenue, total: revenueTotal },
    cogs: { ...dre.cogs, total: cogsTotal },
    grossProfit: { value: grossValue, margin: pct(grossValue) },
    operatingExpenses: { ...dre.operatingExpenses, total: operatingTotal },
    operatingProfit: { value: operatingValue, margin: pct(operatingValue) },
    netProfit: { value: netValue, margin: pct(netValue) },
  };
};

export function generateDRE(_clinicId, _startDate, _endDate) {
  return withTotals(BASE_DRE);
}

export function getDREComparison(clinicId, currentPeriod, previousPeriod) {
  const current = generateDRE(clinicId, currentPeriod?.start, currentPeriod?.end);
  const previous = generateDRE(clinicId, previousPeriod?.start, previousPeriod?.end);
  const variation = current.netProfit.value - previous.netProfit.value;
  const variationPct = previous.netProfit.value !== 0
    ? Number(((variation / previous.netProfit.value) * 100).toFixed(2))
    : 0;

  return {
    current,
    previous,
    variation: {
      value: variation,
      pct: variationPct,
    },
  };
}
