// src/pages/calculator.jsx

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { calculate, CONFIG } from "../utils/logic.jsx";
import { Card, Section, Input, Button } from "../data/constants.jsx";
import { Droplets, X, RefreshCw, Printer } from "lucide-react";

const DEFAULTS = {
  currency: "PHP",
  userType: "home",
  occupants: 4,
  dailyLitersInput: 500,
  mealsPerDay: 0,
  roomsOccupied: 0,
  hoursPerDay: 12,

  heatingType: "electric", // electric | gas | propane | diesel
  elecRate: 12.25,         // rate for electric OR gas (kWh-eq)
  fuelPrice: 950,          // propane cylinder price OR diesel price/liter
  tankSize: 11,            // propane kg

  ambientTemp: 30,
  inletTemp: 15,
  targetTemp: 55,

  systemType: "grid-solar", // grid-only | grid-solar
  sunHours: 5.5,

  heatPumpType: "all",      // all | R32 | R290 | CO2
  includeCooling: false,
};

export default function Calculator() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [showModal, setShowModal] = useState(false);

  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load CRM products
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        if (!user) {
          setDbProducts([]);
          return;
        }
        const snap = await getDocs(collection(db, "users", user.uid, "products"));
        setDbProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to load products:", e);
        setDbProducts([]);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const result = useMemo(() => {
    if (loading) return null;
    return calculate(inputs, dbProducts);
  }, [inputs, dbProducts, loading]);

  const sym = CONFIG.SYMBOLS[inputs.currency] || "";
  const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const showLitersField = ["office", "school", "spa"].includes(inputs.userType);
  const showMeals = ["restaurant", "resort"].includes(inputs.userType);
  const showRooms = inputs.userType === "resort";
  const showOccupants = inputs.userType === "home";

  const applyFixtures = () => {
    const total = Math.round(
      (50 * fixtures.showers * 0.4) +
      (284 * fixtures.people * 0.15 * 0.25 * 0.4) +
      (20 * fixtures.basins * 0.4) +
      (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4)
    );
    setInputs(p => ({ ...p, dailyLitersInput: total }));
    setShowModal(false);
  };

  const printReport = () => {
    if (!result || result.error) return;

    const q = result;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>Karnot Savings Report</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;padding:32px;color:#1d1d1f}
          h1{color:#F56600;margin:0 0 6px}
          .muted{color:#6e6e73}
          .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:18px 0}
          .card{border:1px solid #eee;border-radius:14px;padding:14px}
          .big{font-size:22px;font-weight:800;color:#F56600}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          td{padding:10px 0;border-bottom:1px solid #eee}
          td:last-child{text-align:right;font-weight:700}
        </style>
      </head>
      <body>
        <h1>Karnot Savings Report</h1>
        <div class="muted">Recommendation based on your inputs.</div>

        <h2>${q.system.n}</h2>
        <div class="grid">
          <div class="card"><div class="muted">Annual Savings</div><div class="big">${q.financials.symbol}${fmt(q.financials.totalSavings)}</div></div>
          <div class="card"><div class="muted">Payback</div><div class="big">${q.financials.paybackYears} yrs</div></div>
          <div class="card"><div class="muted">CO₂ Saved</div><div class="big">${fmt(q.metrics.emissionsSavedKg)} kg</div></div>
        </div>

        <table>
          <tr><td>Old annual cost</td><td>${q.financials.symbol}${fmt(q.financials.annualCostOld)}</td></tr>
          <tr><td>New annual cost</td><td>${q.financials.symbol}${fmt(q.financials.karnotAnnualCost)}</td></tr>
          <tr><td>Free cooling savings</td><td>${q.financials.symbol}${fmt(q.financials.coolSavings)}</td></tr>
          <tr><td>Heat pump</td><td>${q.financials.symbol}${fmt(q.financials.capex.system)}</td></tr>
          <tr><td>Solar</td><td>${q.financials.symbol}${fmt(q.financials.capex.solar)}</td></tr>
          <tr><td>Inverter/BOS</td><td>${q.financials.symbol}${fmt(q.financials.capex.inverter)}</td></tr>
          <tr><td>Total CAPEX</td><td>${q.financials.symbol}${fmt(q.financials.capex.total)}</td></tr>
        </table>

        <script>window.print()</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-orange-600 uppercase tracking-tight">
            Karnot Heat Pump Calculator (CRM)
          </h2>
          {loading && <RefreshCw className="animate-spin text-gray-400" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Section title="1. Your Demand">
            <div className="space-y-4">
              <select
                className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.userType}
                onChange={e => setInputs(p => ({ ...p, userType: e.target.value }))}
              >
                <option value="home">Home</option>
                <option value="restaurant">Restaurant</option>
                <option value="spa">Spa / Clinic</option>
                <option value="resort">Hotels & Resorts</option>
                <option value="school">Schools & Colleges</option>
                <option value="office">Office</option>
              </select>

              {showOccupants && (
                <Input
                  label="Number of Occupants"
                  type="number"
                  value={inputs.occupants}
                  onChange={e => setInputs(p => ({ ...p, occupants: +e.target.value }))}
                />
              )}

              {showLitersField && (
                <div>
                  <Input
                    label="Liters of hot water per day"
                    type="number"
                    value={inputs.dailyLitersInput}
                    onChange={e => setInputs(p => ({ ...p, dailyLitersInput: +e.target.value }))}
                  />
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 font-bold uppercase mt-2 italic underline"
                  >
                    <Droplets size={12} /> Estimate via Fixtures
                  </button>
                </div>
              )}

              {showMeals && (
                <Input
                  label="Meals served per day"
                  type="number"
                  value={inputs.mealsPerDay}
                  onChange={e => setInputs(p => ({ ...p, mealsPerDay: +e.target.value }))}
                />
              )}

              {showRooms && (
                <Input
                  label="Rooms occupied daily"
                  type="number"
                  value={inputs.roomsOccupied}
                  onChange={e => setInputs(p => ({ ...p, roomsOccupied: +e.target.value }))}
                />
              )}

              <Input
                label="Daily Operating Hours"
                type="number"
                value={inputs.hoursPerDay}
                onChange={e => setInputs(p => ({ ...p, hoursPerDay: +e.target.value }))}
              />
            </div>
          </Section>

          <Section title="2. Your Costs">
            <div className="space-y-4">
              <select
                className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.currency}
                onChange={e => setInputs(p => ({ ...p, currency: e.target.value }))}
              >
                <option value="USD">$ USD</option>
                <option value="PHP">₱ PHP</option>
                <option value="GBP">£ GBP</option>
                <option value="EUR">€ EUR</option>
              </select>

              <select
                className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.heatingType}
                onChange={e => setInputs(p => ({ ...p, heatingType: e.target.value }))}
              >
                <option value="electric">Electric</option>
                <option value="gas">Natural Gas</option>
                <option value="propane">Propane (LPG)</option>
                <option value="diesel">Diesel</option>
              </select>

              {(inputs.heatingType === "electric" || inputs.heatingType === "gas") && (
                <Input
                  label={`Rate (${sym}/kWh)`}
                  type="number"
                  value={inputs.elecRate}
                  onChange={e => setInputs(p => ({ ...p, elecRate: +e.target.value }))}
                />
              )}

              {inputs.heatingType === "propane" && (
                <>
                  <Input
                    label={`LPG Cylinder Price (${sym})`}
                    type="number"
                    value={inputs.fuelPrice}
                    onChange={e => setInputs(p => ({ ...p, fuelPrice: +e.target.value }))}
                  />
                  <Input
                    label="Cylinder Size (kg)"
                    type="number"
                    value={inputs.tankSize}
                    onChange={e => setInputs(p => ({ ...p, tankSize: +e.target.value }))}
                  />
                </>
              )}

              {inputs.heatingType === "diesel" && (
                <Input
                  label={`Diesel Price per Liter (${sym})`}
                  type="number"
                  value={inputs.fuelPrice}
                  onChange={e => setInputs(p => ({ ...p, fuelPrice: +e.target.value }))}
                />
              )}
            </div>
          </Section>

          <Section title="3. Conditions & Options">
            <div className="space-y-4">
              <Input label="Average Ambient Air Temp (°C)" type="number" value={inputs.ambientTemp}
                onChange={e => setInputs(p => ({ ...p, ambientTemp: +e.target.value }))} />
              <Input label="Cold Water Inlet Temp (°C)" type="number" value={inputs.inletTemp}
                onChange={e => setInputs(p => ({ ...p, inletTemp: +e.target.value }))} />
              <Input label="Target Hot Water Temp (°C)" type="number" value={inputs.targetTemp}
                onChange={e => setInputs(p => ({ ...p, targetTemp: +e.target.value }))} />

              <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.systemType}
                onChange={e => setInputs(p => ({ ...p, systemType: e.target.value }))}>
                <option value="grid-only">Grid Only</option>
                <option value="grid-solar">Grid + Solar (Offset)</option>
              </select>

              {inputs.systemType === "grid-solar" && (
                <Input label="Average Daily Sun Hours" type="number" value={inputs.sunHours}
                  onChange={e => setInputs(p => ({ ...p, sunHours: +e.target.value }))} />
              )}

              <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.heatPumpType}
                onChange={e => setInputs(p => ({ ...p, heatPumpType: e.target.value }))}>
                <option value="all">Best Price (All Models)</option>
                <option value="R32">R32 Models Only</option>
                <option value="R290">R290 Models Only</option>
                <option value="CO2">CO2 Models Only</option>
              </select>

              <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold"
                value={inputs.includeCooling ? "yes" : "no"}
                onChange={e => setInputs(p => ({ ...p, includeCooling: e.target.value === "yes" }))}>
                <option value="no">No</option>
                <option value="yes">Yes (Require Cooling)</option>
              </select>
            </div>
          </Section>
        </div>

        {/* Results */}
        <div className="mt-10">
          {result?.error && (
            <div className="p-4 rounded-lg border bg-red-50 text-red-700 font-bold">
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div className="p-8 rounded-2xl border bg-white space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommended System</div>
                  <div className="text-3xl font-black text-orange-600">{result.system.n}</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">
                    {result.system.refrigerant} · Max {result.system.maxTempC}°C · COP {result.system.cop}
                  </div>
                </div>
                <Button onClick={printReport} className="flex items-center gap-2">
                  <Printer size={16} /> Print Report
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-slate-50 text-center">
                  <div className="text-xs font-black text-slate-400 uppercase">Annual Savings</div>
                  <div className="text-2xl font-black">{result.financials.symbol}{fmt(result.financials.totalSavings)}</div>
                </div>
                <div className="p-4 rounded-xl border bg-slate-50 text-center">
                  <div className="text-xs font-black text-slate-400 uppercase">Payback</div>
                  <div className="text-2xl font-black">{result.financials.paybackYears} yrs</div>
                </div>
                <div className="p-4 rounded-xl border bg-slate-50 text-center">
                  <div className="text-xs font-black text-slate-400 uppercase">Panels</div>
                  <div className="text-2xl font-black">{result.metrics.panelCount}</div>
                </div>
                <div className="p-4 rounded-xl border bg-slate-50 text-center">
                  <div className="text-xs font-black text-slate-400 uppercase">CO₂ Saved</div>
                  <div className="text-2xl font-black">{fmt(result.metrics.emissionsSavedKg)} kg</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border p-6 space-y-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Old annual cost</span><span>{result.financials.symbol}{fmt(result.financials.annualCostOld)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>New annual cost</span><span>{result.financials.symbol}{fmt(result.financials.karnotAnnualCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Free cooling savings</span><span>{result.financials.symbol}{fmt(result.financials.coolSavings)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t pt-3 mt-3">
                  <span>Total CAPEX</span><span className="text-orange-600">{result.financials.symbol}{fmt(result.financials.capex.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Fixture modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[999] p-6">
          <div className="bg-white p-10 rounded-[2rem] max-w-lg w-full relative shadow-2xl border">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-orange-600">
              <X size={28} />
            </button>
            <div className="text-xl font-black mb-6">Estimate Hot Water Use</div>
            <div className="space-y-4">
              <Input label="Number of Showers" type="number" value={fixtures.showers}
                onChange={e => setFixtures(p => ({ ...p, showers: +e.target.value }))} />
              <Input label="Lavatory Basins" type="number" value={fixtures.basins}
                onChange={e => setFixtures(p => ({ ...p, basins: +e.target.value }))} />
              <Input label="Kitchen Sinks" type="number" value={fixtures.sinks}
                onChange={e => setFixtures(p => ({ ...p, sinks: +e.target.value }))} />
              <Input label="Occupants" type="number" value={fixtures.people}
                onChange={e => setFixtures(p => ({ ...p, people: +e.target.value }))} />
              <Input label="Hours per Day" type="number" value={fixtures.hours}
                onChange={e => setFixtures(p => ({ ...p, hours: +e.target.value }))} />
              <Button onClick={applyFixtures} className="w-full bg-orange-600 text-white">
                Use These Values
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
