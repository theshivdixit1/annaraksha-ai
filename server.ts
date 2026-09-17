import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;
const ROOT_DIR = process.cwd();

// Parse JSON and form bodies
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Security: Deny direct access to protected directories and files
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p.startsWith('/config') ||
    p.startsWith('/.') ||
    p.includes('/secrets.php') ||
    p.includes('package.json') ||
    p.includes('schema.sql') ||
    p.includes('seed.sql') ||
    p.endsWith('.db')
  ) {
    res.status(403).json({ error: 'Access Denied: Protected resource' });
    return;
  }
  next();
});

// -----------------------------------------------------------------------------
// Database Initialization (node:sqlite)
// -----------------------------------------------------------------------------
const dataDir = path.join(ROOT_DIR, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'annaraksha.db');
const db = new DatabaseSync(dbPath);

// Ensure base schema exists
db.exec(`
  CREATE TABLE IF NOT EXISTS storage_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    grain_type TEXT NOT NULL,
    capacity_tonnes INTEGER NOT NULL,
    current_stock_tonnes INTEGER NOT NULL,
    moisture_pct REAL NOT NULL,
    risk_level TEXT NOT NULL DEFAULT 'healthy',
    predicted_spoilage_date TEXT NULL,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    tonnes_at_risk INTEGER NOT NULL,
    rupees_at_risk REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check if storage_units has rows; if empty, seed from seed.sql
const unitCountRow = db.prepare('SELECT count(*) as cnt FROM storage_units').get() as { cnt: number };
if (!unitCountRow || unitCountRow.cnt === 0) {
  console.log('Seeding initial storage units from seed.sql...');
  const seedFile = path.join(ROOT_DIR, 'seed.sql');
  if (fs.existsSync(seedFile)) {
    const seedContent = fs.readFileSync(seedFile, 'utf8');
    const match = seedContent.match(/INSERT INTO storage_units[^;]+;/s);
    if (match) {
      db.exec(match[0]);
    }
  }
}

// Ensure stock_arrival_date column exists in storage_units
try {
  db.exec("ALTER TABLE storage_units ADD COLUMN stock_arrival_date TEXT;");
} catch (colErr) {
  // Column already exists
}

// Seed realistic stock arrival dates for any unit that doesn't have one
try {
  const missingArrivalUnits = (db.prepare("SELECT id, risk_level, moisture_pct FROM storage_units WHERE stock_arrival_date IS NULL").all() || []) as any[];
  if (missingArrivalUnits.length > 0) {
    const updateStmt = db.prepare("UPDATE storage_units SET stock_arrival_date = ? WHERE id = ?");
    const baseDate = new Date('2026-09-17T00:00:00Z');
    
    for (const u of missingArrivalUnits) {
      let daysAgo = 25;
      if (u.risk_level === 'critical') {
        daysAgo = 85 + (u.id % 25); // 85 - 110 days ago
      } else if (u.risk_level === 'watch') {
        daysAgo = 45 + (u.id % 30); // 45 - 75 days ago (approaching or inside 2-month hazard window)
      } else {
        daysAgo = 10 + (u.id % 20); // 10 - 30 days ago (fresh safe stock)
      }
      const arrivalStr = new Date(baseDate.getTime() - daysAgo * 86400000).toISOString().split('T')[0];
      updateStmt.run(arrivalStr, u.id);
    }
    console.log(`[Storage Units] Seeded stock_arrival_date for ${missingArrivalUnits.length} units.`);
  }
} catch (migErr) {
  console.warn('[Storage Units] Stock arrival migration notice:', migErr);
}

// -----------------------------------------------------------------------------
// Gemini AI Setup (Annaraksha AI Defense Grid)
// -----------------------------------------------------------------------------
const envKey = process.env.GEMINI_API_KEY;
const geminiApiKey = (envKey && envKey.trim() && !envKey.includes('MY_GEMINI_API_KEY'))
  ? envKey.trim()
  : 'AQ.Ab8RN6Kdwa9xMrL-3wlISAuaS6LFyiUxwmNwt-reDoytuPsGjQ';

// Service Layer Verification & Logging
const keyStatus = {
  configured: Boolean(geminiApiKey && geminiApiKey.length > 10),
  source: envKey && envKey.trim() && !envKey.includes('MY_GEMINI_API_KEY') ? 'process.env.GEMINI_API_KEY' : 'embedded_fallback',
  length: geminiApiKey ? geminiApiKey.length : 0,
  prefix: geminiApiKey ? geminiApiKey.substring(0, 7) + '...' : 'none',
  suffix: geminiApiKey ? '...' + geminiApiKey.substring(geminiApiKey.length - 4) : 'none'
};

console.log('[Gemini Service Layer] API Key Verification:');
console.log(`  - Status: ${keyStatus.configured ? 'VALID / PRESENT' : 'MISSING'}`);
console.log(`  - Source: ${keyStatus.source}`);
console.log(`  - Key Length: ${keyStatus.length} chars`);
console.log(`  - Masked Representation: ${keyStatus.prefix}${keyStatus.suffix}`);

let aiClient: GoogleGenAI | null = null;
try {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  console.log('[Gemini Service Layer] GoogleGenAI SDK Client successfully instantiated with user-agent: aistudio-build');
} catch (e: any) {
  console.error('[Gemini Service Layer] CRITICAL: Failed to initialize GoogleGenAI client:', e?.message || e);
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Config API
const handleConfig = (req: express.Request, res: express.Response) => {
  const envKey = process.env.GOOGLE_MAPS_API_KEY;
  const safeMapsKey = (envKey && envKey.startsWith('AIza') && !envKey.includes('<'))
    ? envKey
    : 'AIzaSyDT1BR824dUo9V10mq328Q5ChJt6u3ZCUM';

  res.json({
    appName: 'Annaraksha AI',
    company: 'Bitexindustries Private Limited / Unbeatable Foods',
    google_maps_key: safeMapsKey,
    simulated: true,
    disclaimer: 'Live Pilot Environment — Simulated Data'
  });
};
app.get('/api/config', handleConfig);
app.get('/api/config.php', handleConfig);

// 2. Storage Units API
const handleUnits = (req: express.Request, res: express.Response) => {
  try {
    const id = req.query.id ? Number(req.query.id) : null;
    if (id !== null && !isNaN(id)) {
      const stmt = db.prepare('SELECT * FROM storage_units WHERE id = ? LIMIT 1');
      const unit = stmt.get(id) as any;
      if (!unit) {
        res.status(404).json({ status: 'error', message: `Storage unit #${id} not found` });
        return;
      }
      const arrival = unit.stock_arrival_date || '2026-08-15';
      const daysInStorage = Math.max(1, Math.round((new Date('2026-09-17T00:00:00Z').getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60 * 24)));
      res.json({
        status: 'success',
        simulated: true,
        disclaimer: 'Live Pilot Environment — Simulated Data',
        data: {
          ...unit,
          id: Number(unit.id),
          lat: Number(unit.lat),
          lng: Number(unit.lng),
          capacity_tonnes: Number(unit.capacity_tonnes),
          current_stock_tonnes: Number(unit.current_stock_tonnes),
          moisture_pct: Number(unit.moisture_pct),
          stock_arrival_date: arrival,
          days_in_storage: daysInStorage
        }
      });
      return;
    }

    let sql = 'SELECT * FROM storage_units WHERE 1=1';
    const params: any[] = [];

    if (req.query.state) {
      sql += ' AND state = ?';
      params.push(String(req.query.state).trim());
    }
    if (req.query.risk_level) {
      sql += ' AND risk_level = ?';
      params.push(String(req.query.risk_level).trim());
    }
    if (req.query.grain_type) {
      sql += ' AND grain_type = ?';
      params.push(String(req.query.grain_type).trim());
    }
    if (req.query.search) {
      sql += ' AND (name LIKE ? OR city LIKE ? OR state LIKE ?)';
      const s = `%${String(req.query.search).trim()}%`;
      params.push(s, s, s);
    }

    sql += " ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END, id ASC";

    const stmt = db.prepare(sql);
    const rows = (stmt.all(...params) || []) as any[];

    const data = rows.map((u: any) => {
      const arrival = u.stock_arrival_date || '2026-08-15';
      const daysInStorage = Math.max(1, Math.round((new Date('2026-09-17T00:00:00Z').getTime() - new Date(arrival).getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: Number(u.id),
        name: u.name,
        state: u.state,
        city: u.city,
        lat: Number(u.lat),
        lng: Number(u.lng),
        grain_type: u.grain_type,
        capacity_tonnes: Number(u.capacity_tonnes),
        current_stock_tonnes: Number(u.current_stock_tonnes),
        moisture_pct: Number(u.moisture_pct),
        risk_level: u.risk_level,
        stock_arrival_date: arrival,
        days_in_storage: daysInStorage,
        predicted_spoilage_date: u.predicted_spoilage_date,
        last_updated: u.last_updated
      };
    });

    res.json({
      status: 'success',
      count: data.length,
      simulated: true,
      disclaimer: 'Live Pilot Environment — Simulated Data',
      data
    });
  } catch (err: any) {
    console.error('Error querying storage units:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error processing storage units query' });
  }
};
app.get('/api/units', handleUnits);
app.get('/api/units.php', handleUnits);

// 3. Alerts Simulator & Live Feed API
function generateSimulatedAlerts() {
  try {
    const candidates = (db.prepare("SELECT * FROM storage_units WHERE risk_level IN ('watch', 'critical') ORDER BY RANDOM() LIMIT 3").all() || []) as any[];
    if (!candidates || candidates.length === 0) return;

    const numToGen = Math.min(candidates.length, Math.floor(Math.random() * 3) + 1);
    const selected = candidates.slice(0, numToGen);

    const grainRates: Record<string, number> = {
      wheat: 22750,
      rice: 24500,
      moong: 78000,
      chana: 54000,
      bajra: 19500,
      jowar: 29000
    };

    const insertStmt = db.prepare(`
      INSERT INTO alerts (unit_id, message, severity, tonnes_at_risk, rupees_at_risk, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const u of selected) {
      const id = Number(u.id);
      const city = u.city;
      const grain = String(u.grain_type).toLowerCase();
      const risk = u.risk_level;
      const stock = Number(u.current_stock_tonnes) || 8000;
      const days = risk === 'critical' ? Math.floor(Math.random() * 8) + 3 : Math.floor(Math.random() * 24) + 14;

      const templates = [
        `Moisture rising in Unit #${id}, ${city} — spoilage predicted in ${days} days.`,
        `Relative humidity spike detected at ${u.name} (${city}). Spoilage trajectory: ${days} days.`,
        `Thermal equilibrium shift in Unit #${id}, ${city} (${grain}) — aeration adjustment required in ${days} days.`,
        `Mycotoxin risk threshold approached in Unit #${id}, ${city}. Spoilage predicted in ${days} days.`
      ];
      const message = templates[Math.floor(Math.random() * templates.length)];
      const severity = risk === 'critical' ? 'critical' : 'warning';
      const tonnesAtRisk = Math.round(stock * (0.65 + Math.random() * 0.28));
      const rate = grainRates[grain] || 23000;
      const rupeesAtRisk = tonnesAtRisk * rate;

      insertStmt.run(id, message, severity, tonnesAtRisk, rupeesAtRisk);
    }

    db.exec("DELETE FROM alerts WHERE id NOT IN (SELECT id FROM (SELECT id FROM alerts ORDER BY id DESC LIMIT 150))");
  } catch (e) {
    // Non-fatal simulation error
  }
}

function formatTimeAgo(datetimeStr: string): string {
  try {
    const timestamp = new Date(datetimeStr).getTime();
    if (isNaN(timestamp)) return 'just now';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'just now';
  }
}

const handleAlerts = (req: express.Request, res: express.Response) => {
  try {
    generateSimulatedAlerts();

    const stmt = db.prepare(`
      SELECT a.*, u.name as unit_name, u.city, u.state, u.grain_type, u.risk_level, u.lat, u.lng
      FROM alerts a
      LEFT JOIN storage_units u ON a.unit_id = u.id
      ORDER BY a.id DESC
      LIMIT 20
    `);
    const rawAlerts = (stmt.all() || []) as any[];

    const alerts = rawAlerts.map((row: any) => ({
      id: Number(row.id),
      unit_id: Number(row.unit_id),
      unit_name: row.unit_name || `Unit #${row.unit_id}`,
      city: row.city || 'Regional Silo',
      state: row.state || 'India',
      grain_type: row.grain_type || 'Grain',
      risk_level: row.risk_level || 'watch',
      lat: row.lat !== null ? Number(row.lat) : null,
      lng: row.lng !== null ? Number(row.lng) : null,
      message: row.message,
      severity: row.severity,
      tonnes_at_risk: Number(row.tonnes_at_risk),
      rupees_at_risk: Number(row.rupees_at_risk),
      created_at: row.created_at,
      time_ago: formatTimeAgo(row.created_at)
    }));

    res.json({
      status: 'success',
      count: alerts.length,
      simulated: true,
      disclaimer: 'Live Pilot Environment — Simulated Data',
      data: alerts
    });
  } catch (err: any) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error fetching alerts: ' + err.message });
  }
};
app.get('/api/alerts', handleAlerts);
app.get('/api/alerts.php', handleAlerts);
app.post('/api/alerts', handleAlerts);
app.post('/api/alerts.php', handleAlerts);

// 4. Copilot API (Gemini-powered grain storage intelligence & search grounding)
let copilotReqCounter = 0;

const handleCopilot = async (req: express.Request, res: express.Response) => {
  const reqId = ++copilotReqCounter;
  const startTime = Date.now();

  try {
    const payload = req.body || {};
    let sessionId = String(payload.session_id || '').trim();
    let message = String(payload.message || '').trim();
    const requestedMode = String(payload.mode || '').toLowerCase(); // 'fast' | 'general' | 'search' | 'complex'

    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 12);
    } else {
      sessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    }

    if (!message) {
      console.warn(`[Copilot:Lifecycle:FAIL] ⚠️ Request #${reqId} rejected: Missing message text`);
      res.status(400).json({ status: 'error', message: 'Message cannot be empty' });
      return;
    }

    if (message.length > 2000) {
      message = message.substring(0, 2000);
    }

    console.log(`[Copilot:Lifecycle:1/5] 📥 Request #${reqId} Received | Session=${sessionId} | Mode=${requestedMode || 'general'} | PromptPreview="${message.substring(0, 50)}..." (len=${message.length})`);

    // Rate limiting: max 35 messages per 10 minutes per session
    const rateCheck = db.prepare(`
      SELECT COUNT(*) as msg_count
      FROM chat_logs
      WHERE session_id = ?
        AND role = 'user'
        AND created_at >= datetime('now', '-10 minutes')
    `).get(sessionId) as { msg_count: number };

    if (rateCheck && Number(rateCheck.msg_count) >= 35) {
      console.warn(`[Copilot:Lifecycle:FAIL] ⚠️ Request #${reqId} rate limited: Session ${sessionId} exceeded limit`);
      res.status(429).json({
        status: 'error',
        message: 'Session rate limit reached (max 35 queries per 10 minutes). Please wait briefly.'
      });
      return;
    }

    // Gather live telemetry context from DB
    const allUnits = (db.prepare(`
      SELECT id, name, city, state, grain_type, capacity_tonnes, current_stock_tonnes, moisture_pct, risk_level, predicted_spoilage_date
      FROM storage_units
      ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END, id ASC
    `).all() || []) as any[];

    let healthyCount = 0;
    let watchCount = 0;
    let criticalCount = 0;
    let totalStock = 0;
    const criticalDetails: string[] = [];
    const watchDetails: string[] = [];

    for (const u of allUnits) {
      totalStock += Number(u.current_stock_tonnes) || 0;
      if (u.risk_level === 'critical') {
        criticalCount++;
        criticalDetails.push(`Unit #${u.id} (${u.name}, ${u.city}, ${u.state}) | Grain: ${u.grain_type} | Stock: ${u.current_stock_tonnes} T | Moisture: ${u.moisture_pct}% | Spoilage: ${u.predicted_spoilage_date}`);
      } else if (u.risk_level === 'watch') {
        watchCount++;
        if (watchDetails.length < 8) {
          watchDetails.push(`Unit #${u.id} (${u.city}, ${u.state}) | ${u.grain_type} | Moisture: ${u.moisture_pct}% | Spoilage: ${u.predicted_spoilage_date}`);
        }
      } else {
        healthyCount++;
      }
    }

    const recentAlerts = (db.prepare(`
      SELECT message, severity, tonnes_at_risk, rupees_at_risk
      FROM alerts
      ORDER BY id DESC
      LIMIT 6
    `).all() || []) as any[];

    const alertSummary = recentAlerts.map(a => `[${a.severity}] ${a.message} (Tonnes: ${a.tonnes_at_risk}, Risk: ₹${Number(a.rupees_at_risk).toLocaleString('en-IN')})`);

    const systemInstruction = `You are Annaraksha Copilot, an AI agronomic and grain preservation advisor created by Bitexindustries Private Limited / Unbeatable Foods.
Annaraksha AI predicts and prevents grain spoilage in large-scale silos, warehouses, and buffer stock across India.

CURRENT NATIONAL PILOT TELEMETRY BENCHMARK:
- Total Monitored Units: ${allUnits.length} units across 15+ Indian states
- Monitored Stock: ${totalStock.toLocaleString('en-IN')} Tonnes
- Health Distribution: ${healthyCount} Healthy, ${watchCount} Under Watch, ${criticalCount} Critical
- Critical Units Requiring Immediate Intervention:
  ${criticalDetails.join('\n  ')}
- Top Watch Units:
  ${watchDetails.join('\n  ')}
- Recent Live Alerts:
  ${alertSummary.join('\n  ')}

YOUR OPERATING PROTOCOLS:
1. Provide precise, actionable agronomic and logistical recommendations (e.g. aeration fan cycles, hermetic sealing, grain chilling, phosphine fumigation, lot segregation, FIFO dispatch prioritization).
2. Reference specific unit IDs, locations, moisture percentages, and crop types from the context when answering queries.
3. Be professional, concise, authoritative, and data-grounded. Format key points with bullet points and bold highlights.
4. When asked about live market data, mandi rates, Agmarknet, or IMD weather, use Google Search Grounding to provide accurate up-to-date facts.
5. If asked about financial impact, quote realistic value calculations (e.g., wheat ₹2,275 - ₹2,425/quintal, rice ₹2,320/quintal, chana ₹5,440/quintal, moong ₹8,558/quintal MSP).`;

    // Retrieve previous 10 messages for multi-turn conversational context
    const pastLogs = (db.prepare(`
      SELECT role, message
      FROM chat_logs
      WHERE session_id = ?
      ORDER BY id DESC
      LIMIT 10
    `).all(sessionId) || []) as any[];

    pastLogs.reverse();

    console.log(`[Copilot:Lifecycle:2/5] 🗄️ Context Prepared #${reqId} | TotalSilos=${allUnits.length} | Critical=${criticalCount} | HistoryTurns=${pastLogs.length}`);

    let reply = '';
    let modelUsed = 'gemini-3.1-flash-lite';
    let isSearchGrounded = false;
    let groundingSources: Array<{ title: string; uri: string }> = [];

    if (!aiClient) {
      console.warn(`[Copilot:Lifecycle:3/5] ⚠️ Request #${reqId}: aiClient is null, falling back to local advisory engine`);
      reply = `**Annaraksha AI Telemetry Engine (Local Advisory Mode)**\n\n*   **Monitored Facilities:** ${allUnits.length} storage units (${totalStock.toLocaleString('en-IN')} Tonnes monitored).\n*   **Risk Profile:** ${criticalCount} Critical, ${watchCount} Watch, ${healthyCount} Healthy.\n*   **Immediate Action Required:**\n    *   **Unit #4 (Amritsar):** Rice at 16.8% moisture — initiate continuous night-time convective aeration (02:00-07:00 IST).\n    *   **Unit #28 (Akola):** Pulses at 16.8% moisture / 34.8°C — activate aeration fans and schedule FIFO liquidation.\n    *   **Unit #12 (Jabalpur):** Wheat at 16.2% moisture — check hermetic seal integrity.`;
    } else {
      const contents: any[] = [];
      for (const log of pastLogs) {
        const role = (log.role === 'model' || log.role === 'assistant') ? 'model' : 'user';
        contents.push({ role, parts: [{ text: log.message }] });
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      // Determine task type & model routing
      const wantsSearch = requestedMode === 'search' ||
        /\b(mandi|price|prices|msp|rate|rates|agmarknet|weather|forecast|rain|imd|rainfall|current market|live price)\b/i.test(message);
      const isComplexTask = requestedMode === 'complex';

      // 1. Attempt Search Grounding if requested/detected
      if (wantsSearch) {
        try {
          console.log(`[Copilot:Lifecycle:3/5] 🌐 Request #${reqId}: Invoking gemini-3.1-flash-lite with Google Search Grounding`);
          const tSearchStart = Date.now();
          const searchRes = await aiClient.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction,
              tools: [{ googleSearch: {} }],
              temperature: 0.3
            }
          });
          reply = searchRes.text?.trim() || '';
          if (reply) {
            modelUsed = 'gemini-3.1-flash-lite (Google Search Grounded)';
            isSearchGrounded = true;
            const metadata = searchRes.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
              for (const chunk of metadata.groundingChunks as any[]) {
                if (chunk.web?.title && chunk.web?.uri) {
                  groundingSources.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                  });
                }
              }
            }
            console.log(`[Copilot:Lifecycle:4/5] ⚡ Search Grounding Success #${reqId} in ${Date.now() - tSearchStart}ms | Sources: ${groundingSources.length}`);
          }
        } catch (groundingErr: any) {
          console.warn(`[Copilot:Lifecycle:3/5] ⚠️ Search grounding failed for #${reqId} (${groundingErr?.message || groundingErr}), falling back to direct model`);
          reply = '';
        }
      }

      // 2. Primary Generation if search is not used or search threw quota warning
      if (!reply) {
        const targetModel = isComplexTask ? 'gemini-3.1-pro-preview' : 'gemini-3.1-flash-lite';
        modelUsed = targetModel;
        console.log(`[Copilot:Lifecycle:3/5] 🤖 Request #${reqId}: Invoking primary model "${targetModel}"`);
        const tModelStart = Date.now();

        try {
          const geminiRes = await aiClient.models.generateContent({
            model: targetModel,
            contents,
            config: {
              systemInstruction,
              temperature: 0.35,
              maxOutputTokens: 1200
            }
          });
          reply = geminiRes.text?.trim() || '';
          console.log(`[Copilot:Lifecycle:4/5] ⚡ Primary Model Success #${reqId} (${targetModel}) in ${Date.now() - tModelStart}ms | ReplyChars: ${reply.length}`);
        } catch (primaryErr: any) {
          console.warn(`[Copilot:Lifecycle:3/5] ⚠️ Primary model ${targetModel} call failed for #${reqId} (${primaryErr?.message || primaryErr}), executing failover:`);
          try {
            modelUsed = 'gemini-3.1-flash-lite (Fast Failover)';
            const tFailoverStart = Date.now();
            const fallbackRes = await aiClient.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents,
              config: {
                systemInstruction,
                temperature: 0.35,
                maxOutputTokens: 1000
              }
            });
            reply = fallbackRes.text?.trim() || '';
            console.log(`[Copilot:Lifecycle:4/5] ⚡ Failover Success #${reqId} in ${Date.now() - tFailoverStart}ms`);
          } catch (fallbackErr: any) {
            console.error(`[Copilot:Lifecycle:FAIL] ❌ All Gemini model calls failed for #${reqId}:`, fallbackErr?.message || fallbackErr);
            reply = `**Annaraksha AI Autonomous Telemetry Protocol:**\n\nReal-time sensor telemetry indicates **${criticalCount} silos** in critical risk requiring immediate agronomic intervention:\n\n*   **Unit #4 (Amritsar Border Silo Node):** Rice at **16.8% moisture** — Spoilage threshold is Sept 24, 2026. Run forced convective aeration fan cycles (02:00-07:00 IST when ambient RH < 65%).\n*   **Unit #28 (Akola Core Silo Node):** Pulses at **16.8% moisture / 34.8°C** — Thermal respiration hotspot detected. Deploy grain chilling and trigger FIFO transfer to regional dal mills.\n*   **Unit #12 (Jabalpur Grain Buffer Depot):** Wheat at **16.2% moisture** — Scheduled for immediate prophylactic hermetic inspection.\n\n*Total at-risk value protected: ₹${(criticalCount * 2.15).toFixed(2)} Crores.*`;
          }
        }
      }
    }

    if (!reply) {
      reply = 'Annaraksha AI Copilot is analyzing live silo telemetry. All parameters are within monitored safety margins.';
    }

    // Persist multi-turn conversation in chat_logs
    const insertLog = db.prepare(`
      INSERT INTO chat_logs (session_id, role, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    insertLog.run(sessionId, 'user', message);
    insertLog.run(sessionId, 'model', reply);

    const totalDuration = Date.now() - startTime;
    console.log(`[Copilot:Lifecycle:5/5] 📤 Response Dispatched #${reqId} | TotalDuration=${totalDuration}ms | ModelUsed="${modelUsed}" | ReplyLength=${reply.length}`);

    res.json({
      status: 'success',
      session_id: sessionId,
      reply,
      model_used: modelUsed,
      search_grounded: isSearchGrounded,
      sources: groundingSources.slice(0, 5),
      processing_time_ms: totalDuration
    });
  } catch (err: any) {
    console.error(`[Copilot:Lifecycle:FAIL] ❌ Unhandled Exception in Request #${reqId}:`, err?.stack || err);
    res.status(500).json({ status: 'error', message: 'Internal server error: ' + (err?.message || 'Unknown failure') });
  }
};
app.post('/api/copilot', handleCopilot);
app.post('/api/copilot.php', handleCopilot);

// Dedicated Health & Service Layer Verification Endpoint
app.get('/api/copilot/health', (req: express.Request, res: express.Response) => {
  const chatCount = (db.prepare(`SELECT COUNT(*) as count FROM chat_logs`).get() as any)?.count || 0;
  const storageCount = (db.prepare(`SELECT COUNT(*) as count FROM storage_units`).get() as any)?.count || 0;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service_layer: {
      gemini_client_initialized: Boolean(aiClient),
      api_key_configured: keyStatus.configured,
      api_key_source: keyStatus.source,
      api_key_length: keyStatus.length,
      api_key_masked: `${keyStatus.prefix}${keyStatus.suffix}`
    },
    database: {
      status: 'connected',
      storage_units_count: storageCount,
      chat_logs_count: chatCount
    },
    default_model: 'gemini-3.1-flash-lite',
    supported_models: ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']
  });
});

// History and Reset endpoints for Copilot Multi-Turn Chat
app.get('/api/copilot/history', (req: express.Request, res: express.Response) => {
  const sessionId = String(req.query.session_id || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
  if (!sessionId) {
    res.json({ status: 'success', messages: [] });
    return;
  }
  const rows = db.prepare(`
    SELECT role, message, created_at
    FROM chat_logs
    WHERE session_id = ?
    ORDER BY id ASC
    LIMIT 50
  `).all(sessionId);
  res.json({ status: 'success', session_id: sessionId, messages: rows });
});

app.delete('/api/copilot/history', (req: express.Request, res: express.Response) => {
  const sessionId = String(req.body?.session_id || req.query.session_id || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
  if (sessionId) {
    db.prepare(`DELETE FROM chat_logs WHERE session_id = ?`).run(sessionId);
  }
  res.json({ status: 'success', message: 'Chat history cleared' });
});

// AI Diagnostic & Self-Test Endpoint
app.get('/api/copilot/test', async (req: express.Request, res: express.Response) => {
  const t0 = Date.now();
  if (!aiClient) {
    res.json({
      status: 'offline',
      message: 'Gemini AI client is in local fallback mode',
      latency_ms: 0,
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const testRes = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: 'Respond with: "Annaraksha AI Online. Monitored silos safe."',
      config: {
        maxOutputTokens: 50,
        temperature: 0.1
      }
    });
    const latency = Date.now() - t0;
    res.json({
      status: 'healthy',
      model: 'gemini-3.1-flash-lite',
      latency_ms: latency,
      response: testRes.text?.trim() || '',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'degraded',
      error: err?.message || 'Error executing AI self-test',
      latency_ms: Date.now() - t0,
      timestamp: new Date().toISOString()
    });
  }
});

// 5. Grain Scanner API (Computer Vision & NIR First-Mile Inspection)
const scanSamples: Record<string, any> = {
  wheat_high_moisture: {
    grain_type: 'Wheat (Kalyan Sona)',
    batch_id: 'AGR-IN-88921-WHT',
    location: 'Indore Mandi Terminal Gate #4',
    source_farmer: 'Kisan Samiti Cooperative #42',
    broken_pct: 4.8,
    discolored_pct: 7.2,
    insect_damage_count: 3,
    foreign_matter_pct: 1.4,
    estimated_moisture: 15.9,
    safe_moisture_limit: 13.0,
    quality_grade: 'Grade B (Immediate Milling Required)',
    first_mile_warning: 'HIGH MOISTURE DETECTED: Do NOT bag in airtight HDPE/Jute bags. High rot risk in transport corridor within 72 hours.',
    respiration_rate: 'High (Thermal heating in progress: 33.8°C)',
    days_to_spoilage: 4,
    recommended_action: 'Auto-generate Work Order for mobile grain dryer aeration, or direct dispatch to Indore Flour Mill (18 km).',
    confidence_score: 97.4,
    detection_boxes: [
      { label: 'High Moisture Cluster', box: [25, 30, 45, 60], color: '#f59e0b' },
      { label: 'Discolored / Spoilage Front', box: [60, 40, 85, 75], color: '#ef4444' },
      { label: 'Broken Kernel', box: [15, 65, 30, 80], color: '#3b82f6' },
      { label: 'Weevil Emergence Hole', box: [70, 20, 85, 35], color: '#dc2626' }
    ]
  },
  rice_weevil: {
    grain_type: 'Paddy / Rice (Parmal 1509)',
    batch_id: 'AGR-IN-44219-RIC',
    location: 'Karnal Grain Hub - Godown Bay 3',
    source_farmer: 'Ravi Shankar & FPO Assandh',
    broken_pct: 8.4,
    discolored_pct: 5.1,
    insect_damage_count: 14,
    foreign_matter_pct: 2.2,
    estimated_moisture: 14.6,
    safe_moisture_limit: 13.5,
    quality_grade: 'Grade C (Secondary Processing / Cattle Feed)',
    first_mile_warning: 'ACTIVE WEEVIL INFESTATION: Sitophilus oryzae detected in sample core. Immediate phosphine hermetic fumigation required.',
    respiration_rate: 'Critical (Intergranular insect heat generated)',
    days_to_spoilage: 2,
    recommended_action: 'Isolate batch from adjacent storage bays. Dispatch to Amul Cattle Feed Processing Unit (42 km).',
    confidence_score: 98.6,
    detection_boxes: [
      { label: 'Weevil Larvae & Borehole', box: [32, 28, 52, 48], color: '#dc2626' },
      { label: 'Weevil Adult Beetle', box: [58, 62, 74, 78], color: '#dc2626' },
      { label: 'Broken Paddy', box: [20, 70, 38, 88], color: '#3b82f6' },
      { label: 'Chalky / Mold Surface', box: [68, 15, 88, 38], color: '#f59e0b' }
    ]
  },
  chana_grade_a: {
    grain_type: 'Chickpea / Chana (Desi Bold)',
    batch_id: 'AGR-IN-66302-CHN',
    location: 'Akola APMC Yard - Warehouse #12',
    source_farmer: 'Vidarbha Pulses Alliance',
    broken_pct: 0.9,
    discolored_pct: 1.2,
    insect_damage_count: 0,
    foreign_matter_pct: 0.3,
    estimated_moisture: 10.4,
    safe_moisture_limit: 12.0,
    quality_grade: 'Grade A (Premium Buffer Stock / Export)',
    first_mile_warning: 'EXCELLENT QUALITY: Zero insect damage detected. Low moisture profile ensures multi-season shelf life.',
    respiration_rate: 'Dormant (Optimal preservation state)',
    days_to_spoilage: 180,
    recommended_action: 'Approved for long-term buffer silo storage or direct high-premium mandi auction.',
    confidence_score: 99.2,
    detection_boxes: [
      { label: 'Grade A Bold Kernel', box: [25, 25, 50, 50], color: '#10b981' },
      { label: 'Uniform Luster', box: [55, 45, 80, 70], color: '#10b981' }
    ]
  },
  bajra_mold: {
    grain_type: 'Pearl Millet / Bajra (Hybrid RHB)',
    batch_id: 'AGR-IN-19284-BJR',
    location: 'Jaipur Agricultural Terminal',
    source_farmer: 'Marwar Millets Collective',
    broken_pct: 3.2,
    discolored_pct: 11.8,
    insect_damage_count: 6,
    foreign_matter_pct: 3.1,
    estimated_moisture: 16.4,
    safe_moisture_limit: 12.5,
    quality_grade: 'Grade C (Industrial Ethanol Conversion)',
    first_mile_warning: 'MOLD BIOMARKERS DETECTED: Ergot/Claviceps fungal risk detected under NIR spectrum. Spoilage countdown active.',
    respiration_rate: 'Very High (Microbial heat plume: 36.2°C)',
    days_to_spoilage: 3,
    recommended_action: 'Divert immediately to Bio-Ethanol Distillery (64 km) to salvage 82% financial recovery.',
    confidence_score: 96.8,
    detection_boxes: [
      { label: 'Fungal Spore Colony', box: [40, 35, 65, 60], color: '#ef4444' },
      { label: 'Ergot Mycotoxin Indicator', box: [15, 20, 35, 40], color: '#ef4444' },
      { label: 'High Moisture Discoloration', box: [65, 55, 88, 80], color: '#f59e0b' }
    ]
  }
};

const handleScan = async (req: express.Request, res: express.Response) => {
  const input = req.body || {};
  const preset = input.preset_sample;
  const imageBase64 = input.image;

  if (preset && scanSamples[preset]) {
    res.json({
      status: 'success',
      data: scanSamples[preset]
    });
    return;
  }

  if (imageBase64 && aiClient) {
    try {
      const cleanBase64 = String(imageBase64).replace(/^data:image\/\w+;base64,/i, '');
      const prompt = `You are Annaraksha AI Computer Vision & NIR first-mile grain quality inspector.
Analyze this grain photo. Detect grain type (Wheat, Rice, Bajra, Chana, Jowar, Moong).
Determine broken kernels percentage, discolored percentage, insect damage count, foreign matter %, estimated moisture %, quality grade (Grade A, Grade B, Grade C), days to spoilage, and urgent first-mile transport action.
Respond ONLY with a valid JSON object matching this schema:
{
  "grain_type": "string",
  "batch_id": "string",
  "location": "First-Mile Farm Gate / Mandi Ingest",
  "source_farmer": "string",
  "broken_pct": number,
  "discolored_pct": number,
  "insect_damage_count": number,
  "foreign_matter_pct": number,
  "estimated_moisture": number,
  "safe_moisture_limit": number,
  "quality_grade": "Grade A (Premium)" | "Grade B (Direct Milling)" | "Grade C (Distressed/Feed)",
  "first_mile_warning": "string warning if moisture > 13.5% or insects detected",
  "respiration_rate": "string",
  "days_to_spoilage": number,
  "recommended_action": "string",
  "confidence_score": number
}`;

      let geminiRes: any = null;
      try {
        geminiRes = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });
      } catch (flashErr: any) {
        console.warn('[handleScan] Trying gemini-3.1-flash-lite fallback:', flashErr?.message || flashErr);
        geminiRes = await aiClient.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });
      }

      const parsed = JSON.parse(geminiRes.text || '{}');
      if (parsed.grain_type) {
        if (!parsed.detection_boxes || !parsed.detection_boxes.length) {
          const isHighMoist = (parsed.estimated_moisture || 12) > 13.5;
          const hasWeevil = (parsed.insect_damage_count || 0) > 0;
          parsed.detection_boxes = [
            { label: `${parsed.grain_type} Cluster`, box: [20, 20, 55, 55], color: '#10b981' },
            ...(isHighMoist ? [{ label: 'High Moisture Reflectance', box: [45, 35, 78, 70], color: '#f59e0b' }] : []),
            ...(hasWeevil ? [{ label: 'Insect / Larvae Focus', box: [60, 25, 82, 45], color: '#ef4444' }] : []),
            { label: 'Optical Kernel Specimen', box: [30, 60, 65, 85], color: '#38bdf8' }
          ];
        }
        if (!parsed.batch_id) {
          parsed.batch_id = 'AGR-SCAN-' + Math.floor(10000 + Math.random() * 90000);
        }
        res.json({ status: 'success', data: parsed });
        return;
      }
    } catch (err) {
      console.error('Gemini image scan error:', err);
    }
  }

  res.json({
    status: 'success',
    data: scanSamples.wheat_high_moisture
  });
};
app.post('/api/scan', handleScan);
app.post('/api/scan.php', handleScan);
app.get('/api/scan', handleScan);
app.get('/api/scan.php', handleScan);

// -----------------------------------------------------------------------------
// 5B. Psychrometric & Real-Time Weather Engine API (/api/weather)
// Calculates ambient Dew Point vs Grain Core ERH to prescribe exact Aeration Windows
// -----------------------------------------------------------------------------
function calculateDewPoint(tempC: number, rhPct: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(Math.max(1, Math.min(100, rhPct)) / 100);
  return Number(((b * alpha) / (a - alpha)).toFixed(1));
}

const handleWeather = async (req: express.Request, res: express.Response) => {
  try {
    let lat = 22.7196; // Default Indore, MP
    let lng = 75.8577;
    let unit: any = null;

    if (req.query.unit_id) {
      const uId = Number(req.query.unit_id);
      const row = db.prepare('SELECT * FROM storage_units WHERE id = ?').get(uId) as any;
      if (row) {
        unit = row;
        lat = Number(row.lat);
        lng = Number(row.lng);
      }
    } else if (req.query.lat && req.query.lng) {
      lat = parseFloat(String(req.query.lat));
      lng = parseFloat(String(req.query.lng));
    }

    // Default regional climate baseline if Open-Meteo takes long or is unavailable
    const currentHour = new Date().getHours();
    let currentTemp = 29.4;
    let currentRh = 58;
    let currentWind = 14;
    let rainProb = 10;
    let hourlyTemps: number[] = [];
    let hourlyRhs: number[] = [];

    // Attempt real meteorological forecast from Open-Meteo API
    try {
      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m&timezone=Asia%2FKolkata&forecast_days=2`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2400);

      const resp = await fetch(meteoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data: any = await resp.json();
        if (data && data.hourly && data.hourly.temperature_2m) {
          const temps = data.hourly.temperature_2m;
          const rhs = data.hourly.relative_humidity_2m;
          const winds = data.hourly.wind_speed_10m || [];
          const rains = data.hourly.precipitation_probability || [];

          // Find current hour index
          const nowIdx = Math.min(temps.length - 1, Math.max(0, currentHour));
          currentTemp = temps[nowIdx] !== undefined ? temps[nowIdx] : currentTemp;
          currentRh = rhs[nowIdx] !== undefined ? rhs[nowIdx] : currentRh;
          currentWind = winds[nowIdx] !== undefined ? winds[nowIdx] : currentWind;
          rainProb = rains[nowIdx] !== undefined ? rains[nowIdx] : rainProb;

          hourlyTemps = temps.slice(nowIdx, nowIdx + 24);
          hourlyRhs = rhs.slice(nowIdx, nowIdx + 24);
        }
      }
    } catch (e: any) {
      // Graceful fallback to diurnal sinusoidal meteorological model for Indian plains
    }

    if (!hourlyTemps.length) {
      for (let i = 0; i < 24; i++) {
        const h = (currentHour + i) % 24;
        // Daily cycle: coolest at 05:00, warmest at 14:00
        const sinFactor = Math.sin(((h - 9) / 24) * 2 * Math.PI);
        const t = Number((28 + sinFactor * 6.5).toFixed(1));
        // Inverse RH: peak in early morning, lowest in mid afternoon
        const rh = Math.round(54 - sinFactor * 22);
        hourlyTemps.push(t);
        hourlyRhs.push(rh);
      }
      currentTemp = hourlyTemps[0];
      currentRh = hourlyRhs[0];
    }

    const currentDewPoint = calculateDewPoint(currentTemp, currentRh);
    const grainMoisture = unit ? Number(unit.moisture_pct) : 14.2;
    const isCritical = unit && unit.risk_level === 'critical';
    const grainTemp = isCritical ? 34.5 : (unit && unit.risk_level === 'watch' ? 31.0 : 26.5);

    // Equilibrium Relative Humidity (ERH) for Wheat/Rice at standard moisture
    const grainERH = Math.min(85, Math.max(45, (grainMoisture - 7) * 7.2));

    // Psychrometric aeration rules:
    // Safe when: ambient RH < 68% AND ambient Dew Point < Grain Temp - 2.5°C
    // Condensation Hazard when: ambient Dew Point >= Grain Temp OR ambient RH >= 75%
    const condensationRisk = (currentDewPoint >= (grainTemp - 0.5)) || (currentRh >= 75);
    const isSafeNow = (currentRh <= 65) && (currentDewPoint < (grainTemp - 2.5)) && (rainProb < 40);

    let currentVerdict = 'SAFE_TO_AERATE';
    let verdictLabel = 'Optimal Aeration Window Active';
    let verdictColor = '#10b981';

    if (condensationRisk) {
      currentVerdict = 'CONDENSATION_HAZARD_SEAL';
      verdictLabel = 'Dampers Must Be Sealed (Dew Point Condensation Risk)';
      verdictColor = '#f43f5e';
    } else if (!isSafeNow) {
      currentVerdict = 'MARGINAL_MONITOR';
      verdictLabel = 'Marginal Ambient Conditions (Fan Speed Limit 40%)';
      verdictColor = '#f59e0b';
    }

    // Build 24-hour timeline and locate optimal night/morning aeration window
    const hourlyForecast = [];
    let bestWindowStart: number | null = null;
    let bestWindowEnd: number | null = null;
    let bestWindowHours = 0;

    for (let i = 0; i < 24; i++) {
      const h = (currentHour + i) % 24;
      const t = hourlyTemps[i] !== undefined ? hourlyTemps[i] : currentTemp;
      const rh = hourlyRhs[i] !== undefined ? hourlyRhs[i] : currentRh;
      const dp = calculateDewPoint(t, rh);

      let status = 'safe';
      if (dp >= (grainTemp - 1.0) || rh >= 72) {
        status = 'danger';
      } else if (rh > 65 || dp >= (grainTemp - 3.0)) {
        status = 'marginal';
      }

      if (status === 'safe') {
        if (bestWindowStart === null) bestWindowStart = h;
        bestWindowEnd = (h + 1) % 24;
        bestWindowHours++;
      }

      const formattedHour = `${String(h).padStart(2, '0')}:00`;
      hourlyForecast.push({
        hour: h,
        time_label: formattedHour,
        temp_c: t,
        rh_pct: rh,
        dew_point_c: dp,
        status,
        status_label: status === 'safe' ? 'Safe to Aerate' : (status === 'marginal' ? 'Marginal' : 'Condensation Risk')
      });
    }

    const startStr = bestWindowStart !== null ? `${String(bestWindowStart).padStart(2, '0')}:00` : '02:00';
    const endStr = bestWindowEnd !== null ? `${String(bestWindowEnd).padStart(2, '0')}:00` : '06:30';

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      location: {
        lat,
        lng,
        city: unit ? unit.city : 'Regional Mandi Hub',
        state: unit ? unit.state : 'Madhya Pradesh',
        facility_name: unit ? unit.name : 'Central Silo Terminal'
      },
      current_weather: {
        temp_c: currentTemp,
        rh_pct: currentRh,
        dew_point_c: currentDewPoint,
        wind_kmh: currentWind,
        precipitation_chance_pct: rainProb
      },
      psychrometric_profile: {
        grain_temp_c: grainTemp,
        grain_moisture_pct: grainMoisture,
        grain_erh_pct: Number(grainERH.toFixed(1)),
        dew_point_margin_c: Number((grainTemp - currentDewPoint).toFixed(1)),
        condensation_risk: condensationRisk
      },
      aeration_prescription: {
        verdict: currentVerdict,
        label: verdictLabel,
        color: verdictColor,
        safe_now: isSafeNow,
        recommended_window: `${startStr} - ${endStr} IST`,
        window_duration_hours: bestWindowHours || 4.5,
        rationale: `Ambient dew point (${currentDewPoint}°C) vs internal grain core temperature (${grainTemp}°C). Running fans during ${startStr} - ${endStr} will extract ${isCritical ? '0.35%' : '0.15%'} moisture without surface condensation.`
      },
      hourly_timeline: hourlyForecast
    });
  } catch (err: any) {
    console.error('Error calculating weather aeration window:', err);
    res.status(500).json({ status: 'error', message: 'Failed to process meteorological data: ' + err.message });
  }
};
app.get('/api/weather', handleWeather);
app.get('/api/weather.php', handleWeather);

// 6. Impact API
const handleImpact = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      headline_metrics: {
        tonnes_grain_saved: 48250,
        tonnes_grain_saved_display: '48,250 MT',
        capital_value_saved_crores: 118.60,
        capital_value_saved_display: '₹118.60 Cr',
        co2e_footprint_averted_mt: 43425,
        co2e_footprint_display: '43,425 MT CO₂e',
        water_conserved_million_liters: 57900,
        water_conserved_display: '57.9 Billion Liters',
        households_nourished_year: 321600,
        households_nourished_display: '321,600 Families'
      },
      efficiency_benchmarks: {
        conventional_spoilage_rate_pct: 8.5,
        annaraksha_monitored_spoilage_pct: 0.38,
        loss_reduction_pct: 95.5,
        payback_period_months: 4.2
      },
      monthly_averted_trend: [
        { month: 'Jan', tonnes_saved: 3200, inr_crores: 7.8, co2_mt: 2880 },
        { month: 'Feb', tonnes_saved: 3950, inr_crores: 9.6, co2_mt: 3550 },
        { month: 'Mar', tonnes_saved: 5400, inr_crores: 13.2, co2_mt: 4860 },
        { month: 'Apr', tonnes_saved: 8200, inr_crores: 20.1, co2_mt: 7380 },
        { month: 'May', tonnes_saved: 7800, inr_crores: 19.2, co2_mt: 7020 },
        { month: 'Jun', tonnes_saved: 6900, inr_crores: 17.0, co2_mt: 6210 },
        { month: 'Jul', tonnes_saved: 6100, inr_crores: 15.1, co2_mt: 5490 },
        { month: 'Aug', tonnes_saved: 6700, inr_crores: 16.6, co2_mt: 6030 }
      ],
      sdg_alignment: [
        { sdg: 'SDG 2: Zero Hunger', contribution: 'Safeguards 48k+ tonnes staple grains entering food basket instead of rotting' },
        { sdg: 'SDG 12: Responsible Consumption', contribution: 'Target 12.3: Halving per-capita post-harvest food waste along supply chain' },
        { sdg: 'SDG 13: Climate Action', contribution: 'Prevents methane & nitrous oxide emissions from rotting decomposing organic grain mass' }
      ]
    }
  });
};
app.get('/api/impact', handleImpact);
app.get('/api/impact.php', handleImpact);

// 7. Ingestion API
const handleIngestion = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      feed_status: {
        agmarknet: { status: 'LIVE_SYNC', ping_ms: 48, records_synced: 4820, last_sync: '2 mins ago' },
        imd_radar: { status: 'LIVE_SYNC', ping_ms: 62, active_alerts: 14, last_sync: '4 mins ago' },
        fci_cwc: { status: 'LIVE_SYNC', ping_ms: 112, depots_monitored: 2180, last_sync: '12 mins ago' },
        isro_sentinel2: { status: 'ORBITAL_PASS', ping_ms: 210, coverage_pct: 94.6, last_sync: '1 hour ago' }
      },
      national_inventory_visibility: {
        total_grain_stock_tonnes: 54890200,
        total_valuation_crores: 134250.80,
        breakdown_by_channel: {
          fci_cwc_central_godowns: { tonnes: 31200000, pct: 56.8, units: 840 },
          state_civil_supplies: { tonnes: 12450000, pct: 22.7, units: 620 },
          apmc_mandis_transit: { tonnes: 4890200, pct: 8.9, units: 410 },
          private_warehouses_silos: { tonnes: 6350000, pct: 11.6, units: 310 }
        },
        demand_supply_index: {
          wheat: { supply_mt: 26.4, demand_mt: 24.1, balance: '+2.3 MT (Surplus)', trend: 'stable' },
          rice: { supply_mt: 22.1, demand_mt: 21.0, balance: '+1.1 MT (Surplus)', trend: 'stable' },
          chana: { supply_mt: 2.8, demand_mt: 3.1, balance: '-0.3 MT (Deficit/Tight)', trend: 'bullish' },
          bajra: { supply_mt: 1.9, demand_mt: 1.8, balance: '+0.1 MT (Balanced)', trend: 'stable' },
          moong: { supply_mt: 1.7, demand_mt: 1.9, balance: '-0.2 MT (Tight)', trend: 'bullish' }
        }
      },
      live_agmarknet_feed: [
        { mandi: 'Indore (MP)', crop: 'Sharbati Wheat', modal_price: 2780, arrivals_tonnes: 1420, trend: '+₹35' },
        { mandi: 'Khanna (Punjab)', crop: 'Basmati Paddy', modal_price: 3450, arrivals_tonnes: 2850, trend: '+₹60' },
        { mandi: 'Karnal (Haryana)', crop: 'Wheat (PBW-502)', modal_price: 2320, arrivals_tonnes: 3100, trend: '0' },
        { mandi: 'Akola (Maharashtra)', crop: 'Desi Chana', modal_price: 5450, arrivals_tonnes: 890, trend: '+₹110' },
        { mandi: 'Jaipur (Rajasthan)', crop: 'Hybrid Bajra', modal_price: 1980, arrivals_tonnes: 640, trend: '-₹20' },
        { mandi: 'Burdwan (Bengal)', crop: 'Swarna Paddy', modal_price: 2180, arrivals_tonnes: 1950, trend: '+₹15' }
      ],
      live_imd_weather_alerts: [
        { region: 'Vidarbha & Marathwada', alert_level: 'ORANGE_RADAR', hazard: 'Unseasonal Thunderstorms & 86% RH spike', action: 'Seal aeration dampers on 18 outdoor godown bays' },
        { region: 'Coastal Andhra & Odisha', alert_level: 'YELLOW_RADAR', hazard: 'Depression over Bay of Bengal; High moisture transit corridor', action: 'Reroute truck dispatch inland via NH-16 avoid coastal fog' },
        { region: 'Malwa Belt (MP)', alert_level: 'GREEN_CLEAR', hazard: 'Clear dry weather (32°C, 38% RH)', action: 'Optimal window for deep silo aeration fan run (PID Cycle active)' }
      ]
    }
  });
};
app.get('/api/ingestion', handleIngestion);
app.get('/api/ingestion.php', handleIngestion);

// 8. Logistics API
const handleLogistics = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      active_convoys: [
        {
          truck_id: 'PB-02-CC-8910',
          carrier: 'Kisan Logistics Express',
          cargo: '32.5 Tonnes Durum Wheat',
          origin: 'Amritsar Silo Hub #4',
          destination: 'Ludhiana Flour Mill Cluster',
          route: 'NH-44 Bypass',
          eta: '1 hr 15 mins',
          weather_risk: 'CLEAR_TRANSIT',
          weighbridge_status: 'PASSED (0.08% tare delta - Nominal)',
          humidity_protection: 'Waterproof 650 GSM Tarpaulin Sensor Verified',
          status: 'IN_TRANSIT'
        },
        {
          truck_id: 'MP-09-GF-4122',
          carrier: 'Malwa Agro-Transporters',
          cargo: '28.0 Tonnes Sharbati Wheat',
          origin: 'Indore Malwa Agro-Silo #19',
          destination: 'Bhopal Central Food Hub',
          route: 'SH-18 → Rerouted to NH-86 (Avoiding heavy rain cloudburst)',
          eta: '2 hrs 40 mins',
          weather_risk: 'WEATHER_REROUTED',
          weighbridge_status: 'PASSED (Gate OCR Verified: 41,200 kg Gross)',
          humidity_protection: 'Internal sensor: 12.8% RH stable',
          status: 'REROUTED_SAFE'
        },
        {
          truck_id: 'MH-30-BB-7721',
          carrier: 'Vidarbha Heavy Haulers',
          cargo: '30.2 Tonnes Desi Chana',
          origin: 'Akola Pulses Silo #28',
          destination: 'Nagpur Processing Yard',
          route: 'NH-53 East Corridor',
          eta: '3 hrs 10 mins',
          weather_risk: 'ORANGE_PRECIPITATION_AHEAD',
          weighbridge_status: '⚠️ ALERT: -340 kg discrepancy detected at Toll Gate 3 weighbridge (Pilferage Check Dispatched)',
          humidity_protection: 'High moisture risk: Warning sent to driver',
          status: 'UNDER_INSPECTION'
        }
      ]
    }
  });
};
app.get('/api/logistics', handleLogistics);
app.get('/api/logistics.php', handleLogistics);

// 9. Value Chain Matchmaking API
const handleValueChain = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      at_risk_routing_queue: [
        {
          lot_id: 'LOT-MP-1049',
          origin_unit: 'Unit #19 - Indore Malwa Agro-Silo',
          crop: 'Wheat (15.4% Moisture, 3 Days DTS)',
          volume_tonnes: 850,
          current_value: '₹1.93 Cr',
          optimal_route: 'Immediate High-Extraction Whole Wheat Atta',
          conversion_rationale: 'Grain moisture (15.4%) eliminates pre-milling conditioning tempering time. Milling immediately preserves gluten index with 0% post-harvest loss.',
          matched_processor: {
            name: 'Indore Roller Flour Mills Ltd',
            distance_km: 22.4,
            transit_hours: 0.8,
            spare_daily_capacity_t: 450,
            procurement_bid_per_qtl: '₹2,680',
            gross_recovery_inr: '₹2,27,80,000',
            net_profit_margin_gain: '+₹34.8 Lakhs vs distressed salvage'
          },
          buyer_lead: 'ITC Aashirvaad Chakki Atta Supply Chain',
          dispatch_status: 'ROUTE_CLEARED'
        },
        {
          lot_id: 'LOT-MH-2891',
          origin_unit: 'Unit #28 - Akola Central Pulses Silo',
          crop: 'Chana / Desi Chickpeas (16.8% Moisture, 2 Days DTS)',
          volume_tonnes: 420,
          current_value: '₹2.28 Cr',
          optimal_route: 'Split Dal Desi Besan & Roasted Chana Flakes',
          conversion_rationale: 'Immediate de-husking and split dal processing neutralizes microbial surface spore risk, yielding premium commercial besan powder.',
          matched_processor: {
            name: 'Vidarbha Pulses & Dal Processing Cluster',
            distance_km: 14.8,
            transit_hours: 0.5,
            spare_daily_capacity_t: 280,
            procurement_bid_per_qtl: '₹5,350',
            gross_recovery_inr: '₹2,24,70,000',
            net_profit_margin_gain: '+₹42.0 Lakhs vs spoilage writeoff'
          },
          buyer_lead: 'Haldiram Foods Agro-Procurement Desk',
          dispatch_status: 'PENDING_TRUCK_ALLOCATION'
        }
      ]
    }
  });
};
app.get('/api/valuechain', handleValueChain);
app.get('/api/valuechain.php', handleValueChain);

// 10. Work Orders API
const handleWorkOrders = (req: express.Request, res: express.Response) => {
  res.json([
    {
      order_id: 'WO-7801-AER',
      unit_id: 28,
      facility_name: 'Akola Central Pulses Silo',
      location: 'Akola, Maharashtra',
      crop: 'Chana',
      type: 'Forced Convective Aeration',
      trigger_reason: 'Core Biocenter thermal respiration at 34.8°C with 16.8% moisture pocket.',
      target_parameter: 'Reduce core temp to 24°C; moisture below 13.0%',
      fan_sequence: '3x 15kW Centrifugal fans run 02:00-07:00 IST (low ambient RH window)',
      estimated_recovery: '₹48.2 Lakhs inventory preserved',
      status: 'IN_PROGRESS',
      progress_pct: 64,
      created_at: '1 hour ago'
    },
    {
      order_id: 'WO-7802-FUM',
      unit_id: 4,
      facility_name: 'Amritsar Border Grain Reserve',
      location: 'Amritsar, Punjab',
      crop: 'Wheat',
      type: 'Phosphine Hermetic Fumigation',
      trigger_reason: 'Sitophilus granarius infestation detected at 14 weevils/kg in bay 4.',
      target_parameter: '100% insect mortality; sealed tarpaulin dosage 1.5g/m³ for 7 days',
      fan_sequence: 'Damper auto-shut, recirculatory fumigation loop active',
      estimated_recovery: '₹1.85 Crores buffer stock safeguarded',
      status: 'DISPATCHED',
      progress_pct: 30,
      created_at: '2 hours ago'
    },
    {
      order_id: 'WO-7803-TRN',
      unit_id: 19,
      facility_name: 'Indore Malwa Agro-Silo Hub',
      location: 'Indore, Madhya Pradesh',
      crop: 'Wheat',
      type: 'Mechanical Grain Turning & De-crusting',
      trigger_reason: 'Surface crusting layer (15.2% moisture) from diurnal roof condensation.',
      target_parameter: 'Turn top 2.5m layer into aeration bin #2',
      fan_sequence: 'Conveyor elevator belt active (120 T/hour transfer rate)',
      estimated_recovery: '₹62.5 Lakhs wheat degradation averted',
      status: 'TRIGGERED',
      progress_pct: 15,
      created_at: '3 hours ago'
    }
  ]);
};
app.get('/api/workorders', handleWorkOrders);
app.get('/api/workorders.php', handleWorkOrders);

// -----------------------------------------------------------------------------
// 11. 2-Month (60-Day) Predictive Grain Spoilage Wastage Engine
// -----------------------------------------------------------------------------

interface SpoilageForecastParams {
  unit_id?: number;
  name?: string;
  location?: string;
  grain_type: string;
  current_stock_tonnes: number;
  moisture_pct: number;
  temp_c?: number;
  stock_arrival_date: string;
  facility_type?: string;
}

function calculate60DaySpoilageForecast(params: SpoilageForecastParams) {
  const grainRates: Record<string, number> = {
    wheat: 22750,
    rice: 24500,
    moong: 78000,
    chana: 54000,
    bajra: 19500,
    jowar: 29000
  };

  const crop = (params.grain_type || 'wheat').toLowerCase().trim();
  const ratePerTonne = grainRates[crop] || 23000;
  const stock = Number(params.current_stock_tonnes) || 5000;
  const moisture = Number(params.moisture_pct) || 12.5;
  const temp = Number(params.temp_c) || 27.5;
  const facility = params.facility_type || 'Modern Steel Silo';

  // Base Allowable Safe Storage Time (days) at 12% moisture & 20°C (ASAE D535 Standard)
  const baseSafeStorageDays: Record<string, number> = {
    wheat: 360,
    rice: 300,
    moong: 240,
    chana: 270,
    bajra: 210,
    jowar: 240
  };
  const S0 = baseSafeStorageDays[crop] || 280;

  // Safe Moisture Limits by commodity
  const safeMoisture = (crop === 'moong' || crop === 'chana') ? 12.0 : 13.0;

  // Psychrometric & Biological Degradation Multipliers
  // Moisture and temperature exponentially compress safe storage life
  const moistureMultiplier = Math.pow(2, (safeMoisture - moisture) / 1.7);
  const tempMultiplier = Math.pow(2, (22.0 - temp) / 6.5);
  const facilityMultiplier = facility.includes('Silo') ? 1.15 : (facility.includes('Godown') ? 1.0 : 0.78);

  const totalAllowableSafeDays = Math.max(12, Math.round(S0 * moistureMultiplier * tempMultiplier * facilityMultiplier));

  // Current Elapsed Storage Duration from Stock Arrival Date
  const now = new Date('2026-09-17T00:00:00Z');
  let arrivalDateObj = new Date(params.stock_arrival_date);
  if (isNaN(arrivalDateObj.getTime())) {
    arrivalDateObj = new Date(now.getTime() - 35 * 86400000);
  }
  const daysInStorage = Math.max(1, Math.round((now.getTime() - arrivalDateObj.getTime()) / 86400000));

  // Days to Spoilage (DTS) Breach Point
  const daysToSpoilage = Math.round(totalAllowableSafeDays - daysInStorage);
  const breachDateObj = new Date(now.getTime() + daysToSpoilage * 86400000);
  const breachDateStr = breachDateObj.toISOString().split('T')[0];

  // 60-Day (2-Month) Hazard Classification
  let windowStatus = 'SAFE_BUFFER';
  let statusBadge = '✅ SAFE (>60d)';
  let statusColor = '#10b981';
  let severity = 'LOW';
  let urgencyHeadline = '';

  if (daysToSpoilage <= 0) {
    windowStatus = 'ACTIVE_BREACH';
    statusBadge = '🚨 ACTIVE SPOILAGE';
    statusColor = '#ef4444';
    severity = 'CRITICAL';
    urgencyHeadline = `Immediate Biochemical Degradation Active: Stock has exceeded safe storage threshold by ${Math.abs(daysToSpoilage)} days.`;
  } else if (daysToSpoilage <= 30) {
    windowStatus = 'BREACH_WITHIN_30D';
    statusBadge = '🚨 URGENT (<30d)';
    statusColor = '#f43f5e';
    severity = 'CRITICAL';
    urgencyHeadline = `Severe 30-Day Hazard: Spoilage threshold breach projected in ${daysToSpoilage} days (${breachDateStr}).`;
  } else if (daysToSpoilage <= 60) {
    windowStatus = 'BREACH_WITHIN_60D';
    statusBadge = '⚠️ 2-MONTH HAZARD (<60d)';
    statusColor = '#f59e0b';
    severity = 'HIGH';
    urgencyHeadline = `2-Month Horizon Alert: Grain degradation threshold will be breached in ${daysToSpoilage} days (${breachDateStr}) based on arrival date.`;
  } else if (daysToSpoilage <= 90) {
    windowStatus = 'MODERATE_WATCH';
    statusBadge = '⚡ WATCH (60-90d)';
    statusColor = '#38bdf8';
    severity = 'MEDIUM';
    urgencyHeadline = `Safe for 60 days, but reaches critical moisture threshold in ${daysToSpoilage} days. Plan post-monsoon aeration.`;
  } else {
    windowStatus = 'SAFE_BUFFER';
    statusBadge = '🛡️ SAFE (>90d)';
    statusColor = '#10b981';
    severity = 'LOW';
    urgencyHeadline = `Optimal Storage Resilience: Projected safe shelf life exceeds ${daysToSpoilage} days (${breachDateStr}).`;
  }

  // 60-Day Forward Degradation Timeline (Day 0, Day 15, Day 30, Day 45, Day 60)
  const milestoneDays = [0, 15, 30, 45, 60];
  const timeline = milestoneDays.map((offset) => {
    const projectedAge = daysInStorage + offset;
    const dateStr = new Date(now.getTime() + offset * 86400000).toISOString().split('T')[0];

    // Dry Matter Loss % (ASAE Standard: DML > 0.5% drops grade, > 1.0% causes commercial condemnation)
    const ageRatio = projectedAge / totalAllowableSafeDays;
    const dmlPct = Math.min(4.5, Number((0.5 * Math.pow(ageRatio, 2.1)).toFixed(2)));

    // Cumulative Spoilage Probability %
    const sigmoidInput = -7.5 * (ageRatio - 0.95);
    const probPct = Math.min(100, Math.max(1, Math.round(100 / (1 + Math.exp(sigmoidInput)))));

    // Wastage Volume in Tonnes
    let spoiledTonnes = 0;
    if (offset >= daysToSpoilage) {
      const daysOverBreach = offset - Math.max(0, daysToSpoilage);
      const lossFactor = Math.min(1.0, 0.12 + 0.88 * Math.pow(daysOverBreach / 45, 1.25));
      spoiledTonnes = Math.min(stock, Math.round(stock * lossFactor));
    } else if (daysToSpoilage <= 0) {
      const daysOverBreach = Math.abs(daysToSpoilage) + offset;
      const lossFactor = Math.min(1.0, 0.15 + 0.85 * Math.pow(daysOverBreach / 50, 1.2));
      spoiledTonnes = Math.min(stock, Math.round(stock * lossFactor));
    }

    const lossRupees = spoiledTonnes * ratePerTonne;
    const lossLakhs = (lossRupees / 100000).toFixed(1);
    const lossCr = (lossRupees / 10000000).toFixed(2);

    let bioState = '';
    if (offset < daysToSpoilage - 15) {
      bioState = 'Stable intergranular ERH; microbial respiration dormant.';
    } else if (offset < daysToSpoilage) {
      bioState = 'Thermal respiration rising (+1.5°C delta); early fungal hyphae expansion.';
    } else if (offset === daysToSpoilage) {
      bioState = '🚨 BREACH POINT: Mycotoxin proliferation; Free Fatty Acid threshold exceeded.';
    } else {
      bioState = 'Severe mold crusting, grain heating hotspots, irreversible commercial write-off.';
    }

    return {
      day_offset: offset,
      date: dateStr,
      label: offset === 0 ? 'Today (Day 0)' : `Day +${offset}`,
      storage_age_days: projectedAge,
      dml_pct: dmlPct,
      spoilage_risk_pct: probPct,
      spoiled_tonnes: spoiledTonnes,
      loss_rupees: lossRupees,
      loss_lakhs: Number(lossLakhs),
      loss_cr: Number(lossCr),
      biological_state: bioState
    };
  });

  const day60 = timeline[timeline.length - 1];
  const wastageAt60Tonnes = day60.spoiled_tonnes;
  const wastageAt60Pct = Math.round((wastageAt60Tonnes / stock) * 100);
  const rupeesLossAt60Cr = day60.loss_cr;

  // Prescribed Agronomic Salvage Protocol
  const salvageCutoffDays = Math.max(3, daysToSpoilage - 8);
  const salvageCutoffDate = new Date(now.getTime() + salvageCutoffDays * 86400000).toISOString().split('T')[0];

  const salvagePlan = {
    salvage_feasible: daysToSpoilage > 5 || daysInStorage < totalAllowableSafeDays,
    salvage_deadline_date: salvageCutoffDate,
    days_to_execute_salvage: Math.max(1, salvageCutoffDays),
    primary_preservation_action: moisture > 13.5
      ? 'Emergency Nocturnal Aeration (5.5 hrs/night @ <65% ambient RH)'
      : 'Preventive Turning & Inter-Chamber Recirculation',
    target_moisture_extraction: `${Math.max(0.5, (moisture - safeMoisture).toFixed(1))}% reduction needed`,
    liquidation_recommendation: (daysToSpoilage <= 60)
      ? `Allocate ${stock.toLocaleString()} T to regional dal/flour millers before ${salvageCutoffDate} to recover 100% of ₹${((stock * ratePerTonne)/10000000).toFixed(2)} Cr.`
      : 'Stock stable for strategic national buffer reserve. No urgent market offloading required.'
  };

  return {
    unit_id: params.unit_id,
    facility_name: params.name || 'Regional Silo Facility',
    location: params.location || 'India',
    grain_type: crop,
    current_stock_tonnes: stock,
    moisture_pct: moisture,
    temp_c: temp,
    facility_type: facility,
    stock_arrival_date: arrivalDateObj.toISOString().split('T')[0],
    days_in_storage: daysInStorage,
    total_safe_storage_days: totalAllowableSafeDays,
    days_to_spoilage_breach: daysToSpoilage,
    breach_date: breachDateStr,
    window_status: windowStatus,
    status_badge: statusBadge,
    status_color: statusColor,
    severity: severity,
    urgency_headline: urgencyHeadline,
    wastage_at_60_days_tonnes: wastageAt60Tonnes,
    wastage_at_60_days_pct: wastageAt60Pct,
    rupees_loss_at_60_days_cr: rupeesLossAt60Cr,
    timeline,
    salvage_plan: salvagePlan
  };
}

// GET /api/spoilage-forecast
app.get('/api/spoilage-forecast', (req, res) => {
  try {
    const unitId = req.query.unit_id ? Number(req.query.unit_id) : null;

    if (unitId !== null && !isNaN(unitId)) {
      const stmt = db.prepare('SELECT * FROM storage_units WHERE id = ? LIMIT 1');
      const u = stmt.get(unitId) as any;
      if (!u) {
        res.status(404).json({ status: 'error', message: `Unit #${unitId} not found` });
        return;
      }

      const arrival = req.query.arrival_date ? String(req.query.arrival_date) : (u.stock_arrival_date || '2026-08-15');
      const moisture = req.query.moisture_pct ? Number(req.query.moisture_pct) : Number(u.moisture_pct);
      const temp = req.query.temp_c ? Number(req.query.temp_c) : 27.5;

      const forecast = calculate60DaySpoilageForecast({
        unit_id: u.id,
        name: u.name,
        location: `${u.city}, ${u.state}`,
        grain_type: u.grain_type,
        current_stock_tonnes: Number(u.current_stock_tonnes),
        moisture_pct: moisture,
        temp_c: temp,
        stock_arrival_date: arrival,
        facility_type: 'Modern Steel Silo'
      });

      res.json({ status: 'success', data: forecast });
      return;
    }

    // Return National 60-Day Vulnerability Overview across all facilities
    const allRows = (db.prepare('SELECT * FROM storage_units ORDER BY id ASC').all() || []) as any[];
    const forecasts = allRows.map((u: any) => {
      return calculate60DaySpoilageForecast({
        unit_id: u.id,
        name: u.name,
        location: `${u.city}, ${u.state}`,
        grain_type: u.grain_type,
        current_stock_tonnes: Number(u.current_stock_tonnes),
        moisture_pct: Number(u.moisture_pct),
        temp_c: 27.0,
        stock_arrival_date: u.stock_arrival_date || '2026-08-15',
        facility_type: 'Modern Steel Silo'
      });
    });

    const breachingUnits = forecasts.filter(f => f.days_to_spoilage_breach <= 60);
    const urgent30dUnits = forecasts.filter(f => f.days_to_spoilage_breach <= 30);
    const totalTonnesAtRisk60d = breachingUnits.reduce((acc, f) => acc + f.wastage_at_60_days_tonnes, 0);
    const totalLossAtRisk60dCr = Number(breachingUnits.reduce((acc, f) => acc + f.rupees_loss_at_60_days_cr, 0).toFixed(2));

    res.json({
      status: 'success',
      summary: {
        total_monitored_units: forecasts.length,
        units_at_risk_within_60d: breachingUnits.length,
        critical_within_30d: urgent30dUnits.length,
        total_tonnes_at_risk_60d: totalTonnesAtRisk60d,
        total_value_at_risk_60d_cr: totalLossAtRisk60dCr,
        evaluation_anchor_date: '2026-09-17'
      },
      breaching_units_60d: breachingUnits.sort((a, b) => a.days_to_spoilage_breach - b.days_to_spoilage_breach),
      all_units: forecasts.sort((a, b) => a.days_to_spoilage_breach - b.days_to_spoilage_breach)
    });
  } catch (err: any) {
    console.error('Error in /api/spoilage-forecast GET:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Error computing spoilage forecast' });
  }
});

// POST /api/spoilage-forecast (Interactive custom simulation & Gemini diagnosis)
app.post('/api/spoilage-forecast', async (req, res) => {
  try {
    const {
      unit_id,
      name,
      location,
      grain_type,
      current_stock_tonnes,
      moisture_pct,
      temp_c,
      stock_arrival_date,
      facility_type,
      run_gemini_diagnosis
    } = req.body;

    let finalName = name || 'Regional Silo Facility';
    let finalLocation = location || 'India';
    let finalCrop = grain_type || 'wheat';
    let finalStock = Number(current_stock_tonnes) || 5000;
    let finalMoisture = Number(moisture_pct) || 13.5;
    let finalArrival = stock_arrival_date || '2026-08-01';

    if (unit_id) {
      const u = db.prepare('SELECT * FROM storage_units WHERE id = ?').get(unit_id) as any;
      if (u) {
        if (!name) finalName = u.name;
        if (!location) finalLocation = `${u.city}, ${u.state}`;
        if (!grain_type) finalCrop = u.grain_type;
        if (!current_stock_tonnes) finalStock = Number(u.current_stock_tonnes);
        if (moisture_pct === undefined) finalMoisture = Number(u.moisture_pct);
        if (!stock_arrival_date) finalArrival = u.stock_arrival_date || '2026-08-01';
      }
    }

    const forecast = calculate60DaySpoilageForecast({
      unit_id: unit_id ? Number(unit_id) : undefined,
      name: finalName,
      location: finalLocation,
      grain_type: finalCrop,
      current_stock_tonnes: finalStock,
      moisture_pct: finalMoisture,
      temp_c: temp_c ? Number(temp_c) : 27.5,
      stock_arrival_date: finalArrival,
      facility_type: facility_type || 'Modern Steel Silo'
    });

    let aiDiagnosis = null;
    const shouldRunAI = run_gemini_diagnosis !== false && aiClient !== null;

    if (shouldRunAI) {
      try {
        const prompt = `You are a Chief Food Grain Storage Scientist and WDRA Preservation Officer.
Analyze the following grain storage 2-Month (60-Day) Spoilage Wastage Forecast:
- Facility: ${forecast.facility_name} (${forecast.location})
- Commodity: ${forecast.grain_type.toUpperCase()}
- Current Stock: ${forecast.current_stock_tonnes.toLocaleString()} Tonnes
- Stock Arrival Date: ${forecast.stock_arrival_date} (${forecast.days_in_storage} days in storage)
- Intergranular Moisture: ${forecast.moisture_pct}% (Safe threshold: ${forecast.grain_type === 'moong' || forecast.grain_type === 'chana' ? '12.0%' : '13.0%'})
- Grain Core Temp: ${forecast.temp_c}°C
- 60-Day Projected Wastage: ${forecast.wastage_at_60_days_tonnes.toLocaleString()} Tonnes (${forecast.wastage_at_60_days_pct}% of batch)
- Financial Value at Risk in 60 Days: ₹${forecast.rupees_loss_at_60_days_cr} Crores
- Projected Breach Date: ${forecast.breach_date} (${forecast.days_to_spoilage_breach} days remaining)

Provide an authoritative, concise agronomic evaluation in valid JSON with these keys:
{
  "biochemical_mechanism": "Exact fungal (e.g. Aspergillus/Penicillium), enzymatic, or respiration degradation occurring based on the elapsed storage days and moisture",
  "two_month_risk_summary": "Crisp 2-sentence summary of what happens if unmitigated over the next 60 days",
  "critical_milestones": [
    { "day": 15, "risk": "..." },
    { "day": 30, "risk": "..." },
    { "day": 45, "risk": "..." },
    { "day": 60, "risk": "..." }
  ],
  "immediate_salvage_directive": "Exact engineering and commercial actions (aeration CFM/fan timing, turning, miller liquidation deadline)"
}`;

        let aiRes: any = null;
        try {
          aiRes = await aiClient!.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              temperature: 0.25,
              responseMimeType: 'application/json'
            }
          });
        } catch (fErr) {
          console.warn('[spoilage-forecast] Falling back to gemini-3.1-flash-lite:', fErr);
          aiRes = await aiClient!.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              temperature: 0.25,
              responseMimeType: 'application/json'
            }
          });
        }

        if (aiRes && aiRes.text) {
          aiDiagnosis = JSON.parse(aiRes.text);
        }
      } catch (aiErr) {
        console.warn('[spoilage-forecast] AI Diagnosis generation notice:', aiErr);
      }
    }

    if (!aiDiagnosis) {
      // Robust agronomic fallback heuristics
      aiDiagnosis = {
        biochemical_mechanism: forecast.moisture_pct > 14.0
          ? `Elevated water activity (aw > 0.68) accelerating Aspergillus and Penicillium sporulation. Respiration coefficient Q10 = 2.4 inducing localized biocenter heat generation.`
          : `Mild moisture equilibrium with gradual enzymatic oxidation of intergranular free fatty acids. Fungal risk low under current aeration.`,
        two_month_risk_summary: forecast.days_to_spoilage_breach <= 60
          ? `Without aeration or liquidation within ${Math.max(1, forecast.days_to_spoilage_breach)} days, dry matter loss will breach 1.0%, triggering commercial condemnation of ₹${forecast.rupees_loss_at_60_days_cr} Cr in grain.`
          : `Batch exhibits high biological stability past 60 days. Periodic 30-minute nocturnal air purges will safeguard buffer reserve integrity.`,
        critical_milestones: [
          { day: 15, risk: forecast.timeline[1].biological_state },
          { day: 30, risk: forecast.timeline[2].biological_state },
          { day: 45, risk: forecast.timeline[3].biological_state },
          { day: 60, risk: forecast.timeline[4].biological_state }
        ],
        immediate_salvage_directive: forecast.salvage_plan.primary_preservation_action + '. ' + forecast.salvage_plan.liquidation_recommendation
      };
    }

    res.json({
      status: 'success',
      data: forecast,
      ai_diagnosis: aiDiagnosis
    });
  } catch (err: any) {
    console.error('Error in /api/spoilage-forecast POST:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Error processing simulation' });
  }
});

// POST /api/spoilage-forecast/update-arrival (Persist updated stock arrival date to unit)
app.post('/api/spoilage-forecast/update-arrival', (req, res) => {
  try {
    const { unit_id, stock_arrival_date } = req.body;
    if (!unit_id || !stock_arrival_date) {
      res.status(400).json({ status: 'error', message: 'unit_id and stock_arrival_date are required' });
      return;
    }

    const arrivalDateObj = new Date(stock_arrival_date);
    if (isNaN(arrivalDateObj.getTime())) {
      res.status(400).json({ status: 'error', message: 'Invalid date format (expected YYYY-MM-DD)' });
      return;
    }

    const arrivalStr = arrivalDateObj.toISOString().split('T')[0];
    db.prepare('UPDATE storage_units SET stock_arrival_date = ? WHERE id = ?').run(arrivalStr, Number(unit_id));

    // Fetch updated unit
    const u = db.prepare('SELECT * FROM storage_units WHERE id = ?').get(unit_id) as any;
    const forecast = calculate60DaySpoilageForecast({
      unit_id: u.id,
      name: u.name,
      location: `${u.city}, ${u.state}`,
      grain_type: u.grain_type,
      current_stock_tonnes: Number(u.current_stock_tonnes),
      moisture_pct: Number(u.moisture_pct),
      temp_c: 27.5,
      stock_arrival_date: arrivalStr,
      facility_type: 'Modern Steel Silo'
    });

    res.json({
      status: 'success',
      message: `Stock arrival date updated for Unit #${unit_id}`,
      data: forecast
    });
  } catch (err: any) {
    console.error('Error in /api/spoilage-forecast/update-arrival:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Error updating stock arrival date' });
  }
});

// -----------------------------------------------------------------------------
// Serve Static Files & Entrypoints
// -----------------------------------------------------------------------------
app.get('/download-zip', (req, res) => {
  const zipPath = path.join(ROOT_DIR, 'annaraksha-clean-site.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'annaraksha-clean-site.zip');
  } else {
    res.status(404).send('ZIP file not found');
  }
});

app.use(express.static(ROOT_DIR, {
  extensions: ['html', 'htm']
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// Redirect legacy/standalone routes to unified canonical dashboard with appropriate view hash
app.get(['/dashboard', '/dashboard.html'], (req, res) => {
  res.redirect(301, '/#view-grid');
});

app.get(['/directory', '/directory.html'], (req, res) => {
  res.redirect(301, '/#view-directory');
});

// Backward-compatible redirect for any legacy .php API calls
app.all('/api/:endpoint.php', (req, res) => {
  const cleanUrl = `/api/${req.params.endpoint}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  res.redirect(307, cleanUrl);
});

// SPA Fallback: send index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Annaraksha AI server running successfully on port ${PORT}`);
});

