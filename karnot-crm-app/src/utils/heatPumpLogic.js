// src/utils/logic.jsx

export const CONFIG = {
  FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
  SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },

  // Baseline conversion constants
  KWH_PER_KG_LPG: 13.8,
  DIESEL_KWH_PER_LITER: 10.7,

  // Solar assumptions
  SOLAR_PANEL_KW_RATED: 0.425,
  SOLAR_PANEL_COST_USD: 200,
  INVERTER_COST_PER_WATT_USD: 0.30,

  // Cooling bonus factor (matches your HTML concept)
  COOLING_COP: 2.6,

  // Simple emissions factors (tweak later if you want exact PH grid)
  EM_FACTOR: {
    electric_grid: 0.7,
    electric_solar: 0.12,
    propane: 0.23,
    gas: 0.20,
    diesel: 0.25,
  },

  // Perf scaling (keep simple; matches your current CRM version more than HTML lift-based one)
  RATED_AMBIENT_C: 20,
  PERF_PER_DEG_C: 0.015,
};

// ---------- helpers ----------
const num = (v, fallback = 0) => {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v, fallback = "") => (v == null ? fallback : String(v));

const pick = (obj, keys, fallback = undefined) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
};

const includesAny = (s, arr) => arr.some(x => s.includes(x));

/**
 * Normalizes Firestore product docs into a stable shape.
 * This is the key to making your CRM reliable despite mixed CSV headers.
 */
export function normalizeProduct(raw) {
  const name = str(pick(raw, ["name", "n", "Product", "Model", "Title"], "Unnamed"));
  const category = str(pick(raw, ["category", "Category", "type", "Type"], "")).toLowerCase();

  const refrigerantRaw = str(pick(raw, ["Refrigerant", "refrigerant", "Gas", "gas"], "")).toUpperCase();
  const refrigerant = refrigerantRaw
    .replace("R-290", "R290")
    .replace("R-32", "R32")
    .replace("R-744", "R744");

  // Price in USD (try all common column names)
  const priceUSD = num(
    pick(raw, ["salesPriceUSD", "priceUSD", "usd", "USD", "Sales Price USD", "Price (USD)"], 0),
    0
  );

  // COP for DHW
  const copDHW = num(
    pick(raw, ["COP_DHW", "cop", "COP", "DHW_COP", "cop_dhw"], 3.8),
    3.8
  );

  // Nominal DHW output kW
  const dhwKW = num(
    pick(raw, ["kW_DHW_Nominal", "DHW_kW", "kW", "kw", "Nominal kW", "Heating Capacity kW"], 0),
    0
  );

  // Max DHW temp
  const maxTempC = num(
    pick(raw, ["max_temp_c", "Max Temp C", "MaxTempC", "Max Water Temp", "maxTemp"], 65),
    65
  );

  // Reversible / cooling capable
  const reversible = (() => {
    const v = pick(raw, ["isReversible", "reversible", "Reversible", "Cooling", "cooling"], false);
    if (typeof v === "boolean") return v;
    const s = str(v, "").toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  })();

  // Storage tanks (AquaHERO etc.) — detect tank size from name or explicit fields
  const tankLiters =
    num(pick(raw, ["integral_storage_L", "Tank_L", "tankLiters", "Storage (L)"], 0), 0) ||
    (name.toLowerCase().includes("300") ? 300 : name.toLowerCase().includes("200") ? 200 : 0);

  return {
    id: raw?.id,
    raw,
    name,
    category,
    refrigerant,
    priceUSD,
    copDHW,
    dhwKW,
    maxTempC,
    reversible,
    tankLiters,
  };
}

function demandLitersPerDay(inputs) {
  const u = inputs.userType;

  if (u === "home") return Math.max(0, num(inputs.occupants, 0) * 50);
  if (u === "restaurant") return Math.max(0, num(inputs.mealsPerDay, 0) * 7);
  if (u === "resort")
    return Math.max(0, num(inputs.roomsOccupied, 0) * 50 + num(inputs.mealsPerDay, 0) * 7);

  // office / school / spa use direct liters input
  return Math.max(0, num(inputs.dailyLitersInput, 0));
}

function baselineRatePerKwh(inputs) {
  // Matches your HTML logic
  const heatingType = inputs.heatingType;
  if (heatingType === "propane") {
    const lpgPrice = num(inputs.fuelPrice, 0);
    const lpgSize = Math.max(1, num(inputs.tankSize, 11));
    return (lpgPrice / lpgSize) / CONFIG.KWH_PER_KG_LPG;
  }
  if (heatingType === "diesel") {
    const dieselPrice = num(inputs.fuelPrice, 0);
    return dieselPrice / CONFIG.DIESEL_KWH_PER_LITER;
  }
  // electric or gas: use elecRate field (it’s “rate per kWh equivalent”)
  return num(inputs.elecRate, num(inputs.fuelPrice, 0));
}

function perfFactorAmbient(inputs) {
  const amb = num(inputs.ambientTemp, CONFIG.RATED_AMBIENT_C);
  return 1 + (amb - CONFIG.RATED_AMBIENT_C) * CONFIG.PERF_PER_DEG_C;
}

function refrigerantMatches(filter, refrigerant) {
  if (!filter || filter === "all") return true;
  const f = String(filter).toUpperCase();
  const r = String(refrigerant || "").toUpperCase();

  if (f === "CO2" || f === "R744") return r.includes("CO2") || r.includes("R744");
  return r.includes(f);
}

/**
 * Main calculation entrypoint used by the CRM calculator component.
 * Returns { error } or a full result object ready for UI.
 */
export function calculate(inputs, dbProducts) {
  const products = (dbProducts || []).map(normalizeProduct);
  if (!products.length) return { error: "Inventory empty (no products loaded from CRM)." };

  // --- 1) Demand ---
  const dailyLiters = demandLitersPerDay(inputs);
  if (dailyLiters <= 0) return { error: "Please enter a valid demand (liters/day, meals, rooms, or occupants)." };

  const inletTemp = num(inputs.inletTemp, 15);
  const targetTemp = num(inputs.targetTemp, 55);
  const deltaT = Math.max(1, targetTemp - inletTemp);

  // kWh/day thermal (matches your HTML)
  const dailyThermalKwh = (dailyLiters * deltaT * 1.163) / 1000;

  const hoursPerDay = Math.max(1, num(inputs.hoursPerDay, 12));
  const peakThermalKW = dailyThermalKwh / hoursPerDay;

  // --- 2) Baseline cost ---
  const rateKwh = baselineRatePerKwh(inputs);
  const annualCostOld = dailyThermalKwh * 365 * rateKwh;

  // --- 3) Select best suitable model from CRM inventory ---
  const pf = perfFactorAmbient(inputs);
  const typeFilter = inputs.heatPumpType || "all";
  const needCooling = !!inputs.includeCooling;

  let candidates = products.filter(p => {
    // filter by refrigerant
    if (!refrigerantMatches(typeFilter, p.refrigerant)) return false;

    // cooling requirement
    if (needCooling && !p.reversible) return false;

    // max temperature constraint
    if (targetTemp > (p.maxTempC || 65)) return false;

    const nameL = p.name.toLowerCase();
    const isStorage = p.tankLiters > 0 || includesAny(nameL, ["aquahero", "tank", "stor", "istOR".toLowerCase()]);

    if (isStorage) {
      // HTML-ish: storage capacity supports up to ~3x tank (rough rule)
      const tank = p.tankLiters || 0;
      if (tank <= 0) return false;
      return dailyLiters <= tank * 3 * pf;
    }

    // flow/monoblock: compare required thermal kW to nominal capacity (scaled)
    const nominal = p.dhwKW || 0;
    if (nominal <= 0) return false;
    return peakThermalKW <= nominal * pf;
  });

  // Sort by cheapest priced unit first, but prefer priced products (>0)
  candidates.sort((a, b) => {
    const ap = a.priceUSD > 0;
    const bp = b.priceUSD > 0;
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    return (a.priceUSD || 999999) - (b.priceUSD || 999999);
  });

  if (!candidates.length) {
    return {
      error:
        "No suitable models found for these conditions. (Check target temp / cooling requirement / heat pump type, and confirm your product records have refrigerant, max temp, COP and DHW kW fields.)",
    };
  }

  const system = candidates[0];

  // --- 4) New system cost / solar sizing ---
  const fx = CONFIG.FX[inputs.currency] || 1;
  const symbol = CONFIG.SYMBOLS[inputs.currency] || "";

  const sysPriceLocal = (system.priceUSD || 0) * fx;
  const cop = system.copDHW || 3.8;

  const karnotDailyElecKwh = dailyThermalKwh / cop;
  const karnotPowerKW = karnotDailyElecKwh / hoursPerDay;

  let karnotAnnualCost = 0;
  let panelCount = 0;
  let solarCost = 0;
  let inverterCost = 0;

  const systemType = inputs.systemType || "grid-only";

  if (systemType === "grid-only") {
    karnotAnnualCost = karnotDailyElecKwh * 365 * num(inputs.elecRate, rateKwh);
  } else {
    // correct solar sizing: energy-based using sun hours
    const sunHours = Math.max(1, num(inputs.sunHours, 5.5));
    const gridHours = Math.max(0, hoursPerDay - sunHours);

    karnotAnnualCost = (karnotPowerKW * gridHours) * 365 * num(inputs.elecRate, rateKwh);

    const dailySolarKwhPerPanel = CONFIG.SOLAR_PANEL_KW_RATED * sunHours;
    panelCount = Math.ceil(karnotDailyElecKwh / dailySolarKwhPerPanel);

    solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;

    const inverterWatts = panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000;
    inverterCost = inverterWatts * CONFIG.INVERTER_COST_PER_WATT_USD * fx;
  }

  // --- 5) Optional “Free cooling bonus” (matches your HTML concept) ---
  let coolSavings = 0;
  if (inputs.includeCooling && system.reversible) {
    // same structure as HTML: cooling benefit proportional to DHW electrical input
    const dailyCoolingKwh = (dailyThermalKwh / cop) * CONFIG.COOLING_COP;
    coolSavings = dailyCoolingKwh * 365 * num(inputs.elecRate, rateKwh);
  }

  const totalCapex = sysPriceLocal + solarCost + inverterCost;
  const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

  const paybackYears =
    totalSavings > 0 && totalCapex > 0 ? (totalCapex / totalSavings).toFixed(1) : "N/A";

  // --- 6) Emissions saved (rough, but consistent) ---
  const isSolar = systemType === "grid-solar";
  const oldKey = inputs.heatingType === "electric" ? "electric_grid" : (inputs.heatingType || "electric_grid");
  const emOld = CONFIG.EM_FACTOR[oldKey] ?? 0.7;
  const emNew = CONFIG.EM_FACTOR[isSolar ? "electric_solar" : "electric_grid"] ?? 0.7;

  const emissionsSaved =
    (dailyThermalKwh * 365 * emOld) - (karnotDailyElecKwh * 365 * emNew);

  return {
    system: {
      id: system.id,
      n: system.name,
      refrigerant: system.refrigerant,
      maxTempC: system.maxTempC,
      reversible: system.reversible,
      priceLocal: sysPriceLocal,
      priceUSD: system.priceUSD,
      cop,
      dhwKW: system.dhwKW,
    },
    metrics: {
      dailyLiters,
      dailyThermalKwh: Number(dailyThermalKwh.toFixed(2)),
      peakThermalKW: Number(peakThermalKW.toFixed(2)),
      powerKW: Number(karnotPowerKW.toFixed(2)),
      panelCount,
      emissionsSavedKg: Math.round(emissionsSaved),
    },
    financials: {
      symbol,
      annualCostOld,
      karnotAnnualCost,
      coolSavings,
      totalSavings,
      paybackYears,
      capex: {
        system: sysPriceLocal,
        solar: solarCost,
        inverter: inverterCost,
        total: totalCapex,
      },
    },
  };
}
