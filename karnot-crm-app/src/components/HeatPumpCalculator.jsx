import React, { useState, useEffect } from 'react';
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic';

const KarnotCalculator = ({ dbProducts }) => {
    const [inputs, setInputs] = useState({
        userType: 'home',
        occupants: 4,
        mealsPerDay: 0,
        roomsOccupied: 0,
        dailyLitersInput: 500,
        hoursPerDay: 12,
        currency: 'PHP',
        heatingType: 'electric',
        elecRate: 12.25,
        fuelPrice: 950,
        tankSize: 11,
        ambientTemp: 30,
        inletTemp: 15,
        targetTemp: 55,
        systemType: 'grid-solar',
        sunHours: 5.5,
        heatPumpType: 'all',
        includeCooling: false
    });

    const [res, setRes] = useState(null);

    useEffect(() => {
        const result = calculateHeatPump(inputs, dbProducts);
        setRes(result);
    }, [inputs, dbProducts]);

    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (type === 'number' || e.target.tagName === 'RANGE') val = parseFloat(value);
        setInputs(prev => ({ ...prev, [name]: val }));
    };

    const changeCurrency = (e) => {
        const c = e.target.value;
        setInputs(prev => ({
            ...prev,
            currency: c,
            elecRate: CONFIG.defaultRate[c].grid,
            fuelPrice: prev.heatingType === 'propane' ? CONFIG.defaultRate[c].lpgPrice : CONFIG.defaultRate[c].diesel,
            tankSize: CONFIG.defaultRate[c].lpgSize
        }));
    };

    return (
        <div className="max-w-6xl mx-auto p-6 font-sans text-gray-900">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-3xl font-bold text-orange-600 mb-2">Karnot Heat Pump Calculator</h2>
                    <p className="text-gray-500">Calculate industrial-grade savings using our central product database.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3">
                    {/* INPUT SECTION */}
                    <div className="lg:col-span-2 p-8 space-y-8 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 1. Demand */}
                            <section>
                                <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2 mb-4">1. Your Demand</h3>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">User Type</label>
                                <select name="userType" value={inputs.userType} onChange={handleInput} className="w-full p-3 bg-gray-50 border rounded-xl mb-4">
                                    <option value="home">Home</option>
                                    <option value="restaurant">Restaurant</option>
                                    <option value="resort">Hotels & Resorts</option>
                                    <option value="manual">Manual Liters</option>
                                </select>

                                {inputs.userType === 'home' && (
                                    <input type="number" name="occupants" value={inputs.occupants} onChange={handleInput} placeholder="Occupants" className="w-full p-3 border rounded-xl" />
                                )}
                                {inputs.userType === 'restaurant' && (
                                    <input type="number" name="mealsPerDay" value={inputs.mealsPerDay} onChange={handleInput} placeholder="Meals per day" className="w-full p-3 border rounded-xl" />
                                )}
                                {inputs.userType === 'resort' && (
                                    <div className="space-y-2">
                                        <input type="number" name="roomsOccupied" value={inputs.roomsOccupied} onChange={handleInput} placeholder="Rooms" className="w-full p-3 border rounded-xl" />
                                        <input type="number" name="mealsPerDay" value={inputs.mealsPerDay} onChange={handleInput} placeholder="Meals" className="w-full p-3 border rounded-xl" />
                                    </div>
                                )}
                            </section>

                            {/* 2. Costs */}
                            <section>
                                <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2 mb-4">2. Your Costs</h3>
                                <select onChange={changeCurrency} value={inputs.currency} className="w-full p-3 bg-gray-50 border rounded-xl mb-4">
                                    {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{CONFIG.SYMBOLS[c]} {c}</option>)}
                                </select>
                                <select name="heatingType" value={inputs.heatingType} onChange={handleInput} className="w-full p-3 bg-gray-50 border rounded-xl mb-4">
                                    <option value="electric">Electric</option>
                                    <option value="propane">Propane (LPG)</option>
                                    <option value="diesel">Diesel</option>
                                </select>
                                <input type="number" name="elecRate" value={inputs.elecRate} onChange={handleInput} className="w-full p-3 border rounded-xl" placeholder="Rate per kWh" />
                            </section>
                        </div>

                        {/* 3. Conditions */}
                        <section className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold mb-4">3. Conditions & Technology</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Ambient Temp ({inputs.ambientTemp}°C)</label>
                                    <input type="range" name="ambientTemp" min="5" max="45" value={inputs.ambientTemp} onChange={handleInput} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Target Temp ({inputs.targetTemp}°C)</label>
                                    <input type="range" name="targetTemp" min="35" max="90" value={inputs.targetTemp} onChange={handleInput} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <select name="heatPumpType" value={inputs.heatPumpType} onChange={handleInput} className="p-3 border rounded-xl">
                                    <option value="all">Best Price (All)</option>
                                    <option value="r290">R290 Models</option>
                                    <option value="co2">CO2 Models</option>
                                    <option value="r32">R32 Models</option>
                                </select>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold">
                                <input type="checkbox" name="includeCooling" checked={inputs.includeCooling} onChange={handleInput} className="w-5 h-5" />
                                <span>Require Reversible Cooling?</span>
                            </div>
                        </section>
                    </div>

                    {/* RESULTS PANEL */}
                    <div className="bg-gray-900 text-white p-8">
                        {res?.error ? (
                            <div className="p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-200">{res.error}</div>
                        ) : res ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Recommended System</p>
                                    <h4 className="text-2xl font-black">{res.system.n}</h4>
                                    <p className="text-xs text-gray-400">{res.system.type} Technology | {res.system.adjLhr.toFixed(0)} L/hr Output</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <p className="text-gray-400 text-xs">Annual Savings</p>
                                        <p className="text-3xl font-bold text-green-400">{res.financials.symbol}{res.financials.totalSavings.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                    </div>
                                    <div className="bg-orange-600 p-6 rounded-2xl text-center shadow-xl">
                                        <p className="text-white/70 text-xs font-bold uppercase mb-1">Payback Period</p>
                                        <p className="text-5xl font-black">{res.financials.paybackYears} <span className="text-xl">Yrs</span></p>
                                    </div>
                                </div>

                                {res.financials.coolSavings > 0 && (
                                    <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-2xl">
                                        <p className="text-blue-400 text-xs font-bold uppercase">Free Cooling Bonus</p>
                                        <p className="text-sm mt-1">Saves an additional <strong>{res.financials.symbol}{res.financials.coolSavings.toLocaleString()}</strong> via waste-heat recovery.</p>
                                    </div>
                                )}

                                <div className="pt-6 space-y-3 text-sm text-gray-400">
                                    <div className="flex justify-between"><span>Annual CO₂ Reduction</span><span className="text-white font-bold">{res.env.co2Saved.toLocaleString()} kg</span></div>
                                    <div className="flex justify-between"><span>Total Investment</span><span className="text-white font-bold">{res.financials.symbol}{res.financials.capex.total.toLocaleString()}</span></div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KarnotCalculator;
