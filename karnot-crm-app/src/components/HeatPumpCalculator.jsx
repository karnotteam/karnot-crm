import React, { useState, useEffect } from 'react';
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic';

const KarnotCalculator = ({ dbProducts }) => {
    const [inputs, setInputs] = useState({
        userType: 'home', occupants: 4, mealsPerDay: 50, roomsOccupied: 10,
        dailyLitersInput: 500, hoursPerDay: 12, currency: 'PHP',
        heatingType: 'electric', elecRate: 12.25, fuelPrice: 950, tankSize: 11,
        ambientTemp: 30, inletTemp: 15, targetTemp: 55, heatPumpType: 'all'
    });

    const [res, setRes] = useState(null);

    useEffect(() => {
        if (dbProducts) setRes(calculateHeatPump(inputs, dbProducts)); //
    }, [inputs, dbProducts]);

    const handleInput = (e) => {
        const { name, value, type } = e.target;
        setInputs(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-orange-600 mb-6">Heat Pump ROI Calculator</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="block font-bold text-gray-700">User Type</label>
                    <select name="userType" value={inputs.userType} onChange={handleInput} className="w-full p-2 border rounded">
                        <option value="home">Residential</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="resort">Hotel / Resort</option>
                    </select>

                    <label className="block font-bold text-gray-700">Refrigerant Type</label>
                    <select name="heatPumpType" value={inputs.heatPumpType} onChange={handleInput} className="w-full p-2 border rounded">
                        <option value="all">Best Price (Any)</option>
                        <option value="r290">R290</option>
                        <option value="co2">CO2</option>
                        <option value="r32">R32</option>
                    </select>
                </div>

                <div className="bg-gray-900 text-white p-6 rounded-xl">
                    {res?.error ? <p className="text-red-400">{res.error}</p> : res && (
                        <div className="text-center">
                            <p className="text-sm text-gray-400">Recommended Model</p>
                            <h3 className="text-xl font-bold mb-4">{res.system.n}</h3>
                            <div className="bg-orange-600 p-4 rounded-lg">
                                <p className="text-xs uppercase">Payback Period</p>
                                <p className="text-4xl font-black">{res.financials.paybackYears} Yrs</p>
                            </div>
                            <p className="mt-4 text-green-400 font-bold">Savings: {res.financials.symbol}{res.financials.totalSavings.toLocaleString()}/yr</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KarnotCalculator;
