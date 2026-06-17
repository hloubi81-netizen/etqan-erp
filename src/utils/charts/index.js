import ifrsChart from "./ifrs.json";
import syrianChart from "./syrian.json";

export const CHART_TYPES = {
  IFRS: { name: "المعايير الدولية (IFRS)", file: "ifrs", data: ifrsChart },
  SYRIAN: { name: "الدليل المحاسبي الموحد (سوريا)", file: "syrian", data: syrianChart },
};

export const CHART_OPTIONS = Object.entries(CHART_TYPES).map(([key, value]) => ({
  value: key,
  label: value.name,
}));

export function getChartData(chartType) {
  return CHART_TYPES[chartType]?.data || ifrsChart;
}