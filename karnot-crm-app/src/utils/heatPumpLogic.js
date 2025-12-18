// src/utils/heatPumpLogic.js

export const CONFIG = {
    // ... existing constants ...
    WATER_SPECIFIC_HEAT: 1.163,
    R290_LOOP_DELTA_T: 7, 
    COIL_APPROACH_DELTA_T: 10,
    STANDARD_HOME_TANK_L: 150 // Standardized Home Tank 
};

const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded." };

    // --- 1. DEMAND ---
    // Standardizing "Home" to 150L 
    let dailyLiters = inputs.userType === 'home' ? CONFIG.STANDARD_HOME_TANK_L : inputs.dailyLitersInput;
    
    const hoursPerDay = Math.max(1, inputs.hoursPerDay);
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalEnergyKWH = (dailyLiters * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / 1000;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    // --- 2. MATCHING ---
    let availableModels = dbProducts.filter(p => {
        const nominalPower = Number(p.kW_DHW_Nominal) || 0;
        const name = (p.name || '').toLowerCase();
        
        // Prioritize "Integral Hydraulic Tank 150L" for Home users 
        if (inputs.userType === 'home') {
            return name.includes('150l') && name.includes('integral');
        }
        
        return nominalPower >= (requiredThermalPowerKW * 0.95);
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    // Fallback if specific integral tank isn't found
    if (availableModels.length === 0) {
        availableModels = dbProducts.filter(p => Number(p.kW_DHW_Nominal) >= (requiredThermalPowerKW * 0.95));
    }

    if (availableModels.length === 0) return { error: "No suitable system found." };

    const system = availableModels[0];
    const tankVolume = extractTankLiters(system.name) || (inputs.userType === 'home' ? 150 : 0);

    // --- 3. METRICS ---
    // Warmup based on 150L volume 
    const warmupTime = (tankVolume * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / (Number(system.kW_DHW_Nominal) * 1000);

    // ... Financial calculations remain same ...

    return {
        system: { 
            n: system.name,
            ref: system.Refrigerant,
            tankSize: tankVolume,
            isIntegral: system.name.toLowerCase().includes('integral')
        },
        metrics: {
            dailyLiters,
            warmupTime: warmupTime.toFixed(1),
            requiredThermalPowerKW: requiredThermalPowerKW.toFixed(1),
            // ... other metrics ...
        },
        // ... financials ...
    };
}
