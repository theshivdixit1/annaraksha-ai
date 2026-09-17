-- Annaraksha AI Database Schema
-- Grain-Storage Spoilage Prediction Platform
-- Bitexindustries Private Limited / Unbeatable Foods

CREATE TABLE IF NOT EXISTS storage_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    grain_type VARCHAR(50) NOT NULL,
    capacity_tonnes INT NOT NULL,
    current_stock_tonnes INT NOT NULL,
    moisture_pct DECIMAL(4, 2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'healthy',
    predicted_spoilage_date DATE NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    tonnes_at_risk INT NOT NULL,
    rupees_at_risk DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_unit_id (unit_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id)
);
