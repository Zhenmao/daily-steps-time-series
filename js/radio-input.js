class RadioInput {
  constructor({ el, options, initialValue }) {
    this.el = el;
    this.options = options;
    this.initialValue = initialValue;
    this.render();
  }

  render() {
    const id = this.el.id;
    this.input = d3
      .select(this.el)
      .classed("radio-input-group", true)
      .selectAll(".radio-input")
      .data(this.options)
      .join("div")
      .attr("class", "radio-input");
    this.input
      .append("input")
      .attr("type", "radio")
      .attr("id", (d, i) => `${id}-${i}`)
      .attr("name", id)
      .attr("value", (d) => d.value)
      .attr("checked", (d) =>
        d.value === this.initialValue ? "checked" : null
      );
    this.input
      .append("label")
      .attr("for", (d, i) => `${id}-${i}`)
      .text((d) => d.text);
  }
}
