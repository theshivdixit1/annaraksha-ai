# Annaraksha AI — Grain-Storage Spoilage Prediction Dashboard

**Company:** Bitexindustries Private Limited / Unbeatable Foods  
**Mission:** National post-harvest grain preservation through predictive IoT telemetry and AI agronomic intelligence.

---

## 🌾 Overview

Annaraksha AI is a real-time, investor-facing grain storage spoilage monitoring and prediction dashboard. By combining multi-strata IoT probe telemetry (temperature, relative humidity, inter-granular moisture percentage, and biological heat generation) with Google Gemini 3.6 Flash agronomic reasoning, Annaraksha AI helps grain warehouse managers, buffer-stock corporations, and investors prevent post-harvest food waste weeks before physical grain damage occurs.

### Key Capabilities
- **Spatial Telemetry Operations Console:** Full interactive map displaying 60 grain storage facilities across 15+ Indian agricultural states (Punjab, Haryana, MP, UP, Rajasthan, Maharashtra, Gujarat, Bihar, Bengal, Odisha, Andhra Pradesh, Telangana, Karnataka, Tamil Nadu, Chhattisgarh).
- **Early-Warning Spoilage Forecasting:** Predicts microbial germination and moisture boundary migration with 5 to 25-day early warning windows.
- **Dynamic Live Alerts Ticker:** Continuously streams real-time alerts derived from facilities under "watch" and "critical" spoilage risk thresholds.
- **Interactive Smart Silo Cross-Section:** Canvas simulation of internal aeration convection currents, sensor stratification (Surface, Core, Floor), and moisture gradient layers.
- **Annaraksha Copilot (Google Gemini 3.6 Flash):** Server-side AI advisor providing immediate mitigation protocols, aeration fan run schedules, and financial loss calculations.
- **Data Honesty Standards:** Explicit "Live Pilot Environment — Simulated Data" indicators and a decoupled backend data layer allowing drop-in swapping of real telemetry feeds without modifying frontend components.

---

## 🚀 Application Architecture & Deployment

Annaraksha AI is built on a high-performance **Node.js, Express, and TypeScript** backend serving a responsive, futuristic agronomic cyber-command console with zero bloated client builds:

### Unified Canonical Architecture
- **Single Canonical Console (`index.html`):** The entire application operates through a unified, high-contrast cyber-command console with URL hash routing (`/#view-grid`, `/#view-scanner`, `/#view-workorders`, `/#view-valuechain`, `/#view-logistics`, `/#view-impact`, `/#view-directory`, `/#view-silo`). Standalone prototype files (`dashboard.html` and `directory.html`) are deprecated, and any visits to `/dashboard` or `/directory` are automatically redirected (HTTP 301) to their respective canonical dashboard views.
- **Modern REST API Endpoints:** Standardized clean REST endpoints without `.php` extensions:
  - `GET /api/units` (all 60 monitored units, with optional `?id=N`)
  - `GET /api/alerts` & `POST /api/alerts` (real-time IoT alerts stream)
  - `POST /api/copilot` (server-side Gemini AI agronomic intelligence)
  - `POST /api/scan` & `GET /api/scan` (computer vision grain quality & moisture detection)
  - `GET /api/ingestion` (live Mandi ticker and weather radar ingestion feeds)
  - `GET /api/workorders` & `POST /api/workorders` (automated PLC aeration routines)
  - `GET /api/valuechain` (processing matchmaker & waste-to-profit arbitrage)
  - `GET /api/logistics` (convoy transit telemetry & weighbridge OCR)
  - `GET /api/impact` (ESG impact metrics & wastage-averted ledger)
- **Backward-Compatible Legacy Redirects:** Requests to `/api/:endpoint.php` are automatically redirected (HTTP 307) to the corresponding modern `/api/:endpoint` routes.

---

## 🧪 API Verification Checklist

Test the standardized REST endpoints using your browser or `curl`:

1. **Storage Units API:**
   ```bash
   curl -i https://yourdomain.com/api/units
   ```
   *Expected:* HTTP 200 with JSON payload containing all monitored storage facilities.

2. **Single Unit Detail:**
   ```bash
   curl -i https://yourdomain.com/api/units?id=4
   ```
   *Expected:* HTTP 200 with Unit #4 (Amritsar Border Silo Node) telemetry.

3. **Live Alerts Feed:**
   ```bash
   curl -i https://yourdomain.com/api/alerts
   ```
   *Expected:* HTTP 200 with latest alerts, newest first.

4. **Annaraksha Copilot (Gemini API):**
   ```bash
   curl -i -X POST https://yourdomain.com/api/copilot \
     -H "Content-Type: application/json" \
     -d '{"session_id":"test_1","message":"Which storage units have critical moisture levels?"}'
   ```
   *Expected:* HTTP 200 with Gemini agronomic analysis.

---

## 🛡️ Security & Architecture Guarantees
- **Modern REST APIs:** Fully standardized clean REST routes with strict input validation.
- **Server-Side Gemini Proxy:** The Gemini API key resides strictly in environment variables (`GEMINI_API_KEY`) and is invoked server-side. It is never exposed to browser bundles or network inspector payloads.
- **Session Rate Limiting:** Copilot endpoints enforce sliding rate-limits to prevent API quota exhaustion.
- **Data Layer Decoupling:** Hardware IoT feeds can be connected directly to the Express backend controllers without modifying frontend components.
