(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bad = style.getPropertyValue('--bad').trim();

  var qs = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'];
  var scores = [0, 0, 0, 0, 0, 0, 3, 3, 0, 3];

  // --- Chart 1: per-question scores ---
  var c1 = echarts.init(document.getElementById('chart-scores'), null, { renderer: 'svg' });
  c1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: qs,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted }
    },
    yAxis: {
      type: 'value', max: 4, interval: 1,
      name: '得分（满分 4）', nameTextStyle: { color: muted },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule } }
    },
    series: [{
      name: 'Perplexity', type: 'bar', data: scores, barMaxWidth: 34,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: function(p) { return p.value === 0 ? bad : accent; }
      },
      label: {
        show: true, position: 'top', fontWeight: 700,
        formatter: function(p) { return p.value; },
        color: function(p) { return p.value === 0 ? bad : accent; }
      }
    }]
  });
  window.addEventListener('resize', function() { c1.resize(); });

  // --- Chart 2: citation occupancy by site (value = 题数 where the site was cited) ---
  var sites = ['Lilisaura.com', 'Alibaba（同名 listing）', 'UP.Codes', 'The Pricer', 'Plant Girl Floral', 'Armstrong', 'CSI Creative', 'Event Decor Direct', 'Liba Fabrics', 'CAP Inc.', 'Event Drape Rental Blog', 'Heaven 3D Interiors', 'La Piñata Party'];
  var counts = [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 5, 8];

  var data = sites.map(function(name, i) {
    var v = counts[i];
    var isSelf = name === 'Lilisaura.com';
    var isTop = i >= 11;
    return {
      value: v,
      itemStyle: {
        color: isSelf ? bad : (isTop ? accent : muted),
        opacity: isSelf ? 1 : (isTop ? 1 : 0.7),
        borderRadius: [0, 4, 4, 0]
      },
      label: {
        show: true,
        position: 'right',
        fontWeight: 700,
        color: isSelf ? bad : ink,
        formatter: isSelf ? '0 ← 没有你' : String(v)
      }
    };
  });

  var c2 = echarts.init(document.getElementById('chart-citations'), null, { renderer: 'svg' });
  c2.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, formatter: function(p) { return p[0].name + '：被 ' + p[0].value + ' 道题引用'; } },
    grid: { left: 8, right: 64, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value', max: 8, interval: 2,
      name: '被引用题数（共 10 题）', nameTextStyle: { color: muted },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule } }
    },
    yAxis: {
      type: 'category',
      data: sites,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink }
    },
    series: [{ type: 'bar', barMaxWidth: 18, data: data }]
  });
  window.addEventListener('resize', function() { c2.resize(); });
})();
