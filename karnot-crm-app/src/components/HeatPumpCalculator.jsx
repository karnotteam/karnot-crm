import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, RefreshCw, X, Printer, Save } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [showModal, setShowModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const auth = getAuth();
        const querySnapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    };
    fetch();
  }, []);

  const handleApplyFixtures = () => {
      const total = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
      setInputs(prev => ({ ...prev, dailyLitersInput: total }));
      setShowModal(false);
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const symbol = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="space-y-6">
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded bg-white" value={inputs.userType} onChange={(e) => setInputs(p => ({...p, userType: e.target.value}))}>
                            <option value="home">Home</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="resort">Hotels & Resorts</option>
                            <option value="school">Schools</option>
                            <option value="office">Office</option>
                            <option value="spa">Spa</option>
                        </select>
                        {['school','office','spa'].includes(inputs.userType) && (
                            <div>
                                <Input label="Daily Liters" type="number" value={inputs.dailyLitersInput} onChange={e => setInputs(p => ({...p, dailyLitersInput: +e.target.value}))} />
                                <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline font-medium">Estimate via Fixtures</button>
                            </div>
                        )}
                        {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e => setInputs(p => ({...p, occupants: +e.target.value}))} />}
                        {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e => setInputs(p => ({...p, mealsPerDay: +e.target.value}))} />}
                        <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={e => setInputs(p => ({...p, hoursPerDay: +e.target.value}))} />
                    </div>
                </Section>

                <Section title="2. Your Costs">
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded bg-white" value={inputs.currency} onChange={(e) => setInputs(p => ({...p, currency: e.target.value}))}>
                            <option value="PHP">₱ PHP</option><option value="USD">$ USD</option>
                        </select>
                        <select className="w-full border p-2 rounded bg-white" value={inputs.heatingType} onChange={(e) => setInputs(p => ({...p, heatingType: e.target.value}))}>
                            <option value="electric">Electric</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                        </select>
                        <Input label={`Fuel Price (${symbol})`} type="number" value={inputs.fuelPrice} onChange={e => setInputs(p => ({...p, fuelPrice: +e.target.value}))} />
                        <Input label={`Elec Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={e => setInputs(p => ({...p, elecRate: +e.target.value}))} />
                    </div>
                </Section>
                
                <Section title="3. Conditions">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={e => setInputs(p => ({...p, ambientTemp: +e.target.value}))} />
                            <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={e => setInputs(p => ({...p, inletTemp: +e.target.value}))} />
                        </div>
                        <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={e => setInputs(p => ({...p, targetTemp: +e.target.value}))} />
                        <select className="w-full border p-2 rounded bg-white" value={inputs.heatPumpType} onChange={(e) => setInputs(p => ({...p, heatPumpType: e.target.value}))}>
                            <option value="all">All Models</option>
                            <option value="r290">R290 Only</option>
                            <option value="r32">R32 Only</option>
                        </select>
                    </div>
                </Section>
            </div>

            <div className="mt-8 flex justify-center">
                <Button onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} className="px-12 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold uppercase tracking-wide">Calculate ROI</Button>
            </div>

            {result && !result.error && (
                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-xl font-bold text-orange-600 uppercase tracking-tight">{result.system.name}</h3>
                        <div className="text-4xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded border shadow-sm text-center">
                             <div className="text-[10px] uppercase font-bold text-gray-400">Payback</div>
                             <div className="text-xl font-bold text-slate-800">{result.financials.paybackYears} Yrs</div>
                        </div>
                        <div className="bg-white p-4 rounded border shadow-sm text-center">
                             <div className="text-[10px] uppercase font-bold text-gray-400">CO2 Saved</div>
                             <div className="text-xl font-bold text-green-600">{fmt(result.metrics.emissionsSaved)} kg</div>
                        </div>
                    </div>
                </div>
            )}
        </Card>

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4">
                <Card className="max-w-md w-full relative p-8 bg-white shadow-2xl">
                    <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors"><X size={24}/></button>
                    <h3 className="text-lg font-bold mb-6 text-orange-600 border-b pb-2 uppercase tracking-wide">Estimate Hot Water Use</h3>
                    <div className="space-y-4">
                        <Input label="Showers" type="number" value={fixtures.showers} onChange={e => setFixtures(p => ({...p, showers: +e.target.value}))} />
                        <Input label="Kitchen Sinks" type="number" value={fixtures.sinks} onChange={e => setFixtures(p => ({...p, sinks: +e.target.value}))} />
                        <Input label="People" type="number" value={fixtures.people} onChange={e => setFixtures(p => ({...p, people: +e.target.value}))} />
                        <Button onClick={handleApplyFixtures} className="w-full bg-orange-600 text-white py-3 font-bold uppercase tracking-wider shadow-lg">Apply to Calculator</Button>
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
