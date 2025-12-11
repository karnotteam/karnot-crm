import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Save, AlertTriangle, CheckCircle, Settings, Thermometer, Zap, Droplets, UserCheck, Clipboard, Activity } from 'lucide-react';

export default function CommissioningPage({ user, onBack }) {
    const [loading, setLoading] = useState(false);
    
    // Expanded State to match Manuals & New Requirements
    const [formData, setFormData] = useState({
        // --- 1. Project Info ---
        customerName: '',
        siteAddress: '',
        heatPumpSerial: '',
        tankSerial: '',
        
        // --- 2. Customer Handover & Set Points (Manual Part 1.2) ---
        unitMode: 'Heating + Hot Water', // P06
        fanMode: 'Eco',                  // P07
        timeZonesSetup: false,           // Time Zone Schedule
        
        heatingSetPoint: '35',           // Target Flow Temp
        coolingSetPoint: '20',           // Target Flow Temp
        dhwSetPoint: '50',               // Hot Water Set Point
        
        // --- 3. R290 Safety (Critical) ---
        ventilation: false,      
        ignitionClearance: false, 
        drainsSealed: false,     
        
        // --- 4. Mechanical & Hydraulic ---
        filterMeshCheck: false,  
        magnesiumRod: false,     
        safetyValveDrain: false, 
        expansionTankPrecharge: '', 
        
        // --- 5. Electrical Check ---
        supplyVoltage: '',       
        rcdInstalled: false,     
        cableSizeChecked: false, 

        // --- 6. Engineer Settings (Deep Dive) ---
        pumpMode: 'Normal',        // Normal, Demand, Interval
        tempDiffRestart: '5',      // Hysteresis (Start)
        tempDiffStop: '2',         // Hysteresis (Stop/Overshoot)
        
        electricHeaterLogic: 'Hot Water', // Heating, Hot Water, All, Disabled
        heaterLocation: 'Tank',           // Tank or Pipe
        
        weatherCompEnabled: false, // Amb Temp Switch
        
        // --- 7. Performance Data ---
        waterFlow: '',             // L/min
        inletTemp: '',             // °C
        outletTemp: '',            // °C
        heatOutputKw: '',          // kW (Thermal)
        electricalInputKwe: '',    // kWe (Power)
        cop: '',                   // CoP (Calculated)
        currentDraw: '',           // Amps
        
        // --- 8. Notes ---
        notes: ''
    });

    const [photo, setPhoto] = useState(null);

    // Auto-calculate COP
    useEffect(() => {
        if (formData.heatOutputKw && formData.electricalInputKwe) {
            const heat = parseFloat(formData.heatOutputKw);
            const elec = parseFloat(formData.electricalInputKwe);
            if (elec > 0) {
                setFormData(prev => ({ ...prev, cop: (heat / elec).toFixed(2) }));
            }
        }
    }, [formData.heatOutputKw, formData.electricalInputKwe]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.ventilation || !formData.drainsSealed || !formData.rcdInstalled) {
            alert("CRITICAL SAFETY: Ventilation, Floor Drains, and RCD checks are MANDATORY.");
            return;
        }

        setLoading(true);

        try {
            let photoUrl = "No Photo";

            if (photo) {
                const storageRef = ref(storage, `commissioning/${user.uid}/${Date.now()}_leakcheck.jpg`);
                const snapshot = await uploadBytes(storageRef, photo);
                photoUrl = await getDownloadURL(snapshot.ref);
            }

            // Calc Delta T automatically
            const deltaT = (formData.outletTemp && formData.inletTemp) 
                ? Math.abs(parseFloat(formData.outletTemp) - parseFloat(formData.inletTemp)).toFixed(1) 
                : 'N/A';

            await addDoc(collection(db, "users", user.uid, "commissioning_reports"), {
                ...formData,
                calculatedDeltaT: deltaT,
                engineerId: user.uid,
                engineerEmail: user.email,
                leakCheckPhoto: photoUrl,
                status: 'Commissioned',
                commissionDate: serverTimestamp()
            });

            alert("Commissioning Report Saved Successfully!");
            onBack(); 

        } catch (error) {
            console.error("Error:", error);
            alert("Save Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for Section Headers
    const SectionHeader = ({ title, icon: Icon, step }) => (
        <div className="flex items-center gap-2 border-b-2 border-orange-100 pb-2 mb-4 mt-8">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                <Icon size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">{step}. {title}</h3>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-8 border-t-4 border-orange-600">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Commissioning Protocol</h1>
                    <p className="text-sm text-gray-500">iHEAT R290 & iSTOR Series | 2025 Standard</p>
                </div>
                <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-700">Close X</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. PROJECT INFO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="Customer / Site Name" name="customerName" onChange={handleChange} className="p-3 border rounded bg-gray-50" />
                    <input placeholder="Site Address" name="siteAddress" onChange={handleChange} className="p-3 border rounded bg-gray-50" />
                    <input placeholder="Heat Pump Serial (Outdoor)" name="heatPumpSerial" onChange={handleChange} className="p-3 border rounded" />
                    <input placeholder="Tank Serial (Indoor)" name="tankSerial" onChange={handleChange} className="p-3 border rounded" />
                </div>

                {/* 2. CUSTOMER HANDOVER */}
                <SectionHeader title="Handover Configuration" icon={UserCheck} step="2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Unit Mode</label>
                        <select name="unitMode" onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Heating + Hot Water">Heating + Hot Water</option>
                            <option value="Heating">Heating Only</option>
                            <option value="Cooling">Cooling Only</option>
                            <option value="Hot Water">Hot Water Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">DHW Setpoint (°C)</label>
                        <input type="number" name="dhwSetPoint" placeholder="e.g. 50" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Time Zones Set?</label>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="flex items-center gap-1"><input type="radio" name="timeZonesSetup" value={true} onChange={() => setFormData({...formData, timeZonesSetup: true})} /> Yes</label>
                            <label className="flex items-center gap-1"><input type="radio" name="timeZonesSetup" value={false} onChange={() => setFormData({...formData, timeZonesSetup: false})} /> No</label>
                        </div>
                    </div>
                </div>

                {/* 3. R290 SAFETY */}
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mt-6">
                    <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3"><AlertTriangle size={18}/> 3. R290 Safety Compliance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center space-x-2 text-sm font-semibold">
                            <input type="checkbox" name="ventilation" checked={formData.ventilation} onChange={handleChange} className="w-5 h-5 text-red-600 rounded" />
                            <span>Ventilation Verified</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm font-semibold">
                            <input type="checkbox" name="ignitionClearance" checked={formData.ignitionClearance} onChange={handleChange} className="w-5 h-5 text-red-600 rounded" />
                            <span>No Ignition Sources (3m)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm font-semibold">
                            <input type="checkbox" name="drainsSealed" checked={formData.drainsSealed} onChange={handleChange} className="w-5 h-5 text-red-600 rounded" />
                            <span>Floor Drains Sealed</span>
                        </label>
                    </div>
                </div>

                {/* 4. ENGINEER SETTINGS (The "Brain") */}
                <SectionHeader title="Controller Logic" icon={Settings} step="4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg">
                    {/* Pump */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Pump Logic (P03)</label>
                        <select name="pumpMode" onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Normal">Normal (Always On)</option>
                            <option value="Demand">Demand (Smart)</option>
                            <option value="Interval">Interval (Timer)</option>
                        </select>
                    </div>
                    {/* Hysteresis */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Restart Delta (°C)</label>
                        <input type="number" name="tempDiffRestart" placeholder="Default 5" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Overshoot Delta (°C)</label>
                        <input type="number" name="tempDiffStop" placeholder="Default 2" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    
                    {/* Electric Heater */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Electric Heater Logic</label>
                        <select name="electricHeaterLogic" onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Hot Water">Hot Water Only</option>
                            <option value="Heating">Heating Only</option>
                            <option value="All">All (Pipe Heater)</option>
                            <option value="Disabled">Disabled</option>
                        </select>
                    </div>
                    
                    {/* Weather Comp */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Weather Comp.</label>
                        <div className="flex items-center gap-2 mt-2">
                            <input type="checkbox" name="weatherCompEnabled" onChange={handleChange} /> 
                            <span className="text-sm">Amb. Temp Switch</span>
                        </div>
                    </div>
                </div>

                {/* 5. MECHANICAL CHECKS */}
                <SectionHeader title="Mechanical Checks" icon={Droplets} step="5" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Filter Mesh</span>
                        <div className="flex items-center gap-2"><input type="checkbox" name="filterMeshCheck" onChange={handleChange} /> <span className="text-xs">{'>'}60 Mesh Clean</span></div>
                    </label>
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Magnesium Rod</span>
                        <div className="flex items-center gap-2"><input type="checkbox" name="magnesiumRod" onChange={handleChange} /> <span className="text-xs">Installed</span></div>
                    </label>
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Safety Valve</span>
                        <div className="flex items-center gap-2"><input type="checkbox" name="safetyValveDrain" onChange={handleChange} /> <span className="text-xs">Piped to Drain</span></div>
                    </label>
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">RCD Breaker</span>
                        <div className="flex items-center gap-2"><input type="checkbox" name="rcdInstalled" onChange={handleChange} /> <span className="text-xs">Tested OK</span></div>
                    </label>
                </div>

                {/* 6. PERFORMANCE DATA */}
                <SectionHeader title="Performance Data" icon={Activity} step="6" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-4 grid grid-cols-3 gap-4 bg-orange-50 p-3 rounded mb-2">
                        <div>
                            <label className="block text-xs font-bold text-orange-800">Heat Output (kW)</label>
                            <input type="number" step="0.1" name="heatOutputKw" onChange={handleChange} className="w-full p-2 border border-orange-300 rounded" placeholder="Output" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-orange-800">Elec. Input (kWe)</label>
                            <input type="number" step="0.1" name="electricalInputKwe" onChange={handleChange} className="w-full p-2 border border-orange-300 rounded" placeholder="Input" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-orange-800">COP (Efficiency)</label>
                            <input type="number" step="0.1" name="cop" value={formData.cop} onChange={handleChange} className="w-full p-2 border border-orange-300 rounded bg-white font-bold" placeholder="Auto-Calc" />
                        </div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500">Inlet Temp (°C)</label><input type="number" name="inletTemp" onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-500">Outlet Temp (°C)</label><input type="number" name="outletTemp" onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-500">Flow Rate (L/min)</label><input type="number" name="waterFlow" onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-500">Current (Amps)</label><input type="number" name="currentDraw" onChange={handleChange} className="w-full p-2 border rounded" /></div>
                </div>

                {/* 7. NOTES */}
                <SectionHeader title="Engineer Notes & Handover" icon={Clipboard} step="7" />
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Observations / Actions Taken</label>
                    <textarea name="notes" rows="4" onChange={handleChange} placeholder="e.g., Client instructed on App usage. Frost protection explained. Pressure test passed at 3 bar." className="w-full p-3 border rounded shadow-inner"></textarea>
                </div>

                {/* 8. PHOTO & SUBMIT */}
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center bg-gray-50 hover:bg-gray-100 transition mt-6">
                    <label className="cursor-pointer block">
                        <Camera className="mx-auto text-gray-400 mb-2" size={32} />
                        <span className="text-gray-600 font-medium">Take Photo of Leak Test / Nameplate</span>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                    {photo && <p className="text-sm text-green-600 mt-2 font-semibold">Selected: {photo.name}</p>}
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="submit" disabled={loading} className="w-full py-4 px-6 rounded-lg shadow-lg text-white font-bold text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transform hover:scale-[1.02] transition-all">
                        {loading ? 'Uploading Data...' : 'Submit Commissioning Report'}
                    </button>
                </div>

            </form>
        </div>
    );
}
