// Load dữ liệu từ CSV
d3.csv("data.csv").then(function(data) {
  data.forEach(d => d.Thành_tiền = +d.Thành_tiền);

  // Gom nhóm theo Mặt hàng
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Thành_tiền),
    d => d["Tên mặt hàng"],
    d => d["Tên nhóm hàng"]
  );

  // Chuyển thành mảng dễ vẽ
  const chartData = grouped.map(([tenMatHang, values]) => {
    let total = 0, nhom = "";
    values.forEach(([nhomHang, sum]) => {
      total += sum;
      nhom = nhomHang;
    });
    return { tenMatHang, nhom, total };
  });

  chartData.sort((a,b) => d3.descending(a.total, b.total));

  // Cấu hình chart
  const svg = d3.select("#chart");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top:40, right:200, bottom:40, left:250};

  const x = d3.scaleLinear()
              .domain([0, d3.max(chartData, d => d.total)])
              .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
              .domain(chartData.map(d => d.tenMatHang))
              .range([margin.top, height - margin.bottom])
              .padding(0.2);

  const color = d3.scaleOrdinal()
                  .domain(chartData.map(d => d.nhom))
                  .range(["#00BFA6","#FF6B6B","#4ECDC4","#FFD93D","#95A5A6"]);

  // Vẽ cột
  svg.selectAll(".bar")
     .data(chartData)
     .join("rect")
     .attr("class", "bar")
     .attr("x", margin.left)
     .attr("y", d => y(d.tenMatHang))
     .attr("width", d => x(d.total) - margin.left)
     .attr("height", y.bandwidth())
     .attr("fill", d => color(d.nhom));

  // Label giá trị
  svg.selectAll(".label")
     .data(chartData)
     .join("text")
     .attr("class", "label")
     .attr("x", d => x(d.total) - 5)
     .attr("y", d => y(d.tenMatHang) + y.bandwidth()/1.5)
     .text(d => d3.format(",.0f")(d.total) + " VND");

  // Trục
  svg.append("g")
     .attr("transform", `translate(0,${margin.top})`)
     .call(d3.axisTop(x).ticks(5));

  svg.append("g")
     .attr("transform", `translate(${margin.left},0)`)
     .call(d3.axisLeft(y));

  // Chú giải (legend)
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 20},${margin.top})`);

  const groups = Array.from(new Set(chartData.map(d => d.nhom)));
  groups.forEach((g,i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i*25)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(g));
    legend.append("text")
      .attr("x", 20)
      .attr("y", i*25 + 12)
      .text(g);
  });
});
