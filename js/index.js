d3.json("data/steps.json").then((data) => {
  // Process data
  const parseDate = d3.utcParse("%Y-%m-%d");
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const weekends = ["Weekday", "Weekend"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const quarters = [
    "Q1: Jan - Mar",
    "Q2: Apr - Jun",
    "Q3: Jul - Sep",
    "Q4: Oct - Dec",
  ];
  data.forEach((d) => {
    d.date = parseDate(d.date);
    let dayIndex = d.date.getUTCDay() - 1;
    if (dayIndex === -1) dayIndex = 6;
    d.day = weekdays[dayIndex];
    d.weekend = dayIndex >= 5 ? weekends[1] : weekends[0];
    const monthIndex = d.date.getUTCMonth();
    d.month = months[monthIndex];
    d.quarter =
      monthIndex < 3
        ? quarters[0]
        : monthIndex < 6
        ? quarters[1]
        : monthIndex < 9
        ? quarters[2]
        : quarters[3];
  });

  // Filtering and smoothing
  const selectionExtent = [data[0].date, data[data.length - 1].date];

  const brushFilterXEl = document.getElementById("brush-filter-x");
  const brushFilterX = new BrushFilterX({
    el: brushFilterXEl,
    extent: selectionExtent,
  });
  brushFilterXEl.addEventListener("change", (event) => {
    dailyMovingAverageLineChart.updateSelectionExtent(event.detail);
    weeklyMovingAverageLineChart.updateSelectionExtent(event.detail);
    monthlyMovingAverageLineChart.updateSelectionExtent(event.detail);
  });

  const dailyMovingAverageEl = document.getElementById("daily-moving-average");
  const dailyMovingAverageLineChart = new MovingAverageLineChart({
    el: dailyMovingAverageEl,
    data,
    windowSize: 1,
  });
  dailyMovingAverageEl.addEventListener("change", (event) => {
    brushFilterX.updateSelectionExtent(event.detail);
    weeklyMovingAverageLineChart.updateSelectionExtent(event.detail);
    monthlyMovingAverageLineChart.updateSelectionExtent(event.detail);
  });

  const weeklyMovingAverageEl = document.getElementById(
    "weekly-moving-average"
  );
  const weeklyMovingAverageLineChart = new MovingAverageLineChart({
    el: weeklyMovingAverageEl,
    data,
    windowSize: 7,
  });
  weeklyMovingAverageEl.addEventListener("change", (event) => {
    brushFilterX.updateSelectionExtent(event.detail);
    dailyMovingAverageLineChart.updateSelectionExtent(event.detail);
    monthlyMovingAverageLineChart.updateSelectionExtent(event.detail);
  });

  const monthlyMovingAverageEl = document.getElementById(
    "monthly-moving-average"
  );
  const monthlyMovingAverageLineChart = new MovingAverageLineChart({
    el: monthlyMovingAverageEl,
    data,
    windowSize: 28,
  });
  monthlyMovingAverageEl.addEventListener("change", (event) => {
    brushFilterX.updateSelectionExtent(event.detail);
    dailyMovingAverageLineChart.updateSelectionExtent(event.detail);
    weeklyMovingAverageLineChart.updateSelectionExtent(event.detail);
  });

  brushFilterX.updateSelectionExtent(selectionExtent);
  dailyMovingAverageLineChart.updateSelectionExtent(selectionExtent);
  weeklyMovingAverageLineChart.updateSelectionExtent(selectionExtent);
  monthlyMovingAverageLineChart.updateSelectionExtent(selectionExtent);

  // Seasonal patterns
  const facets = [
    { text: "None", value: "none" },
    { text: "Day", value: "day" },
    { text: "Weekend", value: "weekend" },
    { text: "Month", value: "month" },
    { text: "Quarter", value: "quarter" },
  ];
  const colorBys = [
    { text: "Mean", value: "mean" },
    { text: "Minimum", value: "min" },
    { text: "25th percentile", value: "p25" },
    { text: "Median (50th percentile)", value: "median" },
    { text: "75th percentile", value: "p75" },
    { text: "Maximum", value: "max" },
  ];
  let xFacet = "day";
  let yFacet = "month";
  let colorBy = "mean";
  const xFacetInput = document.getElementById("x-facet");
  xFacetInput.addEventListener("change", (event) => {
    xFacet = event.target.value;
    facetedBarcodeChart.updateXFacet(xFacet);
  });
  const yFacetInput = document.getElementById("y-facet");
  yFacetInput.addEventListener("change", (event) => {
    yFacet = event.target.value;
    facetedBarcodeChart.updateYFacet(yFacet);
  });
  const colorByInput = document.getElementById("color-by");
  colorByInput.addEventListener("change", (event) => {
    colorBy = event.target.value;
    facetedBarcodeChart.updateColorBy(colorBy);
  });
  new RadioInput({
    el: xFacetInput,
    options: facets,
    initialValue: xFacet,
  });
  new RadioInput({
    el: yFacetInput,
    options: facets,
    initialValue: yFacet,
  });
  new RadioInput({
    el: colorByInput,
    options: colorBys,
    initialValue: colorBy,
  });

  const values = data.map((d) => d.value);
  const colorBarcodeChart = d3
    .scaleSequential()
    .domain([d3.quantile(values, 0.05), d3.quantile(values, 0.95)])
    .interpolator((t) => d3.interpolatePlasma(1 - t))
    .clamp(true);

  colorLegend(document.getElementById("color-legend"), colorBarcodeChart, {
    title: "STEPS",
    height: 56,
  });

  const facetedBarcodeChart = new FacetedBarcodeChart({
    el: document.getElementById("faceted-barcode-chart"),
    data,
    xFacet,
    yFacet,
    colorBy,
    color: colorBarcodeChart,
    facetOptions: {
      none: {
        margin: {
          left: 8,
          top: 8,
        },
        domain: ["none"],
        ticks: {
          full: "",
          short: "",
        },
      },
      day: {
        margin: {
          left: 80,
          top: 24,
        },
        domain: weekdays,
        ticks: {
          full: weekdays,
          short: weekdays.map((d) => d[0]),
        },
      },
      weekend: {
        margin: {
          left: 80,
          top: 24,
        },
        domain: weekends,
        ticks: {
          full: weekends,
          short: weekends,
        },
      },
      month: {
        margin: {
          left: 80,
          top: 24,
        },
        domain: months,
        ticks: {
          full: months,
          short: months.map((d) => d[0]),
        },
      },
      quarter: {
        margin: {
          left: 80,
          top: 24,
        },
        domain: quarters,
        ticks: {
          full: quarters,
          short: quarters.map((d) => d.slice(0, 2)),
        },
      },
    },
  });
});
