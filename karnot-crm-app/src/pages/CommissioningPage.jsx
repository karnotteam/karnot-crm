import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { KARNOT_LOGO_BASE_64 } from '../data/constants'; 
import { Camera, Save, AlertTriangle, CheckCircle, Settings, Thermometer, Zap, Droplets, UserCheck, Clipboard, Activity, Briefcase, Printer, FileCheck, Building } from 'lucide-react';

export default function CommissioningPage({ user, onBack, companies = [], contacts = [] }) {
    const [loading, setLoading] = useState(false);
    
    // Expanded State
    const [formData, setFormData] = useState({
        // --- 1. Project Info ---
        customerName: '',
        siteAddress: '',
        contactPerson: '',
        heatPumpSerial: '',
        tankSerial: '',
        
        // --- 2. Customer Handover ---
        unitMode: 'Heating + Hot Water', 
        fanMode: 'Eco',                  
        timeZonesSetup: false,           
        heatingSetPoint: '35',           
        coolingSetPoint: '20',           
        dhwSetPoint: '50',               
        
        // --- 3. Commercial Application Check ---
        isCommercialSite: false,
        ecoModeDisabled: false,    
        capacityCheck: 'Sufficient', 
        
        // --- 4. R290 Safety ---
        ventilation: false,      
        ignitionClearance: false, 
        drainsSealed: false,     
        
        // --- 5. Mechanical ---
        filterMeshCheck: false,  
        magnesiumRod: false,     
        safetyValveDrain: false, 
        expansionTankPrecharge: '', 
        
        // --- 6. Electrical ---
        supplyVoltage: '',       
        rcdInstalled: false,     
        cableSizeChecked: false, 

        // --- 7. Engineer Settings ---
        pumpMode: 'Normal',        
        sgReadyEnabled: false,
        electricHeaterLogic: 'Hot Water', 
        legionellaEnabled: false,
        legionellaSetTemp: '65',   
        zone2Enabled: false,       
        solarEnabled: false,       
        
        // Hysteresis Settings
        hwTempDiff: '3',           
        heatTempDiff: '5',         
        heatStopTempDiff: '2',     

        // --- 8. Performance ---
        waterFlow: '',             
        inletTemp: '',             
        outletTemp: '',            
        heatOutputKw: '',          
        electricalInputKwe: '',    
        cop: '',                   
        currentDraw: '',           
        
        // --- 9. Notes ---
        notes: '',

        // --- 10. Handover Certificate Details ---
        installerName: '',
        technicianName: '',
        contactNumber: '',
        handoverTraining: false, 
        manualHandover: false,   
        maintenanceExplained: false 
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

    // Auto-Fill Notes for Commercial Sites
    useEffect(() => {
        if (formData.isCommercialSite && !formData.notes) {
            const warningText = `COMMERCIAL SITE NOTICE:
- Eco Mode Disabled for fast recovery.
- Client advised on capacity (18kW) vs Peak Load.
- RECOMMENDATION: Install 2nd Unit (Cascade).`;
            setFormData(prev => ({ ...prev, notes: warningText }));
        }
    }, [formData.isCommercialSite]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // CRM Selection Handler
    const handleCompanySelect = (e) => {
        const selectedId = e.target.value;
        const company = companies.find(c => c.id === selectedId);
        if (company) {
            // Find primary contact for this company
            const contact = contacts.find(c => c.companyId === company.id) || {};
            
            setFormData(prev => ({
                ...prev,
                customerName: company.name,
                siteAddress: company.address || prev.siteAddress, 
                contactPerson: contact.name || ''
            }));
        }
    };

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handlePrint = () => {
        window.print();
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

            alert("Report Saved!");
            onBack(); 

        } catch (error) {
            console.error("Error:", error);
            alert("Save Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for Headers
    const SectionHeader = ({ title, icon: Icon, step }) => (
        <div className="flex items-center gap-2 border-b-2 border-orange-100 pb-1 mb-3 mt-6 print:mt-2 print:mb-1 print:border-gray-300 print:pb-0">
            <div className="bg-orange-100 p-2 rounded-full text-orange-600 print:hidden">
                <Icon size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 print:text-sm print:uppercase print:text-black">{step}. {title}</h3>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl p-8 border-t-4 border-orange-600 print:shadow-none print:border-0 print:p-0 print:max-w-none print:w-full">
            
            {/* A4 PRINT & DARK MODE FIX STYLES */}
            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 5mm; }
                        body { background: white; -webkit-print-color-adjust: exact; }
                        .no-print { display: none !important; }
                        
                        /* Force Compact Layout */
                        .print-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
                        .print-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
                        .print-text-xs { font-size: 8pt !important; line-height: 1.1; }
                        .print-text-sm { font-size: 9pt !important; font-weight: bold; }
                        .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 5px; margin-bottom: 10px; }
                        .print-logo { height: 30px; }
                        
                        /* Hide bulky UI */
                        input, select, textarea { 
                            border: 1px solid #ccc; 
                            background: white !important; 
                            font-size: 8pt !important; 
                            padding: 2px !important; 
                            height: auto !important;
                            min-height: 0 !important;
                        }
                        textarea { resize: none; }
                        
                        /* Compact Sections */
                        h1 { font-size: 14pt !important; margin: 0 !important; }
                        h3 { margin-top: 5px !important; margin-bottom: 2px !important; }
                        .print-compact-row { display: flex; align-items: center; gap: 5px; }
                        .print-hide-bg { background: transparent !important; border: 1px solid #ddd !important; padding: 5px !important; }
                    }

                    /* FORCE LIGHT MODE DROPDOWN */
                    .force-light-select {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        -webkit-text-fill-color: #000000 !important;
                    }
                    .force-light-select option {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                `}
            </style>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Commissioning Protocol</h1>
                    <p className="text-sm text-gray-500">iHEAT R290 & iSTOR Series | 2025 Standard</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <Printer size={16} /> Print Cert
                    </button>
                    <button type="button" onClick={onBack} className="text-gray-500 px-2 font-bold">Close X</button>
                </div>
            </div>

            {/* PRINT ONLY HEADER */}
            <div className="hidden print-header">
                <div>
                    <img src={KARNOT_LOGO_BASE_64} alt="Karnot" className="print-logo" />
                    <h1 className="text-xl font-bold mt-1">COMMISSIONING CERTIFICATE</h1>
                </div>
                <div className="text-right text-xs">
                    <p>Doc Ref: K-COM-2025</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 print:space-y-2">
                
                {/* 1. PROJECT INFO (CRM INTEGRATED) */}
                <div className="bg-gray-50 p-4 rounded-lg print:p-0 print:bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-3 print:gap-2">
                        {/* CRM Selector (Hidden on Print) */}
                        <div className="no-print md:col-span-2">
                            <label className="block text-sm font-bold text-orange-600 mb-1 flex items-center gap-2">
                                <Building size={16}/> Select Customer from CRM
                            </label>
                            <select 
                                onChange={handleCompanySelect} 
                                className="w-full p-2 border border-orange-300 rounded force-light-select"
                            >
                                <option value="">-- Select Company --</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500">Customer Name</label>
                            <input required name="customerName" value={formData.customerName} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div className="print:col-span-2">
                            <label className="text-xs font-bold text-gray-500">Site Address</label>
                            <input name="siteAddress" value={formData.siteAddress} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Heat Pump Serial</label>
                            <input name="heatPumpSerial" onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Tank Serial</label>
                            <input name="tankSerial" onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500">Contact Person</label>
                            <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </div>

                {/* 2. COMMERCIAL CHECK (Compact) */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md print:p-1 print:border print:bg-white print:text-xs">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center space-x-2 font-bold text-gray-700">
                            <input type="checkbox" name="isCommercialSite" checked={formData.isCommercialSite} onChange={handleChange} />
                            <span>Commercial Site?</span>
                        </label>
                        {formData.isCommercialSite && (
                            <span className="text-red-600 font-bold print:text-black">
                                ⚠ 8 Taps = 2 Min Drain. Eco Mode MUST be OFF.
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-2">
                    
                    {/* 3. SET POINTS */}
                    <div className="print:border print:p-1">
                        <h3 className="font-bold text-gray-800 mb-2 print:text-xs print:mb-1">3. Handover Setpoints</h3>
                        <div className="grid grid-cols-2 gap-2 print:grid-cols-4">
                            <div><label className="text-xs font-bold">Mode</label><select name="unitMode" onChange={handleChange} className="w-full p-1 border rounded text-sm"><option>Heating+DHW</option><option>Cooling</option></select></div>
                            <div><label className="text-xs font-bold">DHW °C</label><input type="number" name="dhwSetPoint" className="w-full p-1 border rounded" /></div>
                            <div><label className="text-xs font-bold">Heat °C</label><input type="number" name="heatingSetPoint" className="w-full p-1 border rounded" /></div>
                            <div className="flex items-center"><label className="text-xs"><input type="checkbox" name="timeZonesSetup" /> Timer Set?</label></div>
                        </div>
                    </div>

                    {/* 4. SAFETY */}
                    <div className="print:border print:p-1">
                        <h3 className="font-bold text-red-700 mb-2 print:text-xs print:mb-1 print:text-black">4. R290 Safety Checks</h3>
                        <div className="grid grid-cols-2 gap-2 print:flex print:justify-between">
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="ventilation" onChange={handleChange}/> Ventilation OK</label>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="ignitionClearance" onChange={handleChange}/> No Sparks (3m)</label>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="drainsSealed" onChange={handleChange}/> Drains Sealed</label>
                        </div>
                    </div>
                </div>

                {/* 5 & 6 COMPACT GRID FOR PRINT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-2">
                    {/* Mechanical */}
                    <div className="print:border print:p-1">
                        <h3 className="font-bold text-gray-800 mb-2 print:text-xs print:mb-1">5. Mechanical & Elec</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="filterMeshCheck" onChange={handleChange}/> Filter Clean</label>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="magnesiumRod" onChange={handleChange}/> Anode OK</label>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="safetyValveDrain" onChange={handleChange}/> Safety Drain</label>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="rcdInstalled" onChange={handleChange}/> RCD Tested</label>
                        </div>
                    </div>

                    {/* Logic Settings */}
                    <div className="print:border print:p-1">
                        <h3 className="font-bold text-gray-800 mb-2 print:text-xs print:mb-1">6. Controller Logic</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between"><span>Pump:</span> <select name="pumpMode" onChange={handleChange} className="border p-0"><option>Normal</option><option>Demand</option></select></div>
                            <div className="flex justify-between"><span>Heater:</span> <select name="electricHeaterLogic" onChange={handleChange} className="border p-0"><option>Hot Water</option><option>All</option></select></div>
                            <div className="flex justify-between"><span>DHW Diff:</span> <input name="hwTempDiff" className="w-8 border text-center" placeholder="3"/></div>
                            <div className="flex justify-between"><span>Legionella:</span> <input type="checkbox" name="legionellaEnabled" /></div>
                        </div>
                    </div>
                </div>

                {/* 7. PERFORMANCE */}
                <div className="bg-orange-50 p-4 rounded print:bg-white print:border print:p-1">
                    <h3 className="font-bold text-gray-800 mb-2 print:text-xs print:mb-1">7. Performance Validation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-6 print:gap-2">
                        <div><label className="text-xs font-bold">Output (kW)</label><input name="heatOutputKw" onChange={handleChange} className="w-full p-1 border rounded" /></div>
                        <div><label className="text-xs font-bold">Input (kW)</label><input name="electricalInputKwe" onChange={handleChange} className="w-full p-1 border rounded" /></div>
                        <div><label className="text-xs font-bold">COP</label><input name="cop" value={formData.cop} className="w-full p-1 border rounded font-bold bg-white" readOnly /></div>
                        <div><label className="text-xs text-gray-500">Inlet °C</label><input name="inletTemp" onChange={handleChange} className="w-full p-1 border rounded" /></div>
                        <div><label className="text-xs text-gray-500">Outlet °C</label><input name="outletTemp" onChange={handleChange} className="w-full p-1 border rounded" /></div>
                        <div><label className="text-xs text-gray-500">Flow L/m</label><input name="waterFlow" onChange={handleChange} className="w-full p-1 border rounded" /></div>
                    </div>
                </div>

                {/* 8. NOTES */}
                <div className="print:border print:p-1">
                    <h3 className="font-bold text-gray-800 mb-2 print:text-xs print:mb-1">8. Engineer Notes</h3>
                    <textarea 
                        name="notes" 
                        rows="4" 
                        value={formData.notes} 
                        onChange={handleChange}
                        className="w-full p-2 border rounded text-xs print:h-20"
                    ></textarea>
                </div>

                {/* 9. HANDOVER CERTIFICATE */}
                <div className="border-t-4 border-gray-800 pt-4 mt-6 print:border-t-2 print:mt-2">
                    <h2 className="text-xl font-bold text-gray-900 print:text-sm mb-4 print:mb-2">Part 9. Handover Certificate</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                        <div className="space-y-2">
                            <h4 className="font-bold text-sm border-b">Installer Details</h4>
                            <input placeholder="Company Name" name="installerName" onChange={handleChange} className="w-full p-1 border rounded" />
                            <input placeholder="Technician Name" name="technicianName" onChange={handleChange} className="w-full p-1 border rounded" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm border-b">Checklist</h4>
                            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="handoverTraining" /> Customer training completed</label>
                            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="maintenanceExplained" /> Maintenance & R290 Safety explained</label>
                            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="manualHandover" /> Manuals Handed Over</label>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-12 pt-4 print:mt-4">
                        <div className="border-t border-black pt-1">
                            <p className="font-bold text-xs">Installer Signature</p>
                        </div>
                        <div className="border-t border-black pt-1">
                            <p className="font-bold text-xs">Customer Signature</p>
                        </div>
                    </div>
                </div>

                {/* SUBMIT BUTTON (Hidden on Print) */}
                <div className="no-print mt-8">
                    <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center mb-4">
                        <label className="cursor-pointer block text-sm text-gray-600">
                            <Camera className="mx-auto mb-1" /> Upload Leak Check Photo
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                        {photo && <p className="text-xs text-green-600">Attached</p>}
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white font-bold rounded shadow hover:bg-orange-700">
                        {loading ? 'Saving...' : 'Submit to CRM'}
                    </button>
                </div>

            </form>
        </div>
    );
}
