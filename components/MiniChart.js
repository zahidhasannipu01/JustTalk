'use client';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Chart.js gradient chart — same gradient recipe as the preview (green -> amber -> accent).
export default function MiniChart({ labels, data, max, yTitle = 'minutes', height = 220 }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !labels?.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const barGrad = c => { const a = c.chart.chartArea; if (!a) return 'rgba(255,77,36,.8)'; const g = c.chart.ctx.createLinearGradient(0, a.bottom, 0, a.top); g.addColorStop(0, 'rgba(14,159,110,.88)'); g.addColorStop(.55, 'rgba(232,147,12,.92)'); g.addColorStop(1, 'rgba(255,77,36,.98)'); return g; };
    const fillGrad = c => { const a = c.chart.chartArea; if (!a) return 'rgba(255,77,36,.18)'; const g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, 'rgba(255,77,36,.34)'); g.addColorStop(.55, 'rgba(232,147,12,.14)'); g.addColorStop(1, 'rgba(14,159,110,.03)'); return g; };
    const lineGrad = c => { const a = c.chart.chartArea; if (!a) return '#FF4D24'; const g = c.chart.ctx.createLinearGradient(a.left, 0, a.right, 0); g.addColorStop(0, '#0E9F6E'); g.addColorStop(.55, '#E8930C'); g.addColorStop(1, '#FF4D24'); return g; };
    Chart.defaults.font.family = "'Manrope',system-ui,sans-serif";
    chartRef.current = new Chart(ref.current.getContext('2d'), {
      data: { labels, datasets: [
        { type: 'line', label: 'Trend', data, borderColor: lineGrad, backgroundColor: fillGrad, fill: true, tension: .45, borderWidth: 2.5, pointRadius: data.length > 12 ? 0 : 4, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderColor: '#FF4D24', pointBorderWidth: 2, order: 1 },
        { type: 'bar', label: 'Minutes talked', data, backgroundColor: barGrad, hoverBackgroundColor: 'rgba(255,77,36,.92)', borderRadius: 6, borderSkipped: false, barPercentage: .6, categoryPercentage: .75, order: 2 },
      ] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#101210', titleFont: { weight: '800' }, bodyFont: { weight: '700' }, padding: 11, cornerRadius: 12, displayColors: false, callbacks: { label: c => `${c.parsed.y} minutes talked` } } },
        scales: { x: { grid: { display: false }, border: { color: '#E7E7E1' }, ticks: { font: { weight: '700', size: 11 }, color: '#9BA099', maxTicksLimit: 10, autoSkip: true } }, y: { beginAtZero: true, suggestedMax: max || undefined, grid: { color: 'rgba(16,18,16,.06)' }, border: { display: false }, ticks: { font: { weight: '700', size: 11 }, color: '#9BA099', maxTicksLimit: 5 }, title: { display: true, text: yTitle, font: { weight: '800', size: 11 }, color: '#6E736E' } } } },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [JSON.stringify(labels), JSON.stringify(data)]);
  return <div className="chart-wrap" style={{ height }}><canvas ref={ref} className="wk-chart" role="img" aria-label="Gradient chart of minutes talked" /></div>;
}
