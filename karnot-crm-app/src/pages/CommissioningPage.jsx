import React, { useState } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Save, AlertTriangle, CheckCircle, Settings, Thermometer, Zap, Droplets } from 'lucide-react';

export default function CommissioningPage({ user, onBack }) {
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState(1);
    
    // Expanded State to match Manuals
    const [formData, setFormData] = useState({
        // --- 1. Project Info ---
        customerName: '',
        siteAddress: '',
        heatPumpSerial: '',
        tankSerial: '',
        
        // --- 2. R290 Safety (Critical - iHEAT Manual Part 1) ---
        ventilation: false,      // [cite: 245]
        ignitionClearance: false, // [cite: 284]
        drainsSealed: false,     // [cite: 1309] Propane > Air
        
        // --- 3. Mechanical & Hydraulic (iSTOR Manual) ---
        filterMeshCheck: false,  // >60 Mesh 
        magnesiumRod: false,     // Installed Front Fuselage 
        safetyValveDrain: false, // Piped to floor drain [cite: 1759]
        expansionTankPrecharge: '', // Bar
        
        // --- 4. Electrical Check ---
        supplyVoltage: '',       // V
        rcdInstalled: false,     // Mandatory for Heater [cite: 1766]
        cableSizeChecked: false, // 4mm or 6mm check [cite: 1477]

        // --- 5. Engineer Settings (The "Brain" - iHEAT Part 3) ---
        targetMode: 'Heating+DHW', // [cite: 97]
        pumpMode: 'Normal',        // Normal/Demand/Interval 
        
        // SG Ready (Smart Grid) [cite: 826]
        sgReadyEnabled: false,
        sgModeTested: 'None',      // Mode 1,2,3,4 tested?

        // Anti-Legionella [cite: 902]
        legionellaEnabled: false,
        legionellaSetTemp: '65',   // Default 60-70

        // --- 6. iSTOR Specifics (G Parameters)  ---
        zone2Enabled: false,       // G25 [cite: 1717]
        solarEnabled: false,       // G26 [cite: 1722]
        solarMaxTemp: '',          // G28 [cite: 1726]

        // --- 7. Performance Readings ---
        waterFlow: '',             // L/m
        inletTemp: '',             // C
        outletTemp: '',            // C
        currentDraw: '',           // Amps
        
        notes: ''
    });

    const [photo, setPhoto] = useState(null);

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
        
        // Safety Lock
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

            alert("Full Commissioning Report Saved!");
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
        <div className="flex items-center gap-2 border-b-2 border-orange-100 pb-2 mb-4 mt-6">
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

                {/* 2. R290 SAFETY */}
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3">
                        <AlertTriangle size={18}/> 
                        R290 Safety Compliance (Mandatory)
                    </h3>
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

                {/* 3. MECHANICAL CHECKS */}
                <SectionHeader title="Hydraulic & Mechanical" icon={Droplets} step="3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Filter Mesh</span>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="filterMeshCheck" onChange={handleChange} /> 
                            <span className="text-xs text-gray-500">{'>'}60 Mesh Clean</span>
                        </div>
                    </label>
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Magnesium Rod</span>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="magnesiumRod" onChange={handleChange} /> 
                            <span className="text-xs text-gray-500">Verified Installed</span>
                        </div>
                    </label>
                    <label className="p-3 border rounded cursor-pointer hover:bg-gray-50">
                        <span className="block text-sm font-bold text-gray-700 mb-1">Safety Valve</span>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="safetyValveDrain" onChange={handleChange} /> 
                            <span className="text-xs text-gray-500">Piped to Drain</span>
                        </div>
                    </label>
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Exp. Tank Pre-charge</label>
                        <input type="number" name="expansionTankPrecharge" placeholder="Bar" onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                    </div>
                </div>

                {/* 4. SOFTWARE SETTINGS */}
                <SectionHeader title="Controller Configuration" icon={Settings} step="4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg">
                    
                    {/* Pump Logic */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Pump Logic (P03)</label>
                        <select name="pumpMode" onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="Normal">Normal (Always On)</option>
                            <option value="Demand">Demand (With Comp)</option>
                            <option value="Interval">Interval (Timer)</option>
                        </select>
                    </div>

                    {/* SG Ready */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Smart Grid (SG Ready)</label>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" name="sgReadyEnabled" onChange={handleChange} />
                            <span className="text-sm">Enabled</span>
                        </div>
                        {formData.sgReadyEnabled && (
                            <select name="sgModeTested" onChange={handleChange} className="w-full p-2 border rounded text-sm">
                                <option value="None">No Signal Test</option>
                                <option value="Mode 3">Mode 3 (SG+) Tested</option>
                                <option value="Mode 4">Mode 4 (SG++) Tested</option>
                            </select>
                        )}
                    </div>

                    {/* Anti Legionella */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Anti-Legionella</label>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" name="legionellaEnabled" onChange={handleChange} />
                            <span className="text-sm">Enabled</span>
                        </div>
                        {formData.legionellaEnabled && (
                            <input type="number" name="legionellaSetTemp" placeholder="Temp C" onChange={handleChange} className="w-full p-2 border rounded text-sm" />
                        )}
                    </div>

                    {/* iSTOR Zone 2 */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">2nd Temp Zone (G25)</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="zone2Enabled" onChange={handleChange} />
                            <span className="text-sm">Enabled (Mixing Valve)</span>
                        </div>
                    </div>

                    {/* iSTOR Solar */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Solar Thermal (G26)</label>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" name="solarEnabled" onChange={handleChange} />
                            <span className="text-sm">Enabled</span>
                        </div>
                        {formData.solarEnabled && (
                            <input type="number" name="solarMaxTemp" placeholder="Max Temp (G28)" onChange={handleChange} className="w-full p-2 border rounded text-sm" />
                        )}
                    </div>
                </div>

                {/* 5. PERFORMANCE DATA */}
                <SectionHeader title="Performance & Electrical" icon={Zap} step="5" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Inlet Temp (°C)</label>
                        <input type="number" name="inletTemp" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Outlet Temp (°C)</label>
                        <input type="number" name="outletTemp" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Flow Rate (L/min)</label>
                        <input type="number" name="waterFlow" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Current (Amps)</label>
                        <input type="number" name="currentDraw" onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                </div>

                {/* 6. PHOTO & SUBMIT */}
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center bg-gray-50 hover:bg-gray-100 transition">
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
