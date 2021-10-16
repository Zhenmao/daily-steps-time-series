class FacetedBarcodeChart {
  constructor({ el, data, xFacet, yFacet, colorBy, color, facetOptions }) {
    this.el = el;
    this.data = data;
    this.xFacet = xFacet;
    this.yFacet = yFacet;
    this.colorBy = colorBy;
    this.color = color;
    this.facetOptions = facetOptions;
    this.resize = this.resize.bind(this);
    this.init();
  }

  init() {
    this.margin = {
      right: 8,
      bottom: 48,
    };
    this.barcodeHeight = 32;
    this.xGap = 16;
    this.yGap = 4;

    this.xGrid = d3.scaleBand();
    this.yGrid = d3.scaleBand();
    this.x = d3.scaleLinear();

    this.container = d3.select(this.el).classed("faceted-barcode-chart", true);
    this.svg = this.container.append("svg");

    this.gXGridAxis = this.svg.append("g").attr("class", "axis axis--x");
    this.gYGridAxis = this.svg.append("g").attr("class", "axis axis--y");
    this.gXAxis = this.svg.append("g").attr("class", "axis axis--x");
    this.gGrid = this.svg.append("g");

    this.resize();
    window.addEventListener("resize", this.resize);
    this.wrangle();
  }

  resize() {
    this.width = this.el.clientWidth;
    this.tickVersion = this.width <= 600 ? "short" : "full";

    if (this.displayData) {
      this.xGrid.range([this.margin.left, this.width - this.margin.right]);
      this.x.range([0, this.xGrid.bandwidth()]);
      this.render();
    }
  }

  wrangle() {
    this.xFacetOption = this.facetOptions[this.xFacet];
    this.yFacetOption = this.facetOptions[this.yFacet];

    this.margin.top = this.xFacetOption.margin.top;
    this.margin.left = this.yFacetOption.margin.left;

    const xGridDomain = this.xFacetOption.domain;
    const yGridDomain = this.yFacetOption.domain;

    this.boundedHeight =
      yGridDomain.length * (this.barcodeHeight + this.yGap) - this.yGap;
    this.height = this.boundedHeight + this.margin.top + this.margin.bottom;
    this.boundedWidth = this.width - this.margin.left - this.margin.right;
    const xGridStep = (this.boundedWidth + this.xGap) / xGridDomain.length;

    this.xGrid
      .domain(xGridDomain)
      .range([this.margin.left, this.width - this.margin.right])
      .paddingInner(this.xGap / xGridStep);
    this.x.range([0, this.xGrid.bandwidth()]);
    this.yGrid
      .domain(yGridDomain)
      .range([this.margin.top, this.height - this.margin.bottom])
      .paddingInner(this.yGap / (this.barcodeHeight + this.yGap));

    if (!this.displayData) {
      const values = this.data.map((d) => d.value);
      this.x.domain(d3.extent(values));
    }

    this.displayData = Array.from(
      d3.group(
        this.data,
        (d) => `${d[this.xFacet] || "none"}|${d[this.yFacet] || "none"}`
      ),
      ([key, value]) => {
        const [x, y] = key.split("|");
        const values = value.map((d) => d.value);
        let colorByValue;
        switch (this.colorBy) {
          case "mean":
            colorByValue = d3.mean(values);
            break;
          case "min":
            colorByValue = d3.min(values);
            break;
          case "p25":
            colorByValue = d3.quantile(values, 0.25);
            break;
          case "median":
            colorByValue = d3.median(values);
            break;
          case "p75":
            colorByValue = d3.quantile(values, 0.75);
            break;
          case "max":
            colorByValue = d3.max(values);
            break;
          default:
            break;
        }
        return {
          x,
          y,
          values,
          colorByValue,
        };
      }
    );

    this.render();
  }

  render() {
    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.renderXGridAxis();
    this.renderYGridAxis();
    this.renderXAxis();
    this.renderGrid();
  }

  renderXGridAxis() {
    this.gXGridAxis
      .attr("transform", `translate(0,${this.margin.top})`)
      .call(
        d3
          .axisTop(this.xGrid)
          .tickFormat((d, i) => this.xFacetOption.ticks[this.tickVersion][i])
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove());
  }

  renderYGridAxis() {
    this.gYGridAxis
      .attr("transform", `translate(${this.margin.left},0)`)
      .call(d3.axisLeft(this.yGrid))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove());
  }

  renderXAxis() {
    this.gXAxis
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`)
      .selectAll(".axis.axis--x")
      .data(this.xGrid.domain(), (d) => d)
      .join("g")
      .attr("class", "axis axis--x")
      .attr("transform", (d) => `translate(${this.xGrid(d)},0)`)
      .call(d3.axisBottom(this.x).ticks(this.xGrid.bandwidth() / 50))
      .call((g) => g.select(".domain").remove());
  }

  renderGrid() {
    this.gGrid
      .selectAll(".grid")
      .data(this.displayData, (d) => `${d.x}|${d.y}`)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "grid")
          .call((g) =>
            g
              .append("rect")
              .attr("stroke", "currentColor")
              .attr("fill-opacity", 0.4)
              .attr("height", this.barcodeHeight)
          )
          .call((g) => g.append("g"))
      )
      .attr(
        "transform",
        (d) => `translate(${this.xGrid(d.x)},${this.yGrid(d.y)})`
      )
      .call((g) =>
        g
          .selectChild("rect")
          .attr("fill", (d) => this.color(d.colorByValue))
          .attr("width", this.xGrid.bandwidth)
      )
      .selectChild("g")
      .selectAll("line")
      .data((d) => d.values)
      .join((enter) =>
        enter
          .append("line")
          .attr("stroke", "currentColor")
          .attr("y2", this.barcodeHeight)
      )
      .attr("transform", (d) => `translate(${this.x(d)},0)`);
  }

  updateXFacet(xFacet) {
    this.xFacet = xFacet;
    this.wrangle();
  }

  updateYFacet(yFacet) {
    this.yFacet = yFacet;
    this.wrangle();
  }

  updateColorBy(colorBy) {
    this.colorBy = colorBy;
    this.wrangle();
  }
}
