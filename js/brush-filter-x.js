class BrushFilterX {
  constructor({ el, extent }) {
    this.el = el;
    this.extent = extent;
    this.resize = this.resize.bind(this);
    this.brushed = this.brushed.bind(this);
    this.brushResizePath = this.brushResizePath.bind(this);
    this.init();
  }

  init() {
    this.margin = {
      top: 8,
      right: 16,
      bottom: 24,
      left: 48,
    };
    this.height = 56;
    this.boundedHeight = this.height - this.margin.top - this.margin.bottom;
    this.handleHeight = this.boundedHeight * 0.8;

    this.x = d3.scaleUtc().domain(this.extent);

    this.brush = d3.brushX().on("brush end", this.brushed);

    this.container = d3.select(this.el).classed("brush-filter-x", true);
    this.svg = this.container.append("svg");
    this.gAxis = this.svg
      .append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`);
    this.gBrush = this.svg.append("g").attr("class", "brush");
    this.handle = this.gBrush
      .selectAll(".handle--custom")
      .data([{ type: "w" }, { type: "e" }])
      .enter()
      .append("path")
      .attr("class", "handle--custom")
      .attr("stroke", "currentColor")
      .attr("cursor", "ew-resize")
      .attr("d", this.brushResizePath);

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  resize() {
    this.width = this.el.clientWidth;

    this.x.range([this.margin.left, this.width - this.margin.right]);

    this.brush.extent([
      [this.margin.left, this.margin.top],
      [this.width - this.margin.right, this.height - this.margin.bottom],
    ]);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    this.gBrush.call(this.brush);
    this.render();

    if (this.selectionExtent) {
      this.gBrush.call(this.brush.move, this.selectionExtent.map(this.x));
    }
  }

  render() {
    this.gAxis.call(
      d3
        .axisBottom(this.x)
        .ticks((this.width - this.margin.left - this.margin.right) / 64)
    );
  }

  brushed({ selection, sourceEvent }) {
    this.handle.attr(
      "transform",
      (d, i) =>
        `translate(${selection[i]},${
          this.margin.top -
          this.handleHeight +
          (this.boundedHeight - this.handleHeight) / 2
        })`
    );
    if (!sourceEvent) return;
    if (selection === null) selection = this.x.range();
    this.selectionExtent = selection.map(this.x.invert);
    this.gBrush.call(this.brush.move, selection);
    this.el.dispatchEvent(
      new CustomEvent("change", { bubbles: true, detail: this.selectionExtent })
    );
  }

  // https://github.com/crossfilter/crossfilter/blob/gh-pages/index.html#L466
  brushResizePath(d) {
    let e = +(d.type == "e"),
      x = e ? 1 : -1,
      y = this.handleHeight;
    return `
      M ${0.5 * x},${y} 
      A6,6 0 0 ${e} ${6.5 * x},${y + 6} 
      V${2 * y - 6} 
      A6,6 0 0 ${e} ${0.5 * x},${2 * y} 
      Z 
      M${2.5 * x},${y + 8} 
      V${2 * y - 8} 
      M${4.5 * x},${y + 8} 
      V${2 * y - 8}`;
  }

  updateSelectionExtent(selectionExtent) {
    this.selectionExtent = selectionExtent;
    this.gBrush.call(this.brush.move, this.selectionExtent.map(this.x));
  }
}
