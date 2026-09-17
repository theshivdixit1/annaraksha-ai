import { GrainScanHistory } from '../types';

export const INITIAL_GRAIN_HISTORIES: Record<string, GrainScanHistory> = {
  wheat: {
    grainKey: 'wheat',
    grainName: 'Wheat (Kalyan Sona)',
    safeLimit: 13.0,
    unit: '%',
    scans: [
      {
        scanId: 'S-1',
        scanLabel: 'Scan 1',
        batchId: 'AGR-IN-88917-WHT',
        moisture: 13.6,
        safeLimit: 13.0,
        location: 'Indore Mandi Gate #1',
        timestamp: '08:30 IST',
        status: 'watch'
      },
      {
        scanId: 'S-2',
        scanLabel: 'Scan 2',
        batchId: 'AGR-IN-88918-WHT',
        moisture: 14.1,
        safeLimit: 13.0,
        location: 'Indore Mandi Gate #2',
        timestamp: '09:15 IST',
        status: 'watch'
      },
      {
        scanId: 'S-3',
        scanLabel: 'Scan 3',
        batchId: 'AGR-IN-88919-WHT',
        moisture: 14.7,
        safeLimit: 13.0,
        location: 'Indore Mandi Gate #1',
        timestamp: '10:00 IST',
        status: 'watch'
      },
      {
        scanId: 'S-4',
        scanLabel: 'Scan 4',
        batchId: 'AGR-IN-88920-WHT',
        moisture: 15.3,
        safeLimit: 13.0,
        location: 'Indore Mandi Gate #3',
        timestamp: '11:20 IST',
        status: 'critical'
      },
      {
        scanId: 'S-5',
        scanLabel: 'Scan 5 (Current)',
        batchId: 'AGR-IN-88921-WHT',
        moisture: 15.9,
        safeLimit: 13.0,
        location: 'Indore Mandi Terminal Gate #4',
        timestamp: '12:45 IST',
        status: 'critical'
      }
    ]
  },
  rice: {
    grainKey: 'rice',
    grainName: 'Paddy / Rice (Parmal 1509)',
    safeLimit: 13.5,
    unit: '%',
    scans: [
      {
        scanId: 'S-1',
        scanLabel: 'Scan 1',
        batchId: 'AGR-IN-44215-RIC',
        moisture: 13.0,
        safeLimit: 13.5,
        location: 'Karnal Godown Bay 1',
        timestamp: '07:45 IST',
        status: 'safe'
      },
      {
        scanId: 'S-2',
        scanLabel: 'Scan 2',
        batchId: 'AGR-IN-44216-RIC',
        moisture: 13.4,
        safeLimit: 13.5,
        location: 'Karnal Godown Bay 2',
        timestamp: '08:50 IST',
        status: 'safe'
      },
      {
        scanId: 'S-3',
        scanLabel: 'Scan 3',
        batchId: 'AGR-IN-44217-RIC',
        moisture: 13.9,
        safeLimit: 13.5,
        location: 'Karnal Godown Bay 2',
        timestamp: '10:10 IST',
        status: 'watch'
      },
      {
        scanId: 'S-4',
        scanLabel: 'Scan 4',
        batchId: 'AGR-IN-44218-RIC',
        moisture: 14.2,
        safeLimit: 13.5,
        location: 'Karnal Godown Bay 3',
        timestamp: '11:30 IST',
        status: 'watch'
      },
      {
        scanId: 'S-5',
        scanLabel: 'Scan 5 (Current)',
        batchId: 'AGR-IN-44219-RIC',
        moisture: 14.6,
        safeLimit: 13.5,
        location: 'Karnal Grain Hub Bay 3',
        timestamp: '13:00 IST',
        status: 'critical'
      }
    ]
  },
  chana: {
    grainKey: 'chana',
    grainName: 'Chickpea / Chana (Desi Bold)',
    safeLimit: 12.0,
    unit: '%',
    scans: [
      {
        scanId: 'S-1',
        scanLabel: 'Scan 1',
        batchId: 'AGR-IN-66298-CHN',
        moisture: 11.6,
        safeLimit: 12.0,
        location: 'Akola APMC Yard A',
        timestamp: '09:00 IST',
        status: 'safe'
      },
      {
        scanId: 'S-2',
        scanLabel: 'Scan 2',
        batchId: 'AGR-IN-66299-CHN',
        moisture: 11.2,
        safeLimit: 12.0,
        location: 'Akola APMC Yard A',
        timestamp: '10:15 IST',
        status: 'safe'
      },
      {
        scanId: 'S-3',
        scanLabel: 'Scan 3',
        batchId: 'AGR-IN-66300-CHN',
        moisture: 10.9,
        safeLimit: 12.0,
        location: 'Akola APMC Yard B',
        timestamp: '11:40 IST',
        status: 'safe'
      },
      {
        scanId: 'S-4',
        scanLabel: 'Scan 4',
        batchId: 'AGR-IN-66301-CHN',
        moisture: 10.6,
        safeLimit: 12.0,
        location: 'Akola APMC Yard B',
        timestamp: '12:55 IST',
        status: 'safe'
      },
      {
        scanId: 'S-5',
        scanLabel: 'Scan 5 (Current)',
        batchId: 'AGR-IN-66302-CHN',
        moisture: 10.4,
        safeLimit: 12.0,
        location: 'Akola APMC Yard #12',
        timestamp: '14:10 IST',
        status: 'safe'
      }
    ]
  },
  bajra: {
    grainKey: 'bajra',
    grainName: 'Pearl Millet / Bajra (Hybrid RHB)',
    safeLimit: 12.5,
    unit: '%',
    scans: [
      {
        scanId: 'S-1',
        scanLabel: 'Scan 1',
        batchId: 'AGR-IN-19280-BJR',
        moisture: 13.2,
        safeLimit: 12.5,
        location: 'Jaipur Terminal Gate 1',
        timestamp: '08:15 IST',
        status: 'watch'
      },
      {
        scanId: 'S-2',
        scanLabel: 'Scan 2',
        batchId: 'AGR-IN-19281-BJR',
        moisture: 14.0,
        safeLimit: 12.5,
        location: 'Jaipur Terminal Gate 2',
        timestamp: '09:30 IST',
        status: 'watch'
      },
      {
        scanId: 'S-3',
        scanLabel: 'Scan 3',
        batchId: 'AGR-IN-19282-BJR',
        moisture: 14.8,
        safeLimit: 12.5,
        location: 'Jaipur Terminal Gate 2',
        timestamp: '10:45 IST',
        status: 'critical'
      },
      {
        scanId: 'S-4',
        scanLabel: 'Scan 4',
        batchId: 'AGR-IN-19283-BJR',
        moisture: 15.6,
        safeLimit: 12.5,
        location: 'Jaipur Terminal Gate 3',
        timestamp: '12:15 IST',
        status: 'critical'
      },
      {
        scanId: 'S-5',
        scanLabel: 'Scan 5 (Current)',
        batchId: 'AGR-IN-19284-BJR',
        moisture: 16.4,
        safeLimit: 12.5,
        location: 'Jaipur Agricultural Terminal',
        timestamp: '13:40 IST',
        status: 'critical'
      }
    ]
  }
};

export function normalizeGrainKey(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('wheat')) return 'wheat';
  if (lower.includes('rice') || lower.includes('paddy')) return 'rice';
  if (lower.includes('chana') || lower.includes('chickpea')) return 'chana';
  if (lower.includes('bajra') || lower.includes('millet')) return 'bajra';
  return 'custom';
}
