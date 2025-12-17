import React, { useState, useEffect } from 'react';
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic';

const HeatPumpCalculator = ({ dbProducts }) => {
    const [inputs, setInputs] = useState({
        userType: 'home',
        occupants: 4,
        targetTemp: 55,
        inletTemp: 15,
        ambientTemp: 25,
        hoursPerDay: 8,
        currency: 'USD',
        heatingType: 'propane',
        fuelPrice: 25,
        tankSize: 9,
        elecRate: 0.21,
        heatPumpType: 'all',
        systemType: 'grid-only',
        includeCooling: false,
        coolingLoadKW: 5,
        coolingHours: 6,
        sunHours: 5.5
    });

    const [results, setResults] = useState(null);

    useEffect(() => {
        if (dbProducts) {
            const res = calculateHeatPump(inputs, dbProducts);
            setResults(res);
        }
    }, [inputs, dbProducts]);

    const handleInput = (e) => {
        const { name, value, type, checked } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4">Karnot Heat Pump ROI Calculator</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Inputs */}
                <section className="space-y-4">
                    <div>
                        <label className="block font-medium">Heat Pump Technology</label>
                        <select name="heatPumpType" value={inputs.heatPumpType} onChange={handleInput} className="w-full p-2 border rounded">
                            <option value="all">Best Price (Any)</option>
                            <option value="R290">Natural Propane (R290)</option>
                            <option value="CO2">CO2 (High Temp)</option>
                            <option value="R32">R32 (Standard)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="includeCooling" checked={inputs.includeCooling} onChange={handleInput} />
                        <label className="font-medium">Include Cooling Savings?</label>
                    </div>

                    {inputs.includeCooling && (
                        <div className="pl-6 border-l-2 border-blue-200">
                            <label className="block text-sm">Existing AC Load (kW)</label>
                            <input type="number" name="coolingLoadKW" value={inputs.coolingLoadKW} onChange={handleInput} className="w-full p-2 border rounded" />
                        </div>
                    )}

                    {/* Basic Requirements */}
                    <div>
                        <label className="block text-sm">Target Hot Water Temp (°C)</label>
                        <input type="range" name="targetTemp" min="30" max="85" value={inputs.targetTemp} onChange={handleInput} className="w-full" />
                        <span className="text-sm font-bold">{inputs.targetTemp}°C</span>
                    </div>
                </section>

                {/* Right Column: Results */}
                <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    {results?.error ? (
                        <div className="text-red-500 font-bold">{results.error}</div>
                    ) : results ? (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 uppercase">Recommended Model</p>
                                <h3 className="text-xl font-bold text-blue-600">{results.system.name}</h3>
                                <p className="text-xs text-gray-400">Refrigerant: {results.system.refrigerant}</p>
                            </div>
                            
                            <hr />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Total Capex</p>
                                    <p className="text-lg font-bold">{results.financials.symbol}{results.financials.capex.total.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Annual Savings</p>
                                    <p className="text-lg font-bold text-green-600">{results.financials.symbol}{results.financials.totalSavings.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
                                <p className="text-sm uppercase opacity-80">Estimated Payback</p>
                                <p className="text-3xl font-bold">{results.financials.paybackYears} Years</p>
                            </div>

                            {results.financials.coolingSavings > 0 && (
                                <p className="text-xs text-blue-500 font-medium">
                                    Includes {results.financials.symbol}{results.financials.coolingSavings.toFixed(0)} in annual cooling efficiency savings.
                                </p>
                            )}
                        </div>
                    ) : <p>Enter details to see calculation...</p>}
                </section>
            </div>
        </div>
    );
};

export default HeatPumpCalculator;
