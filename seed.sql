-- Annaraksha AI Realistic Seed Data
-- 60 Storage Units across 15+ Indian States
-- Spread: 36 Healthy (~60%), 18 Watch (~30%), 6 Critical (~10%)
-- Grains: rice, wheat, bajra, jowar, moong, chana

INSERT INTO storage_units (id, name, state, city, lat, lng, grain_type, capacity_tonnes, current_stock_tonnes, moisture_pct, risk_level, predicted_spoilage_date, last_updated) VALUES
-- Punjab (Wheat, Rice)
(1, 'Central Silo Ludhiana Alpha', 'Punjab', 'Ludhiana', 30.9010, 75.8573, 'wheat', 12000, 10450, 11.20, 'healthy', NULL, CURRENT_TIMESTAMP),
(2, 'AgroStack Bathinda West', 'Punjab', 'Bathinda', 30.2110, 74.9455, 'wheat', 8500, 7920, 14.10, 'watch', '2026-10-28', CURRENT_TIMESTAMP),
(3, 'Patiala Grain Reserve 04', 'Punjab', 'Patiala', 30.3398, 76.3869, 'rice', 9500, 8900, 12.10, 'healthy', NULL, CURRENT_TIMESTAMP),
(4, 'Amritsar Border Silo Node', 'Punjab', 'Amritsar', 31.6340, 74.8723, 'rice', 11000, 9400, 16.80, 'critical', '2026-09-24', CURRENT_TIMESTAMP),

-- Haryana (Wheat, Bajra)
(5, 'Karnal AgriVault North', 'Haryana', 'Karnal', 29.6857, 76.9905, 'wheat', 15000, 13800, 11.50, 'healthy', NULL, CURRENT_TIMESTAMP),
(6, 'Rohtak Modern Terminal 2', 'Haryana', 'Rohtak', 28.8955, 76.6066, 'wheat', 10000, 8950, 13.90, 'watch', '2026-11-04', CURRENT_TIMESTAMP),
(7, 'Sirsa Desert Belt Silo', 'Haryana', 'Sirsa', 29.5349, 75.0290, 'bajra', 7000, 6200, 11.80, 'healthy', NULL, CURRENT_TIMESTAMP),
(8, 'Kurukshetra Food Hub 01', 'Haryana', 'Kurukshetra', 29.9695, 76.8783, 'rice', 9000, 8400, 12.40, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Madhya Pradesh (Wheat, Chana, Moong)
(9, 'Malwa Granary Indore Hub', 'Madhya Pradesh', 'Indore', 22.7196, 75.8577, 'wheat', 18000, 16200, 11.10, 'healthy', NULL, CURRENT_TIMESTAMP),
(10, 'Bhopal Central Buffer Silo', 'Madhya Pradesh', 'Bhopal', 23.2599, 77.4126, 'wheat', 14000, 12500, 14.40, 'watch', '2026-10-18', CURRENT_TIMESTAMP),
(11, 'Ujjain Pulse Depot Beta', 'Madhya Pradesh', 'Ujjain', 23.1765, 75.7885, 'chana', 6500, 5800, 12.00, 'healthy', NULL, CURRENT_TIMESTAMP),
(12, 'Jabalpur Narmada Grain Base', 'Madhya Pradesh', 'Jabalpur', 23.1815, 79.9864, 'moong', 8000, 7100, 16.90, 'critical', '2026-09-22', CURRENT_TIMESTAMP),
(13, 'Gwalior Fort-Side Vault', 'Madhya Pradesh', 'Gwalior', 26.2183, 78.1828, 'wheat', 9500, 8600, 11.60, 'healthy', NULL, CURRENT_TIMESTAMP),
(14, 'Hoshangabad River Basin Silo', 'Madhya Pradesh', 'Narmadapuram', 22.7519, 77.7289, 'wheat', 11500, 10200, 13.80, 'watch', '2026-11-12', CURRENT_TIMESTAMP),

-- Uttar Pradesh (Wheat, Rice, Bajra)
(15, 'Doab AgroStack Aligarh', 'Uttar Pradesh', 'Aligarh', 27.8974, 78.0880, 'wheat', 13000, 11800, 12.20, 'healthy', NULL, CURRENT_TIMESTAMP),
(16, 'Varanasi Purvanchal Silo 3', 'Uttar Pradesh', 'Varanasi', 25.3176, 82.9739, 'rice', 10500, 9200, 14.60, 'watch', '2026-10-15', CURRENT_TIMESTAMP),
(17, 'Gorakhpur Grain Terminal', 'Uttar Pradesh', 'Gorakhpur', 26.7606, 83.3732, 'rice', 9000, 8100, 17.20, 'critical', '2026-09-19', CURRENT_TIMESTAMP),
(18, 'Kanpur Industrial Granary', 'Uttar Pradesh', 'Kanpur', 26.4499, 80.3319, 'wheat', 16000, 14200, 11.40, 'healthy', NULL, CURRENT_TIMESTAMP),
(19, 'Mathura Braj AgriVault', 'Uttar Pradesh', 'Mathura', 27.4924, 77.6737, 'bajra', 7500, 6800, 11.90, 'healthy', NULL, CURRENT_TIMESTAMP),
(20, 'Bareilly Rohilkhand Storage', 'Uttar Pradesh', 'Bareilly', 28.3670, 79.4304, 'wheat', 8500, 7600, 13.70, 'watch', '2026-11-09', CURRENT_TIMESTAMP),

-- Rajasthan (Bajra, Moong, Wheat)
(21, 'Jaipur PinkCity Grain Hub', 'Rajasthan', 'Jaipur', 26.9124, 75.7873, 'bajra', 12500, 11100, 10.90, 'healthy', NULL, CURRENT_TIMESTAMP),
(22, 'Kota Chambal Mega Silo', 'Rajasthan', 'Kota', 25.2138, 75.8648, 'wheat', 14500, 13200, 14.20, 'watch', '2026-10-30', CURRENT_TIMESTAMP),
(23, 'Bikaner Desert Pulse Cell', 'Rajasthan', 'Bikaner', 28.0229, 73.3119, 'moong', 5500, 4800, 11.30, 'healthy', NULL, CURRENT_TIMESTAMP),
(24, 'Jodhpur Marwar Granary', 'Rajasthan', 'Jodhpur', 26.2389, 73.0243, 'bajra', 9000, 8100, 12.10, 'healthy', NULL, CURRENT_TIMESTAMP),
(25, 'Sri Ganganagar Canal Silo', 'Rajasthan', 'Sri Ganganagar', 29.9038, 73.8772, 'wheat', 11000, 9900, 14.50, 'watch', '2026-10-22', CURRENT_TIMESTAMP),

-- Maharashtra (Jowar, Chana, Moong)
(26, 'Nagpur Vidarbha Hub Alpha', 'Maharashtra', 'Nagpur', 21.1458, 79.0882, 'jowar', 14000, 12300, 11.60, 'healthy', NULL, CURRENT_TIMESTAMP),
(27, 'Nashik Godavari Grain Cell', 'Maharashtra', 'Nashik', 19.9975, 73.7898, 'chana', 8000, 7150, 14.80, 'watch', '2026-10-14', CURRENT_TIMESTAMP),
(28, 'Akola Cotton & Pulse Silo', 'Maharashtra', 'Akola', 20.7002, 77.0082, 'moong', 7200, 6400, 17.50, 'critical', '2026-09-21', CURRENT_TIMESTAMP),
(29, 'Solapur Deccan Granary', 'Maharashtra', 'Solapur', 17.6599, 75.9064, 'jowar', 10500, 9400, 11.80, 'healthy', NULL, CURRENT_TIMESTAMP),
(30, 'Aurangabad Marathwada Depot', 'Maharashtra', 'Chhatrapati Sambhajinagar', 19.8762, 75.3433, 'chana', 8500, 7700, 12.30, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Gujarat (Bajra, Chana, Wheat)
(31, 'Rajkot Saurashtra Silo', 'Gujarat', 'Rajkot', 22.3039, 70.8022, 'bajra', 10000, 8800, 11.40, 'healthy', NULL, CURRENT_TIMESTAMP),
(32, 'Mehsana North AgriVault', 'Gujarat', 'Mehsana', 23.5880, 72.3693, 'wheat', 9500, 8300, 13.90, 'watch', '2026-11-02', CURRENT_TIMESTAMP),
(33, 'Anand Amul-Belt Granary', 'Gujarat', 'Anand', 22.5645, 72.9289, 'chana', 7500, 6700, 12.00, 'healthy', NULL, CURRENT_TIMESTAMP),
(34, 'Surat Coastal Reserve 02', 'Gujarat', 'Surat', 21.1702, 72.8311, 'rice', 9000, 8100, 14.70, 'watch', '2026-10-19', CURRENT_TIMESTAMP),

-- Andhra Pradesh (Rice, Moong)
(35, 'Guntur Delta Granary Prime', 'Andhra Pradesh', 'Guntur', 16.3067, 80.4365, 'rice', 16000, 14500, 12.20, 'healthy', NULL, CURRENT_TIMESTAMP),
(36, 'Kakinada Port Buffer Silo', 'Andhra Pradesh', 'Kakinada', 16.9891, 82.2475, 'rice', 13500, 12100, 16.60, 'critical', '2026-09-25', CURRENT_TIMESTAMP),
(37, 'Nellore Coast Grain Facility', 'Andhra Pradesh', 'Nellore', 14.4426, 79.9865, 'rice', 11000, 9800, 12.50, 'healthy', NULL, CURRENT_TIMESTAMP),
(38, 'Kurnool Rayalaseema Storage', 'Andhra Pradesh', 'Kurnool', 15.8281, 78.0373, 'moong', 6500, 5700, 13.60, 'watch', '2026-11-15', CURRENT_TIMESTAMP),

-- Telangana (Rice, Jowar)
(39, 'Nizamabad Telangana Rice Silo', 'Telangana', 'Nizamabad', 18.6725, 78.0941, 'rice', 15000, 13400, 12.30, 'healthy', NULL, CURRENT_TIMESTAMP),
(40, 'Warangal Kakatiya Granary', 'Telangana', 'Warangal', 17.9689, 79.5941, 'jowar', 9500, 8400, 11.70, 'healthy', NULL, CURRENT_TIMESTAMP),
(41, 'Karimnagar AgriVault 03', 'Telangana', 'Karimnagar', 18.4386, 79.1288, 'rice', 10500, 9300, 14.10, 'watch', '2026-10-27', CURRENT_TIMESTAMP),

-- Karnataka (Jowar, Chana, Rice)
(42, 'Bellary Tungabhadra Silo', 'Karnataka', 'Ballari', 15.1394, 76.9214, 'jowar', 11500, 10200, 12.40, 'healthy', NULL, CURRENT_TIMESTAMP),
(43, 'Raichur Doab Rice Reserve', 'Karnataka', 'Raichur', 16.2076, 77.3463, 'rice', 12000, 10700, 14.30, 'watch', '2026-10-25', CURRENT_TIMESTAMP),
(44, 'Gulbarga Pulse Hub North', 'Karnataka', 'Kalaburagi', 17.3297, 76.8343, 'chana', 8500, 7600, 11.90, 'healthy', NULL, CURRENT_TIMESTAMP),
(45, 'Davangere Grain Terminal', 'Karnataka', 'Davanagere', 14.4644, 75.9218, 'jowar', 9000, 8100, 12.10, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Bihar (Rice, Wheat, Moong)
(46, 'Purnia Mithila Granary 01', 'Bihar', 'Purnia', 25.7771, 87.4753, 'rice', 13000, 11900, 17.10, 'critical', '2026-09-20', CURRENT_TIMESTAMP),
(47, 'Bhagalpur Silk-Belt Silo', 'Bihar', 'Bhagalpur', 25.2425, 86.9842, 'wheat', 10000, 8800, 14.00, 'watch', '2026-11-01', CURRENT_TIMESTAMP),
(48, 'Muzaffarpur North Bihar Vault', 'Bihar', 'Muzaffarpur', 26.1209, 85.3647, 'rice', 11000, 9700, 12.60, 'healthy', NULL, CURRENT_TIMESTAMP),
(49, 'Sasaram Rohtas AgroStack', 'Bihar', 'Sasaram', 24.9522, 84.0315, 'moong', 7000, 6200, 11.50, 'healthy', NULL, CURRENT_TIMESTAMP),

-- West Bengal (Rice)
(50, 'Burdwan Rice Bowl Depot 01', 'West Bengal', 'Bardhaman', 23.2324, 87.8615, 'rice', 17000, 15300, 12.70, 'healthy', NULL, CURRENT_TIMESTAMP),
(51, 'Midnapore AgriReserve Beta', 'West Bengal', 'Midnapore', 22.4257, 87.3199, 'rice', 12500, 11100, 14.40, 'watch', '2026-10-17', CURRENT_TIMESTAMP),
(52, 'Malda Ganga Basin Silo', 'West Bengal', 'Malda', 25.0108, 88.1411, 'rice', 9500, 8400, 13.80, 'watch', '2026-11-07', CURRENT_TIMESTAMP),
(53, 'Siliguri North Gateway Silo', 'West Bengal', 'Siliguri', 26.7271, 88.3953, 'rice', 8500, 7500, 12.30, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Odisha (Rice)
(54, 'Sambalpur Hirakud Granary', 'Odisha', 'Sambalpur', 21.4669, 83.9812, 'rice', 13000, 11600, 12.10, 'healthy', NULL, CURRENT_TIMESTAMP),
(55, 'Balasore Coastal Grain Cell', 'Odisha', 'Balasore', 21.4934, 86.9135, 'rice', 9000, 8050, 14.20, 'watch', '2026-10-29', CURRENT_TIMESTAMP),
(56, 'Bargarh AgriHub 02', 'Odisha', 'Bargarh', 21.3340, 83.6214, 'rice', 10500, 9300, 11.90, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Tamil Nadu (Rice, Moong)
(57, 'Thanjavur Cauvery Delta Vault', 'Tamil Nadu', 'Thanjavur', 10.7870, 79.1378, 'rice', 14500, 13100, 12.50, 'healthy', NULL, CURRENT_TIMESTAMP),
(58, 'Madurai Southern Granary', 'Tamil Nadu', 'Madurai', 9.9252, 78.1198, 'moong', 7500, 6600, 11.80, 'healthy', NULL, CURRENT_TIMESTAMP),

-- Chhattisgarh (Rice)
(59, 'Raipur Mahanadi Central Silo', 'Chhattisgarh', 'Raipur', 21.2514, 81.6296, 'rice', 18500, 16700, 12.40, 'healthy', NULL, CURRENT_TIMESTAMP),
(60, 'Bilaspur Grain Stack 04', 'Chhattisgarh', 'Bilaspur', 22.0797, 82.1409, 'rice', 11000, 9900, 14.60, 'watch', '2026-10-16', CURRENT_TIMESTAMP);

-- Initial Realistic Alerts
INSERT INTO alerts (id, unit_id, message, severity, tonnes_at_risk, rupees_at_risk, created_at) VALUES
(1, 4, 'Moisture rising in Unit #4, Amritsar — spoilage predicted in 9 days. Immediate aeration recommended.', 'critical', 9400, 23500000.00, CURRENT_TIMESTAMP - INTERVAL '3 hour'),
(2, 17, 'Critical thermal-humidity threshold breached at Gorakhpur Grain Terminal (Unit #17). High fungal risk.', 'critical', 8100, 20250000.00, CURRENT_TIMESTAMP - INTERVAL '2 hour'),
(3, 12, 'Moisture rising in Unit #12, Jabalpur — spoilage predicted in 7 days.', 'critical', 7100, 53250000.00, CURRENT_TIMESTAMP - INTERVAL '90 minute'),
(4, 28, 'Biological respiration spike detected in Unit #28, Akola. Moong pulse lot at severe risk.', 'critical', 6400, 48000000.00, CURRENT_TIMESTAMP - INTERVAL '75 minute'),
(5, 46, 'Moisture rising in Unit #46, Purnia — spoilage predicted in 5 days. Urgent grain turnover required.', 'critical', 11900, 29750000.00, CURRENT_TIMESTAMP - INTERVAL '45 minute'),
(6, 36, 'Coastal humidity infiltration in Unit #36, Kakinada — spoilage predicted in 10 days.', 'critical', 12100, 30250000.00, CURRENT_TIMESTAMP - INTERVAL '30 minute'),
(7, 2, 'Watch alert: Unit #2, Bathinda trending above 14% moisture threshold.', 'warning', 7920, 18216000.00, CURRENT_TIMESTAMP - INTERVAL '20 minute'),
(8, 10, 'Moisture rising in Unit #10, Bhopal — spoilage predicted in 33 days.', 'warning', 12500, 28750000.00, CURRENT_TIMESTAMP - INTERVAL '10 minute');
