/**
 * Annaraksha AI - Moisture Trend Chart Types
 */

export interface ScanPoint {
  scanId: string;
  scanLabel: string;
  batchId: string;
  moisture: number;
  safeLimit: number;
  location?: string;
  timestamp: string;
  status: 'safe' | 'watch' | 'critical';
}

export interface GrainScanHistory {
  grainKey: string;
  grainName: string;
  safeLimit: number;
  unit: string;
  scans: ScanPoint[];
}

export interface ScanUpdateDetail {
  preset?: string;
  grain_type?: string;
  batch_id?: string;
  estimated_moisture?: number;
  safe_moisture_limit?: number;
  quality_grade?: string;
  location?: string;
}
