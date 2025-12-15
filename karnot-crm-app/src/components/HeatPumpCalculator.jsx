// src/components/HeatPumpCalculator.jsx (Modified excerpt)

// ... (Keep imports and state setup the same) ...

const HeatPumpCalculator = ({ leadId }) => { 
  
  // --- MAIN STATE ---
  const [inputs, setInputs] = useState({
    // ... (Keep existing fields) ...
    // NOTE: 'heatPumpType' will now hold the refrigerant value
    heatPumpType: 'all', 
    includeCooling: false
  });

// ... (Keep all existing handler functions and the return statement start) ...

    {/* COLUMN 3: CONDITIONS & OPTIONS */}
    <div>
        <h3>3. Conditions & Options</h3>
        {/* ... (Keep Ambient, Inlet, Target Temp fields) ... */}
        
        <label htmlFor="systemType">System Type</label>
        <select id="systemType" value={inputs.systemType} onChange={handleChange('systemType')}>
            <option value="grid-only">Grid Only</option>
            <option value="grid-solar">Grid + Solar (Offset)</option>
        </select>
        
        {/* ... (Keep Sun Hours field) ... */}
        
        {/* --- MODIFIED: Heat Pump Type Selector to include Refrigerant --- */}
        <label htmlFor="heatPumpType">Heat Pump Type / Refrigerant</label>
        <select id="heatPumpType" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
            <option value="all">Best Price (All Models)</option>
            <option value="R290">R290 Models Only</option>
            <option value="R744">CO2 (R744) Models Only</option>
            <option value="R32">R32 Models Only</option>
        </select>
        {/* --- END MODIFIED BLOCK --- */}
        
        <label htmlFor="includeCooling">Require Cooling?</label>
        <select id="includeCooling" value={inputs.includeCooling ? 'yes' : 'no'} onChange={(e) => setInputs(p => ({...p, includeCooling: e.target.value === 'yes'}))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
        </select>
    </div>

// ... (Keep the rest of the component the same) ...
