// src/pages/HeatPumpCalculator.js
// ... (imports remain same)

// Inside the return of HeatPumpCalculator, update the Results Area:

{result && !result.error && (
    <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
        {/* Header Summary */}
        <div className="flex justify-between items-end mb-6 border-b pb-4">
            <div>
                <h3 className="text-xl font-bold text-orange-600">{result.system.n}</h3>
                <p className="text-sm text-gray-500">Recommended System</p>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                    {result.financials.symbol}{fmt(result.financials.totalSavings)}
                </div>
                <p className="text-xs uppercase font-bold text-gray-400">Total Annual Savings</p>
            </div>
        </div>

        {/* 4 Metric Cards (Like old calculator) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Payback</div>
                <div className="text-xl font-bold text-orange-600">{result.financials.paybackYears} Yrs</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">CO₂ Reduction</div>
                <div className="text-xl font-bold text-green-600">{fmt(result.metrics.emissionsSaved)} kg</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Flow Rate</div>
                <div className="text-xl font-bold text-blue-600">{fmt(result.metrics.adjFlowLhr)} L/hr</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Solar Panels</div>
                <div className="text-xl font-bold text-amber-500">{result.metrics.panels} Units</div>
            </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr><th className="p-3 text-left">Description</th><th className="p-3 text-right">Estimated Cost</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr><td className="p-3">Heat Pump Unit Cost</td><td className="p-3 text-right">{result.financials.symbol}{fmt(result.financials.capex.heatPump)}</td></tr>
                    {result.financials.capex.solar > 0 && (
                        <>
                            <tr><td className="p-3">Solar PV Array ({result.metrics.panels} panels)</td><td className="p-3 text-right">{result.financials.symbol}{fmt(result.financials.capex.solar)}</td></tr>
                            <tr><td className="p-3">Inverter & Smart Controls</td><td className="p-3 text-right">{result.financials.symbol}{fmt(result.financials.capex.inverter)}</td></tr>
                        </>
                    )}
                    <tr className="bg-slate-50 font-bold">
                        <td className="p-3 text-orange-600">Total Estimated System Cost</td>
                        <td className="p-3 text-right text-orange-600">{result.financials.symbol}{fmt(result.financials.capex.total)}</td>
                    </tr>
                    <tr><td className="p-3">Old Annual Heating Cost</td><td className="p-3 text-right text-slate-500">{result.financials.symbol}{fmt(result.financials.annualCostOld)}</td></tr>
                    <tr><td className="p-3">New Annual Electricity Cost</td><td className="p-3 text-right text-slate-500">{result.financials.symbol}{fmt(result.financials.annualKarnotCost)}</td></tr>
                </tbody>
            </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
            <Button onClick={generateReport} variant="secondary"><Printer size={18} className="mr-2"/> Report</Button>
            <Button onClick={handleSave} variant="success" disabled={isSaving}><Save size={18} className="mr-2"/> {isSaving ? 'Saving...' : 'Save'}</Button>
        </div>
    </div>
)}
