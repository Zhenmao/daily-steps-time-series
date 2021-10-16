class MovingAverageLineChart {
  constructor({ el, data, windowSize }) {
    this.el = el;
    this.data = data;
    this.windowSize = windowSize;
    this.resize = this.resize.bind(this);
    this.zoomed = this.zoomed.bind(this);
    this.init();
  }

  init() {
    this.margin = {
      top: 24,
      right: 16,
      bottom: 24,
      left: 48,
    };
    this.height = 200;

    this.x = d3.scaleUtc();
    this.x2 = d3.scaleUtc();
    this.y = d3
      .scaleLinear()
      .range([this.height - this.margin.bottom, this.margin.top]);
    this.line = d3
      .line()
      .defined((d) => !isNaN(d))
      .x((d, i) => this.x(this.displayData.dates[i]))
      .y((d) => this.y(d));
    this.zoom = d3.zoom().scaleExtent([1, Infinity]).on("zoom", this.zoomed);

    this.container = d3
      .select(this.el)
      .classed("moving-average-line-chart", true);
    this.svg = this.container.append("svg");
    this.defs = this.svg.append("defs");
    this.g = this.svg.append("g").attr("clip-path", `url(#${this.el.id}-clip)`);
    this.gXAxis = this.svg
      .append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`);
    this.gYAxis = this.svg
      .append("g")
      .attr("class", "axis axis--y")
      .attr("transform", `translate(${this.margin.left},0)`);
    this.capture = this.svg
      .append("rect")
      .attr("fill", "none")
      .attr("pointer-events", "all");

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  resize() {
    this.width = this.el.clientWidth;
    this.boundedWidth = this.width - this.margin.left - this.margin.right;

    this.x.range([this.margin.left, this.width - this.margin.right]);
    this.x2.range([this.margin.left, this.width - this.margin.right]);

    this.zoom
      .translateExtent([
        [this.margin.left, this.margin.top],
        [this.width - this.margin.right, this.height - this.margin.bottom],
      ])
      .extent([
        [this.margin.left, this.margin.top],
        [this.width - this.margin.right, this.height - this.margin.bottom],
      ]);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    this.capture.call(this.zoom);

    if (this.displayData) {
      this.render();
    }
  }

  wrangle() {
    const filtered = this.data.filter(
      (d) =>
        d.date >= this.selectionExtent[0] && d.date <= this.selectionExtent[1]
    );
    const dates = filtered.map((d) => d.date);
    const values = this.movingAverage(
      filtered.map((d) => d.value),
      this.windowSize
    );

    this.x.domain(this.selectionExtent);

    if (!this.displayData) {
      this.x2.domain(this.selectionExtent);
      this.y.domain(d3.extent(this.data, (d) => d.value)).nice();
    }

    this.displayData = {
      dates,
      values,
    };

    this.render();
  }

  // https://observablehq.com/@d3/moving-average#movingAverage
  movingAverage(values, N) {
    let i = 0;
    let sum = 0;
    const means = new Float64Array(values.length).fill(NaN);
    for (let n = Math.min(N - 1, values.length); i < n; ++i) {
      sum += values[i];
    }
    for (let n = values.length; i < n; ++i) {
      sum += values[i];
      means[i] = sum / N;
      sum -= values[i - N + 1];
    }
    return means;
  }

  render() {
    this.renderClip();
    this.renderCapture();
    this.renderXAxis();
    this.renderYAxis();
    this.renderLine();
  }

  renderClip() {
    this.defs
      .selectAll("clipPath")
      .data([0])
      .join((enter) =>
        enter
          .append("clipPath")
          .attr("id", `${this.el.id}-clip`)
          .call((clipPath) =>
            clipPath
              .append("rect")
              .attr("x", this.margin.left)
              .attr("y", this.margin.top)
              .attr(
                "height",
                this.height - this.margin.top - this.margin.bottom
              )
          )
      )
      .select("rect")
      .attr("width", this.width - this.margin.left - this.margin.right);
  }

  renderCapture() {
    this.capture
      .attr("x", this.margin.left)
      .attr("y", this.margin.top)
      .attr("width", this.width - this.margin.left - this.margin.right)
      .attr("height", this.height - this.margin.top - this.margin.bottom);
  }

  renderXAxis() {
    this.gXAxis.call(
      d3
        .axisBottom(this.x)
        .ticks((this.width - this.margin.left - this.margin.right) / 64)
    );
  }

  renderYAxis() {
    this.gYAxis
      .call(
        d3
          .axisLeft(this.y)
          .ticks((this.height - this.margin.top - this.margin.bottom) / 40)
      )
      .selectAll(".axis-title")
      .data(["↑ Steps"])
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "axis-title")
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .attr("x", -this.margin.left)
          .attr("y", this.margin.top - 8)
          .text((d) => d)
      );
  }

  renderLine() {
    this.g
      .selectAll("path")
      .data([this.displayData.values])
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "moving-average-line")
          .attr("fill", "none")
          .attr("stroke", "currentColor")
      )
      .attr("d", this.line);
  }

  zoomed({ transform, sourceEvent }) {
    if (!sourceEvent) return;
    this.selectionExtent = transform.rescaleX(this.x2).domain();
    this.x.domain(this.selectionExtent);
    this.wrangle();
    this.el.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.selectionExtent,
      })
    );
  }

  updateSelectionExtent(selectionExtent) {
    this.selectionExtent = selectionExtent;
    this.wrangle();
    const selection = selectionExtent.map(this.x2);
    const k = this.boundedWidth / (selection[1] - selection[0]);
    const x = this.margin.left / k - selection[0];
    this.capture.call(
      this.zoom.transform,
      d3.zoomIdentity.scale(k).translate(x, 0)
    );
  }
}
