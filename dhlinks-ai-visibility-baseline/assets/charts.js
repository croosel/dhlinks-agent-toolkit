(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var good = style.getPropertyValue('--good').trim();
  var warn = style.getPropertyValue('--warn').trim();
  var bad = style.getPropertyValue('--bad').trim();

  var qs = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'];
  var doubao = [2, 0, 3, 0, 1, 0, 2, 0, 2, 3];
  var kimi   = [2, 0, 3, 0, 0, 0, 3, 0, 3, 3];

  // --- Chart 1: per-question scores ---
  var c1 = echarts.init(document.getElementById('chart-scores'), null, { renderer: 'svg' });
  c1.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['豆包', 'Kimi'], top: 0, textStyle: { color: ink } },
    grid: { left: 8, right: 16, top: 44, bottom: 8, containLabel: true },
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
    series: [
      {
        name: '豆包', type: 'bar', data: doubao, barMaxWidth: 26,
        itemStyle: { color: accent, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: accent, fontWeight: 700 }
      },
      {
        name: 'Kimi', type: 'bar', data: kimi, barMaxWidth: 26,
        itemStyle: { color: accent2, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: accent2, fontWeight: 700 }
      }
    ]
  });
  window.addEventListener('resize', function() { c1.resize(); });

  // --- Chart 2: answer nature distribution ---
  var c2 = echarts.init(document.getElementById('chart-nature'), null, { renderer: 'svg' });
  c2.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['正向推荐', '中性列示', '负面 / 失实', '缺席'], top: 0, textStyle: { color: ink } },
    grid: { left: 8, right: 24, top: 44, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value', max: 10, interval: 2,
      name: '题数（共 10 题）', nameTextStyle: { color: muted },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: rule } }
    },
    yAxis: {
      type: 'category',
      data: ['Kimi', '豆包'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink, fontWeight: 700 }
    },
    series: [
      { name: '正向推荐', type: 'bar', stack: 'n', data: [0, 0], barMaxWidth: 34,
        itemStyle: { color: good }, label: { show: true, color: '#fff', fontWeight: 700 } },
      { name: '中性列示', type: 'bar', stack: 'n', data: [5, 3], barMaxWidth: 34,
        itemStyle: { color: warn }, label: { show: true, color: '#fff', fontWeight: 700 } },
      { name: '负面 / 失实', type: 'bar', stack: 'n', data: [0, 3], barMaxWidth: 34,
        itemStyle: { color: bad }, label: { show: true, color: '#fff', fontWeight: 700 } },
      { name: '缺席', type: 'bar', stack: 'n', data: [5, 4], barMaxWidth: 34,
        itemStyle: { color: muted, opacity: 0.55 }, label: { show: true, color: ink, fontWeight: 700 } }
    ]
  });
  window.addEventListener('resize', function() { c2.resize(); });
})();
