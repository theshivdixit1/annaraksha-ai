import React from 'react';
import { createRoot } from 'react-dom/client';
import { MoistureTrendChart } from './components/MoistureTrendChart';

function initMoistureTrendChart() {
  const container = document.getElementById('moisture-trend-chart-root');
  if (!container) return;

  // Prevent duplicate mounting
  if (container.hasAttribute('data-react-mounted')) return;
  container.setAttribute('data-react-mounted', 'true');

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <MoistureTrendChart />
    </React.StrictMode>
  );

  console.log('[Annaraksha] Recharts Moisture Trend Chart successfully mounted.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMoistureTrendChart);
} else {
  initMoistureTrendChart();
}

// Also expose global initializer in case dynamic re-render is needed
(window as any).initMoistureTrendChart = initMoistureTrendChart;
