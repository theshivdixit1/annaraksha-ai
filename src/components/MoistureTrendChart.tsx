import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { GrainScanHistory, ScanPoint, ScanUpdateDetail } from '../types';
import { INITIAL_GRAIN_HISTORIES, normalizeGrainKey } from '../data/grainScanData';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  safeLimit?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, safeLimit = 13.0 }) => {
  if (!active || !payload || !payload.length) return null;

  const data: ScanPoint = payload[0].payload;
  const isHigh = data.moisture > safeLimit;
  const delta = (data.moisture - safeLimit).toFixed(1);

  return (
    <div
      style={{
        background: 'rgba(10, 15, 29, 0.96)',
        border: `1px solid ${isHigh ? 'rgba(244, 63, 94, 0.6)' : 'rgba(16, 185, 129, 0.6)'}`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(6, 182, 212, 0.2)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.75rem',
        color: '#f8fafc',
        minWidth: '175px',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px' }}>
        <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{data.scanLabel}</span>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{data.timestamp}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 0' }}>
        <span style={{ color: '#94a3b8' }}>Moisture:</span>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isHigh ? '#f43f5e' : '#10b981', fontFamily: 'monospace' }}>
          {data.moisture}%
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
        <span>Safe Limit:</span>
        <span>&le; {data.safeLimit}%</span>
      </div>

      <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.68rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8' }}>Batch:</span>
        <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{data.batchId}</span>
      </div>

      <div style={{ marginTop: '3px', fontSize: '0.68rem', color: isHigh ? '#fb7185' : '#34d399', fontWeight: 600 }}>
        {isHigh ? `⚠️ +${delta}% above safe limit` : `✅ ${(safeLimit - data.moisture).toFixed(1)}% within safe range`}
      </div>
    </div>
  );
};

const GRAIN_PILLS: Array<{ key: string; label: string; preset: string }> = [
  { key: 'wheat', label: '🌾 Wheat', preset: 'wheat_high_moisture' },
  { key: 'rice', label: '🍚 Paddy', preset: 'rice_weevil' },
  { key: 'chana', label: '🫘 Chana', preset: 'chana_grade_a' },
  { key: 'bajra', label: '🌽 Bajra', preset: 'bajra_mold' },
];

export const MoistureTrendChart: React.FC = () => {
  const [histories, setHistories] = useState<Record<string, GrainScanHistory>>(INITIAL_GRAIN_HISTORIES);
  const [activeGrainKey, setActiveGrainKey] = useState<string>('wheat');
  const [, setResizeTick] = useState<number>(0);

  // Re-render when container changes or window resizes
  useEffect(() => {
    const handleResize = () => setResizeTick(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for scan updates triggered by the AI Grain Quality module
  useEffect(() => {
    const handleScanUpdate = (e: CustomEvent<ScanUpdateDetail>) => {
      const detail = e.detail;
      if (!detail) return;

      const rawGrain = detail.grain_type || detail.preset || 'wheat';
      const key = normalizeGrainKey(rawGrain);

      setHistories(prev => {
        const existing = prev[key] || {
          grainKey: key,
          grainName: detail.grain_type || 'Custom Grain',
          safeLimit: detail.safe_moisture_limit || 13.0,
          unit: '%',
          scans: [
            { scanId: 'S-1', scanLabel: 'Scan 1', batchId: 'AGR-PREV-01', moisture: (detail.estimated_moisture || 14) - 1.2, safeLimit: detail.safe_moisture_limit || 13.0, timestamp: '10:00 IST', status: 'safe' },
            { scanId: 'S-2', scanLabel: 'Scan 2', batchId: 'AGR-PREV-02', moisture: (detail.estimated_moisture || 14) - 0.8, safeLimit: detail.safe_moisture_limit || 13.0, timestamp: '10:45 IST', status: 'safe' },
            { scanId: 'S-3', scanLabel: 'Scan 3', batchId: 'AGR-PREV-03', moisture: (detail.estimated_moisture || 14) - 0.4, safeLimit: detail.safe_moisture_limit || 13.0, timestamp: '11:30 IST', status: 'watch' },
            { scanId: 'S-4', scanLabel: 'Scan 4', batchId: 'AGR-PREV-04', moisture: (detail.estimated_moisture || 14) - 0.1, safeLimit: detail.safe_moisture_limit || 13.0, timestamp: '12:15 IST', status: 'watch' },
            { scanId: 'S-5', scanLabel: 'Scan 5 (Current)', batchId: detail.batch_id || 'AGR-CURR-05', moisture: detail.estimated_moisture || 14.0, safeLimit: detail.safe_moisture_limit || 13.0, timestamp: 'Just now', status: 'critical' },
          ]
        };

        // If updating the current scan:
        if (detail.estimated_moisture !== undefined) {
          const currentScans = [...existing.scans];
          const newMoisture = Number(detail.estimated_moisture);
          const safeLim = detail.safe_moisture_limit || existing.safeLimit;

          // Replace or update Scan 5 (latest)
          const updatedLastScan: ScanPoint = {
            scanId: 'S-5',
            scanLabel: 'Scan 5 (Current)',
            batchId: detail.batch_id || `AGR-IN-${Math.floor(10000 + Math.random() * 90000)}`,
            moisture: newMoisture,
            safeLimit: safeLim,
            location: detail.location || 'Mandi Ingest Gate',
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
            status: newMoisture >= safeLim + 2 ? 'critical' : (newMoisture >= safeLim ? 'watch' : 'safe')
          };

          currentScans[currentScans.length - 1] = updatedLastScan;

          return {
            ...prev,
            [key]: {
              ...existing,
              grainName: detail.grain_type || existing.grainName,
              safeLimit: safeLim,
              scans: currentScans
            }
          };
        }

        return prev;
      });

      setActiveGrainKey(key);
    };

    window.addEventListener('annaraksha:scan-update' as any, handleScanUpdate as any);

    // Also observe clicks on preset buttons in index.html for instant synchronization
    const presetButtons = document.querySelectorAll('.scanner-preset-btn');
    const onPresetClick = (ev: Event) => {
      const target = ev.currentTarget as HTMLElement;
      const presetKey = target.getAttribute('data-preset') || '';
      const key = normalizeGrainKey(presetKey);
      setActiveGrainKey(key);
    };

    presetButtons.forEach(btn => btn.addEventListener('click', onPresetClick));

    return () => {
      window.removeEventListener('annaraksha:scan-update' as any, handleScanUpdate as any);
      presetButtons.forEach(btn => btn.removeEventListener('click', onPresetClick));
    };
  }, []);

  const handlePillClick = useCallback((grainKey: string, preset: string) => {
    setActiveGrainKey(grainKey);
    // Also trigger parent scanner preset button if available
    const parentPresetBtn = document.querySelector(`.scanner-preset-btn[data-preset="${preset}"]`) as HTMLButtonElement | null;
    if (parentPresetBtn) {
      parentPresetBtn.click();
    }
  }, []);

  const activeHistory = histories[activeGrainKey] || histories['wheat'];
  const scans = activeHistory.scans;
  const safeLimit = activeHistory.safeLimit;

  // Calculate statistics over the last 5 scans
  const stats = useMemo(() => {
    if (!scans.length) return { avg: 0, delta: 0, isWorsening: false, max: 0, min: 0 };
    const values = scans.map(s => s.moisture);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Number((sum / values.length).toFixed(1));
    const first = values[0];
    const last = values[values.length - 1];
    const delta = Number((last - first).toFixed(1));
    const isWorsening = delta > 0 && last > safeLimit;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { avg, delta, isWorsening, max, min };
  }, [scans, safeLimit]);

  const latestScan = scans[scans.length - 1];
  const isLatestCritical = latestScan ? latestScan.moisture > safeLimit : false;
  const lineColor = isLatestCritical ? '#f43f5e' : '#06b6d4';

  // Dynamic Y domain
  const yMin = Math.max(0, Math.floor(Math.min(...scans.map(s => s.moisture), safeLimit) - 1.2));
  const yMax = Math.ceil(Math.max(...scans.map(s => s.moisture), safeLimit) + 1.2);

  return (
    <div
      style={{
        background: 'rgba(10, 17, 32, 0.88)',
        border: '1px solid rgba(6, 182, 212, 0.28)',
        borderRadius: '12px',
        padding: '0.85rem',
        marginTop: '0.9rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Header: Title, Selected Grain, & Trend Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: lineColor, boxShadow: `0 0 8px ${lineColor}` }}></span>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            NIR Moisture Trend
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>// Last 5 Scans</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '4px',
              background: stats.delta > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: stats.delta > 0 ? '#fb7185' : '#34d399',
              border: `1px solid ${stats.delta > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}
          >
            {stats.delta > 0 ? `↗ +${stats.delta}%` : `↘ ${stats.delta}%`}
          </span>
        </div>
      </div>

      {/* Grain Type Pills for Rapid Switching */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.55rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {GRAIN_PILLS.map(p => {
          const isSelected = activeGrainKey === p.key;
          return (
            <button
              key={p.key}
              onClick={() => handlePillClick(p.key, p.preset)}
              style={{
                background: isSelected ? 'rgba(6, 182, 212, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isSelected ? '#38bdf8' : '#94a3b8',
                fontSize: '0.68rem',
                fontWeight: isSelected ? 700 : 500,
                padding: '2px 7px',
                borderRadius: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title={`View 5-scan moisture trend for ${p.label}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Small Recharts Line Chart */}
      <div style={{ width: '100%', height: 135, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={130}>
          <LineChart data={scans} margin={{ top: 8, right: 12, left: -24, bottom: 2 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} vertical={false} />
            <XAxis
              dataKey="scanLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val) => val.replace(' (Current)', '*')}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              domain={[yMin, yMax]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={<CustomTooltip safeLimit={safeLimit} />} />

            {/* Reference Line for Safe Limit Threshold */}
            <ReferenceLine
              y={safeLimit}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.2}
              label={{
                value: `Safe ≤${safeLimit}%`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 9,
                fontWeight: 600,
                offset: 2
              }}
            />

            {/* Moisture Trend Line */}
            <Line
              type="monotone"
              dataKey="moisture"
              stroke={lineColor}
              strokeWidth={2.5}
              isAnimationActive={true}
              animationDuration={600}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                const isOver = payload.moisture > safeLimit;
                const isCurrent = index === scans.length - 1;
                const dotFill = isOver ? '#f43f5e' : '#10b981';

                return (
                  <g key={`dot-${index}`}>
                    {isCurrent && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill="none"
                        stroke={dotFill}
                        strokeWidth={1.5}
                        opacity={0.6}
                      >
                        <animate
                          attributeName="r"
                          values="5;9;5"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0.2;0.8"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isCurrent ? 4.5 : 3.5}
                      fill={dotFill}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  </g>
                );
              }}
              activeDot={{
                r: 6,
                fill: '#ffffff',
                stroke: lineColor,
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Mini Metrics Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          color: '#94a3b8',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          paddingTop: '6px',
          marginTop: '4px'
        }}
      >
        <div>
          <span>5-Scan Avg: </span>
          <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{stats.avg}%</strong>
        </div>

        <div>
          <span>Peak: </span>
          <strong style={{ color: stats.max > safeLimit ? '#f43f5e' : '#10b981', fontFamily: 'monospace' }}>
            {stats.max}%
          </strong>
        </div>

        <div>
          <span>Threshold: </span>
          <strong style={{ color: '#f59e0b', fontFamily: 'monospace' }}>&le; {safeLimit}%</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: stats.isWorsening ? '#f43f5e' : (isLatestCritical ? '#f59e0b' : '#10b981')
            }}
          ></span>
          <span style={{ color: stats.isWorsening ? '#fb7185' : '#34d399', fontWeight: 600 }}>
            {stats.isWorsening ? 'Moisture Surging' : (isLatestCritical ? 'Exceeds Limit' : 'Safe Range')}
          </span>
        </div>
      </div>
    </div>
  );
};
