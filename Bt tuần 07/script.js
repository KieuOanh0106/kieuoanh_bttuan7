// Hàm format tiền
function formatMoney(value) {
  if (value >= 1000000) {
    return Math.round(value / 1000000) + " triệu VND";
  }
  return Math.round(value) + " VND";
}

// Hàm vẽ biểu đồ cột ngang chung
function drawBarChart(options) {
  const { selector, data, yField, xAxisFormat, labelLogic, colorScale } = options;

  const svg = d3.select(selector);
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 200, bottom: 40, left: 250 };

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total)])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(data.map(d => d[yField]))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  // Grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x)
      .ticks(5)
      .tickSize(-(height - margin.top - margin.bottom))
      .tickFormat("")
    );

  // Bars
  svg.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", margin.left)
    .attr("y", d => y(d[yField]))
    .attr("width", d => x(d.total) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", d => colorScale(d.nhom));

  // Labels
  labelLogic(svg, data, x, y, margin);

  // X-Axis
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(xAxisFormat));

  // Y-Axis
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));
}

// Hàm vẽ biểu đồ cột đứng chung
function drawVerticalBarChart(options) {
  const { selector, data, xField, yField, xAxisFormat, yAxisFormat, labelLogic, colorScale, padding = 0.1 } = options;

  const svg = d3.select(selector);
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 60, right: 40, bottom: 40, left: 60 };

  const x = d3.scaleBand()
    .domain(data.map(d => d[xField]))
    .range([margin.left, width - margin.right])
    .padding(padding);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d[yField])])
    .range([height - margin.bottom, margin.top]);

  // Grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y)
      .ticks(5)
      .tickSize(-(width - margin.left - margin.right))
      .tickFormat("")
    );

  // Bars
  svg.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[xField]))
    .attr("y", d => y(d[yField]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d[yField]))
    .attr("fill", d => colorScale(d[xField]));

  // Labels
  if (labelLogic) {
    labelLogic(svg, data, x, y, margin);
  }

  // X-Axis
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  // Y-Axis
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(yAxisFormat));
}

// Hàm xử lý label cho biểu đồ cột đứng với format tiền
function createMoneyLabelLogic(xField = "month") {
  return (svg, data, x, y, margin) => {
    svg.selectAll(".label")
      .data(data)
      .join("text")
      .attr("class", "label")
      .style("fill", "white")
      .style("text-anchor", "middle")
      .attr("x", d => x(d[xField]) + x.bandwidth() / 2)
      .attr("y", d => y(d.total) + 20)
      .each(function(d) {
        const el = d3.select(this);
        const availableWidth = x.bandwidth() - 10; // Để lại padding 5px mỗi bên
        
        let numberText;
        let unit = " VND";
        if (d.total >= 1000000) {
          numberText = (d.total / 1000000).toFixed(1);
          unit = " triệu VND";
        } else if (d.total >= 1000) {
          numberText = (d.total / 1000).toFixed(1);
          unit = "K";
        } else {
          numberText = d.total.toFixed(0);
          unit = " TR";
        }

        el.text(numberText + unit);

        // Nếu text quá dài, cắt bớt đơn vị và thêm dấu ...
        let textWidth = el.node().getComputedTextLength();
        while (textWidth > availableWidth && unit.length > 0) {
          unit = unit.slice(0, -1);
          el.text(numberText + unit + (unit.length > 0 ? "..." : ""));
          textWidth = el.node().getComputedTextLength();
        }

        // Nếu ngay cả số cũng không vừa, chỉ hiển thị số
        if (textWidth > availableWidth) {
          el.text(numberText);
        }
      });
  };
}


// Load dữ liệu từ CSV
d3.dsv(";", "data.csv").then(function(data) {
  data.forEach(d => d["Thành tiền"] = +d["Thành tiền"]);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d["Tên nhóm hàng"]))
    .range(["#00BFA6", "#FF6B6B", "#4ECDC4", "#FFD93D", "#95A5A6"]);

  // ==================================================================
  // Biểu đồ 1: Doanh số theo Mặt hàng
  // ==================================================================
  const chartData = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => `[${d["Mã mặt hàng"]}] ${d["Tên mặt hàng"]}`,
    d => d["Tên nhóm hàng"]
  ).map(([tenMatHang, values]) => {
    let total = 0, nhom = "";
    values.forEach(([nhomHang, sum]) => {
      total += sum;
      nhom = nhomHang;
    });
    return { tenMatHang, nhom, total };
  });
  chartData.sort((a, b) => d3.descending(a.total, b.total));

  drawBarChart({
    selector: "#chart",
    data: chartData,
    yField: "tenMatHang",
    colorScale: color,
    xAxisFormat: d3.format("~s"),
    labelLogic: (svg, data, x, y, margin) => {
      svg.selectAll(".label")
        .data(data)
        .join("text")
        .attr("class", "label")
        .attr("x", d => x(d.total) - 5)
        .attr("y", d => y(d.tenMatHang) + y.bandwidth() / 1.5)
        .each(function(d) {
          const el = d3.select(this);
          const availableWidth = x(d.total) - margin.left - 10;
          const formattedText = formatMoney(d.total);
          el.text(formattedText);
          if (el.node().getComputedTextLength() > availableWidth) {
            el.text("");
          }
        });
    }
  });

  // Chú giải (legend) - specific to the first chart
  const legend = d3.select("#chart").append("g")
    .attr("transform", `translate(${+d3.select("#chart").attr("width") - 200 + 20}, 40)`);
  const groups = Array.from(new Set(chartData.map(d => d.nhom)));
  groups.forEach((g, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 25)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(g));
    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 25 + 12)
      .text(g);
  });


  // ==================================================================
  // Biểu đồ 2: Doanh số theo Nhóm hàng
  // ==================================================================
  const groupChartData = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`
  ).map(([nhom, total]) => ({ nhom, total, tenMatHang: nhom })); // Add alias for yField
  groupChartData.sort((a, b) => d3.descending(a.total, b.total));

  drawBarChart({
    selector: "#chart-group",
    data: groupChartData,
    yField: "nhom",
    colorScale: color,
    xAxisFormat: value => (value / 1000000) + "M",
    labelLogic: (svg, data, x, y) => {
      svg.selectAll(".label-group")
        .data(data)
        .join("text")
        .attr("class", "label")
        .attr("x", d => x(d.total) - 5)
        .attr("y", d => y(d.nhom) + y.bandwidth() / 1.5)
        .text(d => formatMoney(d.total));
    }
  });

  // ==================================================================
  // Biểu đồ 3: Doanh số theo Tháng
  // ==================================================================
  const monthData = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => d3.timeFormat("%m")(d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]))
  ).map(([month, total]) => ({ month: `Tháng ${month}`, total }));

  monthData.sort((a, b) => a.month.localeCompare(b.month, undefined, { numeric: true }));

  const color3 = d3.scaleOrdinal(d3.schemeTableau10).domain(monthData.map(d => d.month));

  drawVerticalBarChart({
    selector: "#chart-month",
    data: monthData,
    xField: "month",
    yField: "total",
    colorScale: color3,
    padding: 0.1,
    yAxisFormat: d3.format("~s"),
    labelLogic: createMoneyLabelLogic("month")
  });

  // ==================================================================
  // Biểu đồ 4: Doanh số trung bình theo Ngày trong tuần
  // ==================================================================
  
  // Tạo mapping từ số ngày sang tên ngày
  const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  
  // Bước 1: Gom nhóm theo ngày (date) và tính tổng doanh số cho mỗi ngày
  const dailyData = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => {
      const date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
      return d3.timeFormat("%Y-%m-%d")(date); // Lấy ngày (YYYY-MM-DD)
    }
  ).map(([dateStr, total]) => {
    const date = d3.timeParse("%Y-%m-%d")(dateStr);
    return {
      date: dateStr,
      dayOfWeek: date.getDay(), // 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
      total: total
    };
  });

  // Bước 2: Gom nhóm theo ngày trong tuần và tính trung bình
  const weekdayData = d3.rollups(
    dailyData,
    v => {
      const totalRevenue = d3.sum(v, d => d.total);
      const dayCount = v.length; // Số ngày có dữ liệu cho ngày trong tuần này
      return {
        total: totalRevenue,
        dayCount: dayCount,
        average: totalRevenue / dayCount // Trung bình = Tổng doanh số / Số ngày
      };
    },
    d => d.dayOfWeek
  ).map(([dayNumber, stats]) => ({
    dayNumber: dayNumber,
    dayName: dayNames[dayNumber],
    total: stats.average, // Sử dụng giá trị trung bình
    dayCount: stats.dayCount
  }));

  // Sắp xếp theo thứ tự ngày trong tuần (Thứ Hai đến Chủ Nhật)
  weekdayData.sort((a, b) => {
    // Chuyển đổi: 0 (Chủ Nhật) thành 7 để đặt cuối cùng
    const dayA = a.dayNumber === 0 ? 7 : a.dayNumber;
    const dayB = b.dayNumber === 0 ? 7 : b.dayNumber;
    return dayA - dayB;
  });

  const weekdayAverageData = weekdayData;

  const color4 = d3.scaleOrdinal(d3.schemeTableau10).domain(weekdayAverageData.map(d => d.dayName));

  drawVerticalBarChart({
    selector: "#chart-weekday",
    data: weekdayAverageData,
    xField: "dayName",
    yField: "total",
    colorScale: color4,
    padding: 0.1,
    yAxisFormat: d3.format("~s"),
    labelLogic: createMoneyLabelLogic("dayName")
  });

  // ==================================================================
  // Biểu đồ 5: Doanh số trung bình theo Ngày trong tháng
  // ==================================================================
  
  // Bước 1: Gom nhóm theo ngày (date) và tính tổng doanh số cho mỗi ngày
  const dailyDataForMonth = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => {
      const date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
      return d3.timeFormat("%Y-%m-%d")(date); // Lấy ngày (YYYY-MM-DD)
    }
  ).map(([dateStr, total]) => {
    const date = d3.timeParse("%Y-%m-%d")(dateStr);
    return {
      date: dateStr,
      dayOfMonth: date.getDate(), // Lấy ngày trong tháng (1-31)
      total: total
    };
  });

  // Bước 2: Gom nhóm theo ngày trong tháng và tính trung bình
  const dayOfMonthData = d3.rollups(
    dailyDataForMonth,
    v => {
      const totalRevenue = d3.sum(v, d => d.total);
      const dayCount = v.length; // Số ngày có dữ liệu cho ngày trong tháng này
      return {
        total: totalRevenue,
        dayCount: dayCount,
        average: totalRevenue / dayCount // Trung bình = Tổng doanh số / Số ngày
      };
    },
    d => d.dayOfMonth
  ).map(([dayNumber, stats]) => ({
    dayNumber: dayNumber,
    dayName: `Ngày${dayNumber.toString().padStart(2, '0')}`, // Format: "Ngày 01", "Ngày 02", ...
    total: stats.average, // Sử dụng giá trị trung bình
    dayCount: stats.dayCount
  }));

  // Sắp xếp theo thứ tự ngày trong tháng (1-31)
  dayOfMonthData.sort((a, b) => a.dayNumber - b.dayNumber);

  const color5 = d3.scaleOrdinal(d3.schemeTableau10).domain(dayOfMonthData.map(d => d.dayName));

  drawVerticalBarChart({
    selector: "#chart-day-month",
    data: dayOfMonthData,
    xField: "dayName",
    yField: "total",
    colorScale: color5,
    padding: 0.1,
    yAxisFormat: d3.format("~s"),
    labelLogic: createMoneyLabelLogic("dayName")
  });

  // ==================================================================
  // Biểu đồ 6: Doanh số trung bình theo Khung giờ
  // ==================================================================
  
  // Bước 1: Gom nhóm theo giờ và ngày, tính tổng doanh số cho mỗi giờ-ngày
  const hourlyDailyData = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => {
      const date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
      const hour = d3.timeFormat("%H")(date); // Lấy giờ (00-23)
      const day = d3.timeFormat("%Y-%m-%d")(date); // Lấy ngày
      return `${hour}-${day}`; // Key: "08-2024-01-15"
    }
  ).map(([key, total]) => {
    const [hour, day] = key.split('-');
    return {
      hour: parseInt(hour), // Chuyển thành số
      day: day,
      total: total
    };
  });

  // Bước 2: Gom nhóm theo giờ và tính trung bình
  const hourlyData = d3.rollups(
    hourlyDailyData,
    v => {
      const totalRevenue = d3.sum(v, d => d.total);
      const dayCount = v.length; // Số ngày có dữ liệu cho giờ này
      return {
        total: totalRevenue,
        dayCount: dayCount,
        average: totalRevenue / dayCount // Trung bình = Tổng doanh số / Số ngày
      };
    },
    d => d.hour
  ).map(([hour, stats]) => ({
    hour: hour,
    hourRange: `${hour.toString().padStart(2, '0')}-00:${hour.toString().padStart(2, '0')}-59`, // Format: "08-00:08-59"
    total: stats.average, // Sử dụng giá trị trung bình
    dayCount: stats.dayCount
  }));

  // Sắp xếp theo thứ tự giờ (0-23)
  hourlyData.sort((a, b) => a.hour - b.hour);

  const color6 = d3.scaleOrdinal(d3.schemeTableau10).domain(hourlyData.map(d => d.hourRange));

  drawVerticalBarChart({
    selector: "#chart-hourly",
    data: hourlyData,
    xField: "hourRange",
    yField: "total",
    colorScale: color6,
    padding: 0.1,
    yAxisFormat: d3.format("~s"),
    labelLogic: createMoneyLabelLogic("hourRange")
  });

  // ==================================================================
  // Biểu đồ 7: Xác suất bán hàng theo Nhóm hàng
  // ==================================================================
  
  // Bước 1: Tính tổng số đơn hàng (total_bill)
  const totalBills = new Set(data.map(d => d["Mã đơn hàng"])).size;
  
  // Bước 2: Đếm số đơn hàng theo nhóm hàng (cat_bill)
  // Tạo map để lưu trữ các đơn hàng unique cho mỗi nhóm hàng
  const categoryBillMap = new Map();
  
  data.forEach(d => {
    const maNhom = d["Mã nhóm hàng"];
    const tenNhom = d["Tên nhóm hàng"];
    const maDon = d["Mã đơn hàng"];
    
    if (!categoryBillMap.has(maNhom)) {
      categoryBillMap.set(maNhom, {
        maNhom: maNhom,
        tenNhom: tenNhom,
        bills: new Set()
      });
    }
    
    categoryBillMap.get(maNhom).bills.add(maDon);
  });

  // Bước 3: Tính xác suất bán (prob)
  const probabilityData = Array.from(categoryBillMap.values()).map(d => ({
    nhom: `[${d.maNhom}] ${d.tenNhom}`,
    slDonBan: d.bills.size,
    tongSoDon: totalBills,
    xacSuat: (d.bills.size / totalBills) * 100 // Tính phần trăm
  }));

  // Thêm field total để tương thích với drawBarChart
  const probabilityDataWithTotal = probabilityData.map(d => ({
    ...d,
    total: d.xacSuat // Thêm field total = xacSuat
  }));

  // Lọc bỏ dữ liệu NaN và sắp xếp theo xác suất giảm dần
  const validProbabilityData = probabilityDataWithTotal.filter(d => !isNaN(d.total) && d.total > 0);
  validProbabilityData.sort((a, b) => d3.descending(a.total, b.total));

  const color7 = d3.scaleOrdinal(d3.schemeTableau10).domain(validProbabilityData.map(d => d.nhom));

  // Hàm xử lý label cho biểu đồ xác suất
  const createProbabilityLabelLogic = () => {
    return (svg, data, x, y, margin) => {
      svg.selectAll(".label")
        .data(data)
        .join("text")
        .attr("class", "label")
        .attr("x", d => x(d.total) - 5)
        .attr("y", d => y(d.nhom) + y.bandwidth() / 1.5)
        .each(function(d) {
          const el = d3.select(this);
          const availableWidth = x(d.total) - margin.left - 10;
          const formattedText = d.total.toFixed(1) + "%";
          el.text(formattedText);
          if (el.node().getComputedTextLength() > availableWidth) {
            el.text("");
          }
        });
    };
  };

  // Tạo biểu đồ xác suất với trục X từ 0% đến 100%
  const svg7 = d3.select("#chart-probability");
  const width7 = +svg7.attr("width");
  const height7 = +svg7.attr("height");
  const margin7 = { top: 40, right: 200, bottom: 40, left: 250 };

  const x7 = d3.scaleLinear()
    .domain([0, 100]) // Trục X từ 0% đến 100%
    .range([margin7.left, width7 - margin7.right]);

  const y7 = d3.scaleBand()
    .domain(validProbabilityData.map(d => d.nhom))
    .range([margin7.top, height7 - margin7.bottom])
    .padding(0.2);

  // Grid lines
  svg7.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0, ${height7 - margin7.bottom})`)
    .call(d3.axisBottom(x7)
      .ticks(5)
      .tickSize(-(height7 - margin7.top - margin7.bottom))
      .tickFormat("")
    );

  // Bars
  svg7.selectAll(".bar")
    .data(validProbabilityData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", margin7.left)
    .attr("y", d => y7(d.nhom))
    .attr("width", d => x7(d.total) - margin7.left)
    .attr("height", y7.bandwidth())
    .attr("fill", d => color7(d.nhom));

  // Labels
  createProbabilityLabelLogic()(svg7, validProbabilityData, x7, y7, margin7);

  // X-Axis
  svg7.append("g")
    .attr("transform", `translate(0, ${height7 - margin7.bottom})`)
    .call(d3.axisBottom(x7).ticks(5).tickFormat(d => d + "%"));

  // Y-Axis
  svg7.append("g")
    .attr("transform", `translate(${margin7.left}, 0)`)
    .call(d3.axisLeft(y7));

  // ==================================================================
  // Biểu đồ 8: Xác suất bán hàng của Nhóm hàng theo Tháng (Line Chart)
  // ==================================================================
  
  // Bước 1: Gom nhóm theo tháng và đơn hàng
  const billMonthData = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])), // Lấy unique bill_id
    d => {
      const date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
      return d3.timeFormat("%m")(date); // Lấy tháng (01-12)
    }
  ).map(([month, bills]) => ({
    month: month,
    totalBills: bills.size
  }));

  // Bước 2: Gom nhóm theo tháng, nhóm hàng và đơn hàng
  const billCatData = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])), // Lấy unique bill_id
    d => {
      const date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
      const month = d3.timeFormat("%m")(date);
      const category = d["Mã nhóm hàng"];
      return `${month}-${category}`;
    }
  ).map(([key, bills]) => {
    const [month, category] = key.split('-');
    return {
      month: month,
      category: category,
      bills: bills.size
    };
  });

  // Bước 3: Tính xác suất cho mỗi tháng-nhóm hàng
  const lineChartData = [];
  const categories = ["BOT", "SET", "THO", "TMX", "TTC"];
  const categoryNames = {
    "BOT": "[BOT] Bột",
    "SET": "[SET] Set trà", 
    "THO": "[THO] Trà hoa",
    "TMX": "[TMX] Trà mix",
    "TTC": "[TTC] Trà củ, quả sấy"
  };

  // Tạo dữ liệu cho 12 tháng
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const totalBills = billMonthData.find(d => d.month === monthStr)?.totalBills || 0;
    
    categories.forEach(category => {
      const categoryBills = billCatData.find(d => d.month === monthStr && d.category === category)?.bills || 0;
      const probability = totalBills > 0 ? (categoryBills / totalBills) * 100 : 0;
      
      lineChartData.push({
        month: `Tháng ${monthStr}`,
        monthNum: month,
        category: category,
        categoryName: categoryNames[category],
        probability: probability
      });
    });
  }

  // Sắp xếp theo tháng
  lineChartData.sort((a, b) => a.monthNum - b.monthNum);

  // Tạo biểu đồ đường
  const svg8 = d3.select("#chart-line");
  const width8 = +svg8.attr("width");
  const height8 = +svg8.attr("height");
  const margin8 = { top: 60, right: 200, bottom: 60, left: 80 };

  const x8 = d3.scaleBand()
    .domain(lineChartData.filter((d, i) => i % 5 === 0).map(d => d.month)) // Lấy 1 tháng cho mỗi 5 items
    .range([margin8.left, width8 - margin8.right])
    .padding(0.1);

  const y8 = d3.scaleLinear()
    .domain([0, 100]) // Trục Y từ 0% đến 100%
    .range([height8 - margin8.bottom, margin8.top]);

  const color8 = d3.scaleOrdinal()
    .domain(categories)
    .range(d3.schemeTableau10);

  // Tạo line generator
  const line = d3.line()
    .x(d => x8(d.month))
    .y(d => y8(d.probability))
    .curve(d3.curveMonotoneX);

  // Vẽ grid lines
  svg8.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin8.left}, 0)`)
    .call(d3.axisLeft(y8)
      .ticks(5)
      .tickSize(-(width8 - margin8.left - margin8.right))
      .tickFormat("")
    );

  // Vẽ các đường cho từng nhóm hàng
  categories.forEach(category => {
    const categoryData = lineChartData.filter(d => d.category === category);
    
    // Vẽ đường
    svg8.append("path")
      .datum(categoryData)
      .attr("fill", "none")
      .attr("stroke", color8(category))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Vẽ các điểm
    svg8.selectAll(`.dot-${category}`)
      .data(categoryData)
      .join("circle")
      .attr("class", `dot-${category}`)
      .attr("cx", d => x8(d.month))
      .attr("cy", d => y8(d.probability))
      .attr("r", 4)
      .attr("fill", color8(category));
    });

  // X-Axis
  svg8.append("g")
    .attr("transform", `translate(0, ${height8 - margin8.bottom})`)
    .call(d3.axisBottom(x8));

  // Y-Axis
  svg8.append("g")
    .attr("transform", `translate(${margin8.left}, 0)`)
    .call(d3.axisLeft(y8).ticks(5).tickFormat(d => d + "%"));

  // Legend
  const legend8 = svg8.append("g")
    .attr("transform", `translate(${width8 - margin8.right + 20}, ${margin8.top})`);

  categories.forEach((category, i) => {
    const legendRow = legend8.append("g")
      .attr("transform", `translate(0, ${i * 25})`);

    legendRow.append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", color8(category))
      .attr("stroke-width", 2);

    legendRow.append("text")
      .attr("x", 25)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(categoryNames[category]);
  });

  // ==================================================================
  // Biểu đồ 9: Dashboard - Xác suất bán hàng của Mặt hàng theo Nhóm hàng
  // ==================================================================
  
  // Bước 1: Tính tổng số đơn hàng theo nhóm hàng
  const groupTotalData = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size, // Đếm unique bill_id
    d => d["Mã nhóm hàng"]
  ).map(([categoryCode, totalBills]) => ({
    categoryCode: categoryCode,
    totalBills: totalBills
  }));

  // Bước 2: Tính số đơn hàng theo mặt hàng
  const productTotalData = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size, // Đếm unique bill_id
    d => `${d["Mã nhóm hàng"]}-${d["Mã mặt hàng"]}` // Key: "BOT-BOT01"
  ).map(([key, totalBills]) => {
    const [categoryCode, productCode] = key.split('-');
    const productData = data.find(d => d["Mã nhóm hàng"] === categoryCode && d["Mã mặt hàng"] === productCode);
    return {
      categoryCode: categoryCode,
      categoryName: productData["Tên nhóm hàng"],
      productCode: productCode,
      productName: productData["Tên mặt hàng"],
      totalBills: totalBills
    };
  });

  // Bước 3: Tính xác suất và nhóm theo category
  const multiChartData = {};
  
  productTotalData.forEach(product => {
    const groupTotal = groupTotalData.find(g => g.categoryCode === product.categoryCode)?.totalBills || 1;
    const probability = (product.totalBills / groupTotal) * 100;
    
    if (!multiChartData[product.categoryCode]) {
      multiChartData[product.categoryCode] = {
        categoryName: product.categoryName,
        products: []
      };
    }
    
    multiChartData[product.categoryCode].products.push({
      productCode: product.productCode,
      productName: product.productName,
      probability: probability
    });
  });

  // Sắp xếp sản phẩm theo xác suất giảm dần
  Object.keys(multiChartData).forEach(category => {
    multiChartData[category].products.sort((a, b) => d3.descending(a.probability, b.probability));
  });

  // Tạo container cho các biểu đồ
  const container = d3.select("#multi-chart-container");
  container.selectAll("*").remove(); // Xóa nội dung cũ

  // Tạo biểu đồ cho từng nhóm hàng
  Object.keys(multiChartData).forEach((categoryCode, index) => {
    const categoryData = multiChartData[categoryCode];
    
    // Tạo div container cho biểu đồ
    const chartDiv = container.append("div")
      .attr("class", "multi-chart");
    
    // Thêm tiêu đề
    chartDiv.append("h3")
      .text(`[${categoryCode}] ${categoryData.categoryName}`);
    
    // Tạo SVG
    const svg = chartDiv.append("svg")
      .attr("width", "100%")
      .attr("height", 180);
    
    const margin = { top: 15, right: 2, bottom: 25, left: 220 };
    const width = 550 - margin.left - margin.right; // Giảm width để vừa container
    const height = 180 - margin.top - margin.bottom;
    
    // Tạo scales
    let maxValue = 80; // Mặc định 80%
    if (categoryData.products.some(p => p.productName.includes("Bột cần tây"))) {
      maxValue = 100; // Bột cần tây: 100%
    } else if (categoryData.categoryName.includes("Set trà")) {
      maxValue = 25; // Set trà: 30%
    } else if (categoryData.categoryName.includes("Trà hoa")) {
      maxValue = 30; // Trà hoa: 30%
    } else if (categoryData.categoryName.includes("Trà mix")) {
      maxValue = 50; // Trà mix: 50%
    } else if (categoryData.categoryName.includes("Trà củ, quả sấy")) {
      maxValue = 80; // Trà củ, quả sấy: 80%
    }
   
    
    const x = d3.scaleLinear()
      .domain([0, maxValue]) // Trục X theo từng loại
      .range([margin.left, width + margin.left]);
    
    const y = d3.scaleBand()
      .domain(categoryData.products.map(d => `[${d.productCode}] ${d.productName}`))
      .range([margin.top, height + margin.top])
      .padding(0.3);
    
    // Tạo color scale
    const color = d3.scaleOrdinal(d3.schemeTableau10);
    
    // Vẽ grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(d3.axisBottom(x)
        .ticks(5)
        .tickSize(-height)
        .tickFormat("")
      );
    
    // Vẽ bars
    svg.selectAll(".bar")
      .data(categoryData.products)
      .join("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", d => y(`[${d.productCode}] ${d.productName}`))
      .attr("width", d => x(d.probability) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", (d, i) => color(i));
    
    // Vẽ labels
    svg.selectAll(".label")
      .data(categoryData.products)
    .join("text")
    .attr("class", "label")
      .attr("x", d => x(d.probability) - 5)
      .attr("y", d => y(`[${d.productCode}] ${d.productName}`) + y.bandwidth() / 1.5)
      .style("font-size", "10px")
    .style("fill", "white")
    .each(function(d) {
      const el = d3.select(this);
        const availableWidth = x(d.probability) - margin.left - 10;
        let formattedText = d.probability.toFixed(1) + "%";
        
        // Kiểm tra độ dài và thêm "..." nếu cần
        el.text(formattedText);
        if (el.node().getComputedTextLength() > availableWidth) {
          while (el.node().getComputedTextLength() > availableWidth && formattedText.length > 0) {
            formattedText = formattedText.slice(0, -1);
            el.text(formattedText + "...");
          }
        }
      });
    
    // Vẽ trục X
    svg.append("g")
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%"));
    
    // Vẽ trục Y
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).tickSize(0));
    
    // Ẩn tick lines cho trục Y để gọn gàng hơn
    svg.selectAll(".tick line").style("display", "none");
  });
  
  // Line chart dashboard - Xác suất bán hàng của Mặt hàng theo Nhóm hàng theo từng Tháng
  createLineChartDashboard(data);
  
  // Phân phối lượt mua hàng
  createPurchaseDistributionChart(data);
  
  // Phân phối mức chi trả của khách hàng
  createSpendingDistributionChart(data);
});

// Hàm tạo dashboard biểu đồ đường
function createLineChartDashboard(data) {
  // Xử lý dữ liệu theo SQL query
  const bill2022 = data.filter(d => {
    const date = new Date(d['Thời gian tạo đơn']);
    return date.getFullYear() === 2022;
  });
  
  // Tạo map tháng
  const monthMap = {};
  for (let i = 1; i <= 12; i++) {
    monthMap[i] = `T${i.toString().padStart(2, '0')}`;
  }
  
  // Số đơn hàng theo nhóm hàng + tháng
  const groupMonthData = {};
  
  // Nhóm dữ liệu theo category + month
  bill2022.forEach(d => {
    const categoryCode = d['Mã nhóm hàng'];
    const billId = d['Mã đơn hàng'];
    const date = new Date(d['Thời gian tạo đơn']);
    const month = date.getMonth() + 1;
    
    if (!groupMonthData[categoryCode]) {
      groupMonthData[categoryCode] = {};
    }
    
    if (!groupMonthData[categoryCode][month]) {
      groupMonthData[categoryCode][month] = new Set();
    }
    
    groupMonthData[categoryCode][month].add(billId);
  });
  
  // Số đơn hàng theo sản phẩm + tháng - sử dụng cách khác
  const productMonthData = {};
  
  // Nhóm dữ liệu theo category, product, month
  bill2022.forEach(d => {
    const categoryCode = d['Mã nhóm hàng'];
    const categoryName = d['Tên nhóm hàng'];
    const productCode = d['Mã mặt hàng'];
    const productName = d['Tên mặt hàng'];
    const billId = d['Mã đơn hàng'];
    const date = new Date(d['Thời gian tạo đơn']);
    const month = date.getMonth() + 1;
    
    if (!productMonthData[categoryCode]) {
      productMonthData[categoryCode] = {
        categoryCode,
        categoryName,
        products: {}
      };
    }
    
    if (!productMonthData[categoryCode].products[productCode]) {
      productMonthData[categoryCode].products[productCode] = {
        productCode,
        productName,
        months: {}
      };
    }
    
    if (!productMonthData[categoryCode].products[productCode].months[month]) {
      productMonthData[categoryCode].products[productCode].months[month] = new Set();
    }
    
    productMonthData[categoryCode].products[productCode].months[month].add(billId);
  });
  
  
  // Tạo dữ liệu cho từng nhóm hàng
  const categoryGroups = {};
  
  // Xử lý dữ liệu sản phẩm theo tháng
  Object.values(productMonthData).forEach(categoryData => {
    const products = [];
    
    Object.values(categoryData.products).forEach(productData => {
      const months = [];
      
      Object.entries(productData.months).forEach(([month, billSet]) => {
        const monthNum = parseInt(month);
        const billCount = billSet.size;
        
        // Lấy số đơn hàng của nhóm hàng trong tháng đó
        const groupBillCount = groupMonthData[categoryData.categoryCode]?.[monthNum]?.size || 0;
        
        if (groupBillCount > 0) {
          const probability = (billCount / groupBillCount) * 100;
          months.push({
            month: monthMap[monthNum],
            monthNum: monthNum,
            probability: probability,
            billCount,
            groupBillCount
          });
        }
      });
      
      // Sắp xếp theo tháng
      months.sort((a, b) => a.monthNum - b.monthNum);
      
      if (months.length > 0) {
        products.push({
          productCode: productData.productCode,
          productName: productData.productName,
          months: months
        });
      }
    });
    
    if (products.length > 0) {
      categoryGroups[categoryData.categoryCode] = {
        categoryCode: categoryData.categoryCode,
        categoryName: categoryData.categoryName,
        products: products
      };
    }
  });
  
  // Tạo container cho dashboard
  const container = d3.select("#line-chart-container");
  container.selectAll("*").remove();
  
  // Tạo biểu đồ cho từng nhóm hàng
  Object.values(categoryGroups).forEach((categoryData, index) => {
    if (categoryData.products.length === 0) return;
    
    // Tạo div cho mỗi biểu đồ
    const chartDiv = container.append("div")
      .attr("class", "multi-chart");
    
    // Thêm tiêu đề
    chartDiv.append("h3")
      .text(`[${categoryData.categoryCode}] ${categoryData.categoryName}`);
    
    // Tạo SVG
    const svg = chartDiv.append("svg")
      .attr("width", "100%")
      .attr("height", 250);
    
    const margin = { top: 20, right: 40, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    
    // Tạo scales
    const x = d3.scaleBand()
      .domain(Array.from({length: 12}, (_, i) => monthMap[i + 1]))
      .range([margin.left, width + margin.left])
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(categoryData.products, d => d3.max(d.months, m => m.probability)) * 1.1])
      .range([height + margin.top, margin.top]);
    
    // Tạo color scale
    const color = d3.scaleOrdinal(d3.schemeTableau10);
    
    // Vẽ grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("opacity", 0.3);
    
    // Vẽ đường cho từng sản phẩm
    categoryData.products.forEach((product, productIndex) => {
      const line = d3.line()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y(d => y(d.probability))
        .curve(d3.curveMonotoneX);
      
      svg.append("path")
        .datum(product.months)
        .attr("fill", "none")
        .attr("stroke", color(productIndex))
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Vẽ điểm
      svg.selectAll(`.dot-${productIndex}`)
        .data(product.months)
        .enter()
        .append("circle")
        .attr("class", `dot-${productIndex}`)
        .attr("cx", d => x(d.month) + x.bandwidth() / 2)
        .attr("cy", d => y(d.probability))
        .attr("r", 3)
        .attr("fill", color(productIndex))
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    });
    
    // Vẽ trục X
    svg.append("g")
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "10px");
    
    // Vẽ trục Y
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).tickFormat(d => d.toFixed(0) + "%"))
      .selectAll("text")
      .style("font-size", "10px");
    
    // Thêm legend (chỉ hiển thị 3 sản phẩm đầu tiên) - đặt bên phải
    const legend = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);
    
    categoryData.products.slice(0, 3).forEach((product, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 15})`);
      
      legendRow.append("line")
        .attr("x1", 0)
        .attr("x2", 10)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", color(i))
        .attr("stroke-width", 2);
      
      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(product.productName.length > 20 ? product.productName.substring(0, 20) + "..." : product.productName)
        .style("font-size", "8px")
        .style("fill", "#666");
    });
  });
}

// Hàm tạo biểu đồ phân phối lượt mua hàng
function createPurchaseDistributionChart(data) {
  // Đếm số lần mua hàng của mỗi khách hàng (theo SQL query)
  const customerPurchaseCount = {};
  
  // Nhóm theo khách hàng và đếm số đơn hàng unique
  const customerBills = {};
  data.forEach(d => {
    const customerId = d['Mã khách hàng'];
    const billId = d['Mã đơn hàng'];
    
    if (!customerBills[customerId]) {
      customerBills[customerId] = new Set();
    }
    customerBills[customerId].add(billId);
  });
  
  // Đếm số đơn hàng unique cho mỗi khách hàng
  Object.entries(customerBills).forEach(([customerId, billSet]) => {
    customerPurchaseCount[customerId] = billSet.size;
  });
  
  // Nhóm theo số lần mua hàng
  const purchaseDistribution = {};
  Object.values(customerPurchaseCount).forEach(count => {
    if (!purchaseDistribution[count]) {
      purchaseDistribution[count] = 0;
    }
    purchaseDistribution[count]++;
  });
  
  // Chuyển đổi thành mảng và sắp xếp
  const distributionData = Object.entries(purchaseDistribution)
    .map(([purchaseCount, customerCount]) => ({
      purchaseCount: parseInt(purchaseCount),
      customerCount: customerCount
    }))
    .sort((a, b) => a.purchaseCount - b.purchaseCount);
  
  
  // Tạo biểu đồ
  const svg = d3.select("#chart-purchase-distribution");
  svg.selectAll("*").remove();
  
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const width = 1400 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  
  // Tạo scales
  const x = d3.scaleBand()
    .domain(distributionData.map(d => d.purchaseCount.toString()))
    .range([margin.left, width + margin.left])
    .padding(0.1);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(distributionData, d => d.customerCount)])
    .range([height + margin.top, margin.top]);
  
  // Tạo color scale
  const color = d3.scaleSequential(d3.interpolateTurbo)
    .domain([0, distributionData.length - 1]);
  
  // Vẽ grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat("")
    )
    .style("opacity", 0.3);
  
  // Vẽ cột
  svg.selectAll(".bar")
    .data(distributionData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.purchaseCount.toString()))
    .attr("y", d => y(d.customerCount))
    .attr("width", x.bandwidth())
    .attr("height", d => height + margin.top - y(d.customerCount))
    .attr("fill", (d, i) => color(i))
    .attr("stroke", "white")
    .attr("stroke-width", 1);
  
  // Vẽ labels trên cột (chỉ hiển thị nếu cột đủ cao)
  svg.selectAll(".label")
    .data(distributionData)
    .join("text")
    .attr("class", "label")
    .attr("x", d => x(d.purchaseCount.toString()) + x.bandwidth() / 2)
    .attr("y", d => y(d.customerCount) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "white")
    .style("font-weight", "bold")
    .text(d => {
      // Chỉ hiển thị label nếu cột đủ cao (ít nhất 20px)
      const barHeight = height + margin.top - y(d.customerCount);
      return barHeight >= 20 ? d.customerCount.toLocaleString() : "";
    });
  
  // Vẽ trục X
  svg.append("g")
    .attr("transform", `translate(0, ${height + margin.top})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "11px");
  
  // Vẽ trục Y
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString()))
    .selectAll("text")
    .style("font-size", "11px");
  
  // Thêm tiêu đề trục
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text("Số lượng khách hàng");
  
  svg.append("text")
    .attr("transform", `translate(${width / 2 + margin.left}, ${height + margin.top + 50})`)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text("Số lần mua hàng");
  
  // Thêm thống kê tổng quan
  const totalCustomers = distributionData.reduce((sum, d) => sum + d.customerCount, 0);
  const avgPurchases = distributionData.reduce((sum, d) => sum + (d.purchaseCount * d.customerCount), 0) / totalCustomers;
  const maxPurchases = d3.max(distributionData, d => d.purchaseCount);
}

// Hàm tạo biểu đồ phân phối mức chi trả của khách hàng
function createSpendingDistributionChart(data) {
  // Lọc dữ liệu 2022
  const bill2022 = data.filter(d => {
    const date = new Date(d['Thời gian tạo đơn']);
    return date.getFullYear() === 2022;
  });
  
  // Tính tổng chi tiêu của mỗi khách hàng
  const customerSpending = {};
  bill2022.forEach(d => {
    const customerId = d['Mã khách hàng'];
    const billId = d['Mã đơn hàng'];
    const quantity = parseFloat(d['SL']) || 0;
    const price = parseFloat(d['Đơn giá']) || 0;
    const total = quantity * price;
    
    if (!customerSpending[customerId]) {
      customerSpending[customerId] = 0;
    }
    customerSpending[customerId] += total;
  });
  
  // Tạo bins theo logic SQL
  const spendingBins = {};
  Object.entries(customerSpending).forEach(([customerId, totalSpending]) => {
    const binId = Math.floor(totalSpending / 100000); // Chia cho 100K
    let binLabel;
    
    if (binId === 0) {
      binLabel = 'Dưới 100K';
    } else if (binId >= 1 && binId <= 29) {
      binLabel = `Từ ${binId * 100}K - ${(binId + 1) * 100}K`;
    } else {
      binLabel = 'Từ 3 triệu trở lên';
    }
    
    if (!spendingBins[binLabel]) {
      spendingBins[binLabel] = 0;
    }
    spendingBins[binLabel]++;
  });
  
  // Chuyển đổi thành mảng và sắp xếp
  const distributionData = Object.entries(spendingBins)
    .map(([binLabel, customerCount]) => ({
      binLabel,
      customerCount,
      // Tạo key để sắp xếp
      sortKey: binLabel === 'Dưới 100K' ? 0 : 
               binLabel === 'Từ 3 triệu trở lên' ? 999999 : 
               parseInt(binLabel.split(' ')[1].replace('K', ''))
    }))
    .sort((a, b) => a.sortKey - b.sortKey);
  
  // Tạo biểu đồ
  const svg = d3.select("#chart-spending-distribution");
  svg.selectAll("*").remove();
  
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const width = 1400 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  
  // Tạo scales
  const x = d3.scaleBand()
    .domain(distributionData.map(d => d.binLabel))
    .range([margin.left, width + margin.left])
    .padding(0.1);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(distributionData, d => d.customerCount)])
    .range([height + margin.top, margin.top]);
  
  // Tạo color scale
  const color = d3.scaleSequential(d3.interpolateTurbo)
    .domain([0, distributionData.length - 1]);
  
  // Vẽ grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat("")
    )
    .style("opacity", 0.3);
  
  // Vẽ cột
  svg.selectAll(".bar")
    .data(distributionData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.binLabel))
    .attr("y", d => y(d.customerCount))
    .attr("width", x.bandwidth())
    .attr("height", d => height + margin.top - y(d.customerCount))
    .attr("fill", (d, i) => color(i))
    .attr("stroke", "white")
    .attr("stroke-width", 1);
  
  // Vẽ labels trên cột (chỉ hiển thị nếu cột đủ cao)
  svg.selectAll(".label")
    .data(distributionData)
    .join("text")
    .attr("class", "label")
    .attr("x", d => x(d.binLabel) + x.bandwidth() / 2)
    .attr("y", d => y(d.customerCount) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "white")
    .style("font-weight", "bold")
    .text(d => {
      // Chỉ hiển thị label nếu cột đủ cao (ít nhất 20px)
      const barHeight = height + margin.top - y(d.customerCount);
      return barHeight >= 20 ? d.customerCount.toLocaleString() : "";
    });
  
  // Vẽ trục X
  svg.append("g")
    .attr("transform", `translate(0, ${height + margin.top})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "10px")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  // Vẽ trục Y
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString()))
    .selectAll("text")
    .style("font-size", "11px");
  
  // Thêm tiêu đề trục
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text("Số lượng khách hàng");
  
  svg.append("text")
    .attr("transform", `translate(${width / 2 + margin.left}, ${height + margin.top + 50})`)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
  
  // Thêm thống kê tổng quan
  const totalCustomers = distributionData.reduce((sum, d) => sum + d.customerCount, 0);
  const totalSpending = Object.entries(customerSpending).reduce((sum, [, spending]) => sum + spending, 0);
  const avgSpending = totalSpending / totalCustomers;
}
