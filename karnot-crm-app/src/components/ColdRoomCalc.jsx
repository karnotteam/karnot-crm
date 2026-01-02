<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iCOOL - Cold Room Calculator (Pro Edition)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    
    <style>
        :root {
            --primary-blue: #007aff;
            --accent-green: #34c759;
            --accent-purple: #5856d6;
            --dark-charcoal: #1d1d1f;
            --text-secondary: #6e6e73;
            --bg-light: #f5f5f7;
            --border-color: #d2d2d7;
            --border-radius: 12px;
        }

        body { font-family: 'Inter', sans-serif; margin: 0; background-color: var(--bg-light); color: var(--dark-charcoal); display: flex; justify-content: center; padding: 40px 20px; }
        .calculator-container { width: 100%; max-width: 1000px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
        
        .header { background: var(--primary-blue); color: white; padding: 30px; text-align: center; }
        .header h2 { margin: 0; font-size: 28px; }
        .header p { opacity: 0.9; margin-top: 5px; }

        .body { padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        
        .section-title { font-size: 18px; font-weight: 700; border-bottom: 2px solid var(--bg-light); padding-bottom: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .input-group { margin-bottom: 25px; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 5px; }
        input, select { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 15px; box-sizing: border-box; }
        
        .btn { width: 100%; padding: 15px; background: var(--primary-blue); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn:hover { background: #0056b3; }

        /* Results Styles */
        .results-container { padding: 40px; background: var(--bg-light); border-top: 1px solid var(--border-color); display: none; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .kpi-card { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .kpi-value { font-size: 24px; font-weight: 800; color: var(--primary-blue); margin-bottom: 5px; }
        .kpi-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

        .breakdown-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .breakdown-table td { padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
        .breakdown-table tr:last-child td { border-bottom: none; font-weight: 700; font-size: 16px; }
        .val-col { text-align: right; font-family: monospace; font-size: 15px; }

        /* Enterprise Styles */
        .enterprise-box { background: #f0f7ff; border: 1px solid #cce4ff; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
        .enterprise-toggle { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; }
        .enterprise-content { display: none; margin-top: 15px; border-top: 1px solid #cce4ff; padding-top: 15px; }
        .roi-positive { color: var(--accent-green); }
        .roi-neutral { color: var(--primary-blue); }

        @media (max-width: 768px) { .body { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>

<div class="calculator-container">
    <div class="header">
        <h2><i class="fa-regular fa-snowflake"></i> iCOOL Estimator Pro</h2>
        <p>Load Calculation & Financial ROI Analysis</p>
    </div>

    <div class="body">
        <div>
            <div class="section-title"><i class="fa-solid fa-ruler-combined"></i> 1. Room Details</div>
            <div class="input-row">
                <div><label>Length (m)</label><input type="number" id="L" value="10"></div>
                <div><label>Width (m)</label><input type="number" id="W" value="8"></div>
            </div>
            <div class="input-row">
                <div><label>Height (m)</label><input type="number" id="H" value="4"></div>
                <div><label>Panel</label>
                    <select id="panel">
                        <option value="0.21">120mm PUR (U=0.21)</option>
                        <option value="0.18">150mm PUR (U=0.18)</option>
                    </select>
                </div>
            </div>
            
            <div class="section-title"><i class="fa-solid fa-temperature-half"></i> 2. Operations</div>
            <div class="input-row">
                <div><label>Ambient (°C)</label><input type="number" id="temp_amb" value="32"></div>
                <div><label>Room (°C)</label><input type="number" id="temp_room" value="-18"></div>
            </div>
            <div class="input-row">
                <div><label>Product (kg/day)</label><input type="number" id="mass" value="1000"></div>
                <div><label>Type</label>
                    <select id="prod_type">
                        <option value="meat_frozen">Meat (Frozen)</option>
                        <option value="fish">Fish (Frozen)</option>
                        <option value="fruits">Fruits (Chilled)</option>
                    </select>
                </div>
            </div>
            <div class="input-row">
                <div><label>In Temp (°C)</label><input type="number" id="temp_in" value="4"></div>
                <div><label>Door Opens/Day</label><input type="number" id="door_opens" value="20"></div>
            </div>
        </div>

        <div>
            <div class="section-title"><i class="fa-solid fa-coins"></i> 3. Financials</div>
            <div class="input-row">
                <div><label>Elec Rate (₱/kWh)</label><input type="number" id="rate" value="12.00"></div>
                <div><label>Hours/Day</label><input type="number" id="hours" value="18"></div>
            </div>
            <div class="input-row">
                <div><label>Est. System Cost (₱)</label><input type="number" id="capex" value="1500000"></div>
                <div><label>Install Cost (₱)</label><input type="number" id="install" value="250000"></div>
            </div>

            <div class="enterprise-box">
                <div class="enterprise-toggle" onclick="toggleEnterprise()">
                    <strong><i class="fa-solid fa-chart-line"></i> Enterprise ROI Mode</strong>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="enterprise-content" id="ent-inputs">
                    <p style="font-size:12px; margin-bottom:10px; color:#666;">
                        Calculates ROI based on <strong>spoilage avoidance</strong> (value of product at risk).
                    </p>
                    <div class="input-row">
                        <div><label>Product Value (₱/kg)</label><input type="number" id="val_per_kg" value="250"></div>
                        <div><label>Risk w/o Cooling</label>
                            <select id="risk">
                                <option value="0.15">15% Spoilage</option>
                                <option value="0.30">30% Spoilage</option>
                                <option value="1.00">100% (Total Loss)</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div><label>WACC (%)</label><input type="number" id="wacc" value="7.0"></div>
                        <div><label>Lifespan (Yrs)</label><input type="number" id="life" value="10"></div>
                    </div>
                </div>
            </div>

            <button class="btn" onclick="calculate()">Analyze Project</button>
        </div>
    </div>

    <div class="results-container" id="results">
        
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value" id="res_kw">0.0 kW</div>
                <div class="kpi-label">Thermal Load</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value" style="color:var(--accent-green);" id="res_opex">₱0</div>
                <div class="kpi-label">Annual Elec. Cost</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value" style="color:var(--accent-purple);" id="res_tco">₱0</div>
                <div class="kpi-label">10-Year TCO</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px;">
            <div>
                <div class="section-title">Load Breakdown</div>
                <table class="breakdown-table">
                    <tr><td>Transmission (Walls/Roof)</td><td class="val-col" id="bd_trans">0 kW</td></tr>
                    <tr><td>Product (Pull-down)</td><td class="val-col" id="bd_prod">0 kW</td></tr>
                    <tr><td>Internal (Lights/People)</td><td class="val-col" id="bd_int">0 kW</td></tr>
                    <tr><td>Infiltration & Doors</td><td class="val-col" id="bd_inf">0 kW</td></tr>
                    <tr><td><strong>Total Required Capacity</strong></td><td class="val-col"><strong id="bd_total">0 kW</strong></td></tr>
                </table>
                <div style="background:#eef; padding:15px; border-radius:8px; font-size:14px;">
                    <strong>Recommended System:</strong> <span id="rec_sys">iCOOL XX HP</span><br>
                    <small>Based on estimated COP of <span id="est_cop">2.0</span></small>
                </div>
            </div>

            <div>
                <div class="section-title">Financial Analysis</div>
                <table class="breakdown-table">
                    <tr><td>Total Investment (CAPEX)</td><td class="val-col" id="fin_capex">₱0</td></tr>
                    <tr><td>Annual Energy Cost</td><td class="val-col" id="fin_opex">₱0</td></tr>
                    <tr id="row_roi" style="display:none; color:var(--accent-purple);">
                        <td><strong>Net Present Value (NPV)</strong></td>
                        <td class="val-col"><strong id="fin_npv">₱0</strong></td>
                    </tr>
                    <tr id="row_irr" style="display:none; color:var(--accent-purple);">
                        <td><strong>IRR (Return)</strong></td>
                        <td class="val-col"><strong id="fin_irr">0%</strong></td>
                    </tr>
                    <tr id="row_payback" style="display:none;">
                        <td>Payback Period</td>
                        <td class="val-col" id="fin_payback">0 Yrs</td>
                    </tr>
                </table>
                <div id="ent_summary" style="display:none; font-size:13px; color:#555; margin-top:10px;">
                    *ROI based on protecting <strong><span id="txt_risk_val">₱0</span>/year</strong> of product inventory.
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Toggle Enterprise Inputs
    function toggleEnterprise() {
        const el = document.getElementById('ent-inputs');
        const isHidden = el.style.display === 'none' || el.style.display === '';
        el.style.display = isHidden ? 'block' : 'none';
    }

    // --- PHYSICS DATA ---
    const productData = {
        meat_frozen: { sh: 3.2, lh: 230, fp: -2, sh_f: 1.6 },
        fish: { sh: 3.18, lh: 250, fp: -2.2, sh_f: 1.59 },
        fruits: { sh: 3.8, lh: 280, fp: -1.5, sh_f: 1.9 }
    };
    
    // Formatting Helpers
    const fmtMoney = n => '₱' + n.toLocaleString(undefined, {maximumFractionDigits:0});
    const fmtNum = n => n.toLocaleString(undefined, {maximumFractionDigits:1});

    // --- MAIN CALCULATION ---
    function calculate() {
        // 1. GET INPUTS
        const L = parseFloat(document.getElementById('L').value);
        const W = parseFloat(document.getElementById('W').value);
        const H = parseFloat(document.getElementById('H').value);
        const U = parseFloat(document.getElementById('panel').value);
        
        const temp_amb = parseFloat(document.getElementById('temp_amb').value);
        const temp_room = parseFloat(document.getElementById('temp_room').value);
        const dT = Math.abs(temp_amb - temp_room);
        
        const mass = parseFloat(document.getElementById('mass').value);
        const prodType = document.getElementById('prod_type').value;
        const temp_in = parseFloat(document.getElementById('temp_in').value);
        const door_opens = parseFloat(document.getElementById('door_opens').value);

        const rate = parseFloat(document.getElementById('rate').value);
        const hours = parseFloat(document.getElementById('hours').value);
        const capexSys = parseFloat(document.getElementById('capex').value);
        const capexInst = parseFloat(document.getElementById('install').value);

        // Enterprise Inputs
        const valPerKg = parseFloat(document.getElementById('val_per_kg').value);
        const riskFactor = parseFloat(document.getElementById('risk').value);
        const wacc = parseFloat(document.getElementById('wacc').value) / 100;
        const life = parseFloat(document.getElementById('life').value);
        const useEnterprise = document.getElementById('ent-inputs').style.display === 'block';

        // 2. THERMAL LOAD CALC (Physics)
        const area = (2*L*H) + (2*W*H) + (L*W);
        const load_trans = (area * U * dT) / 1000; // kW

        // Product Load
        const p = productData[prodType];
        let energy_prod = 0; // kJ
        if(temp_in > temp_room) {
            // Sensible Above
            if(temp_in > p.fp) energy_prod += mass * p.sh * (temp_in - Math.max(temp_room, p.fp));
            // Latent
            if(temp_room < p.fp && temp_in > p.fp) energy_prod += mass * p.lh;
            // Sensible Below
            if(temp_room < p.fp) energy_prod += mass * p.sh_f * (Math.min(temp_in, p.fp) - temp_room);
        }
        const load_prod = energy_prod / (24*3600); // kW (averaged 24h)

        // Internal (Simplified: 2 people + 10W/m2 lights/motors)
        const load_int = ((2 * 120) + (L*W*10)) / 1000;

        // Infiltration (Door + Air)
        const vol = L*W*H;
        const air_KJ_m3 = 1.25 * 1.006 * dT; 
        const ach = temp_room < 0 ? 6 : 8; // base air changes
        const door_vol = vol * 0.3 * door_opens; // 30% vol per opening
        const load_inf = ((vol * ach * air_KJ_m3) + (door_vol * air_KJ_m3)) / (24*3600);

        const total_load = (load_trans + load_prod + load_int + load_inf) * 1.1; // 10% safety

        // 3. EQUIPMENT SIZING
        let cop = temp_room < -10 ? 1.6 : 2.8;
        const elec_kw = total_load / cop;
        const hp = elec_kw * 1.341;

        // 4. FINANCIAL CALCS
        const annual_kwh = elec_kw * hours * 365;
        const annual_opex = annual_kwh * rate;
        const total_capex = capexSys + capexInst;
        
        // TCO (Simple 10 year sum, no discount for basic display)
        const tco_10y = total_capex + (annual_opex * 10);

        // 5. ENTERPRISE ROI (If enabled)
        let npv = 0, irr = 0, payback = 0;
        
        if (useEnterprise) {
            // Benefit = Value of Product Saved (Spoilage Avoidance) - Opex
            const annual_product_val = mass * 365 * valPerKg;
            const risk_val = annual_product_val * riskFactor; 
            const annual_benefit = risk_val - annual_opex;
            
            // Payback
            payback = total_capex / annual_benefit;

            // NPV
            npv = -total_capex;
            for(let t=1; t<=life; t++) {
                npv += annual_benefit / Math.pow(1+wacc, t);
            }

            // Simple IRR Estimator
            irr = estimateIRR(total_capex, annual_benefit, life);
        }

        // 6. RENDER RESULTS
        document.getElementById('results').style.display = 'block';
        
        // KPIs
        document.getElementById('res_kw').innerText = total_load.toFixed(1) + ' kW';
        document.getElementById('res_opex').innerText = fmtMoney(annual_opex);
        document.getElementById('res_tco').innerText = fmtMoney(tco_10y);

        // Breakdown Text
        document.getElementById('bd_trans').innerText = load_trans.toFixed(2) + ' kW';
        document.getElementById('bd_prod').innerText = load_prod.toFixed(2) + ' kW';
        document.getElementById('bd_int').innerText = load_int.toFixed(2) + ' kW';
        document.getElementById('bd_inf').innerText = load_inf.toFixed(2) + ' kW';
        document.getElementById('bd_total').innerText = total_load.toFixed(2) + ' kW';

        // Recommendation
        document.getElementById('rec_sys').innerText = `iCOOL ${Math.ceil(hp)} HP`;
        document.getElementById('est_cop').innerText = cop.toFixed(1);

        // Financials
        document.getElementById('fin_capex').innerText = fmtMoney(total_capex);
        document.getElementById('fin_opex').innerText = fmtMoney(annual_opex);

        // Enterprise Rows
        const entRows = ['row_roi', 'row_irr', 'row_payback', 'ent_summary'];
        entRows.forEach(id => document.getElementById(id).style.display = useEnterprise ? 'table-row' : 'none');
        if(useEnterprise) {
            document.getElementById('ent_summary').style.display = 'block';
            document.getElementById('fin_npv').innerText = fmtMoney(npv);
            document.getElementById('fin_irr').innerText = (irr*100).toFixed(1) + '%';
            document.getElementById('fin_payback').innerText = payback > 0 ? payback.toFixed(1) + ' Yrs' : 'N/A';
            document.getElementById('txt_risk_val').innerText = fmtMoney(mass * 365 * valPerKg * riskFactor);
        }
    }

    // Helper: Simple Newton-Raphson for IRR
    function estimateIRR(capex, cashflow, years) {
        let guess = 0.1;
        for(let i=0; i<50; i++) {
            let npv = -capex;
            let d_npv = 0;
            for(let t=1; t<=years; t++) {
                npv += cashflow / Math.pow(1+guess, t);
                d_npv -= (t * cashflow) / Math.pow(1+guess, t+1);
            }
            if(Math.abs(npv) < 1) return guess;
            guess = guess - (npv/d_npv);
        }
        return guess;
    }
</script>

</body>
</html>
