import React, { useState, useRef, useMemo } from 'react';
import { Printer, Package, Search, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '../data/constants.jsx';

// --- CONFIGURATION ---
const IMAGE_BASE_URL = "https://raw.githubusercontent.com/karnot-crm-app/images/main/"; 
const IMAGE_EXTENSION = ".png"; 

// --- REAL DATA FROM YOUR CSV ---
const IMPORTED_PRODUCT_DATA = [
    // ... (Previous AquaHERO, iCOOL, iHEAT products remain here) ...
    {
        id: "istor_p58",
        category: "iSTOR", // Triggers Thermal Battery Layout
        name: "Karnot iSTOR P58 Thermal Battery",
        subtitle: "High-Temp Thermal Storage",
        description: "80 kWh thermal battery using Plentigrade P58 Phase Change Material. Ideal for heat buffering and decarbonizing hot water systems.",
        certifications: "CE, RAL Quality Mark",
        specs: {
            orderRef: "iSTOR-P58-80",
            nominalCapacity: "80 kWh",
            standbyLoss: "3.0 kWh/24h",
            dischargeTemp: "54°C",
            chargingTemp: "65°C to 80°C",
            maxFlow: "50 L/min",
            dimensions: "1200 x 1000 x 1470 mm",
            weight: "1,402 kg"
        }
    },
    {
        id: "istor_stainless_1000l",
        category: "iSTOR", // Triggers Standard Tank Layout
        name: "Karnot iSTOR Stainless Steel Tank - 1000L",
        subtitle: "Hydraulic Buffer Tank",
        description: "Premium stainless steel buffer tank for hydronic heating and cooling systems. Includes optional DN32 coil.",
        certifications: "CE",
        specs: {
            orderRef: "iSTOR-SS-1000",
            volume: "1000 L",
            material: "Stainless Steel (SUS304)",
            dimensions: "φ900×2080 mm",
            packing: "1020×1020×2270 mm",
            coil: "Optional DN32 (USD 5/m)"
        }
    }
];

const DatasheetLibrary = () => {
    const [selectedId, setSelectedId] = useState(IMPORTED_PRODUCT_DATA[0].id);
    const [units, setUnits] = useState('metric');
    const [searchTerm, setSearchTerm] = useState('');
    const printRef = useRef();

    const filteredProducts = useMemo(() => {
        return IMPORTED_PRODUCT_DATA.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const product = IMPORTED_PRODUCT_DATA.find(p => p.id === selectedId) || IMPORTED_PRODUCT_DATA[0];
    const data = product.specs; // iSTOR data structure is flatter in this example

    const getProductImage = (id) => `${IMAGE_BASE_URL}${id}${IMAGE_EXTENSION}`;

    const renderCertBadges = (certString) => {
        if (!certString) return null;
        return (
            <div className="badges">
                {certString.split(',').map((c, i) => (
                    <span key={i} className="badge">{c.trim()}</span>
                ))}
            </div>
        );
    };

    // --- SMART SPEC RENDERER ---
    const renderTechnicalSpecs = () => {
        const s = product.specs;
        
        // 1. iHEAT / AquaHERO (Heat Pumps)
        if (product.category.includes("iHEAT") || product.category.includes("AquaHERO")) {
             // ... (Same Heat Pump Logic as before) ...
             return <div>Heat Pump Specs Placeholder</div>;
        }

        // 2. iCOOL (Refrigeration)
        if (product.category.includes("iCOOL")) {
             // ... (Same Refrigeration Logic as before) ...
             return <div>Refrigeration Specs Placeholder</div>;
        }

        // 3. iSTOR (Storage) - NEW LOGIC
        if (product.category.includes("iSTOR")) {
            // Check if it's a PCM Battery (has "nominalCapacity") or a simple Tank
            if (s.nominalCapacity) {
                // PCM Thermal Battery Layout
                return (
                    <>
                        <div className="section-head">Thermal Performance</div>
                        <table className="data-table">
                            <tbody>
                                <tr><td>Storage Capacity</td><td>{s.nominalCapacity}</td></tr>
                                <tr><td>Discharge Temp</td><td>{s.dischargeTemp}</td></tr>
                                <tr><td>Standby Loss</td><td>{s.standbyLoss}</td></tr>
                                <tr><td>Max Flow Rate</td><td>{s.maxFlow}</td></tr>
                                <tr><td>Charging Source</td><td>{s.chargingTemp}</td></tr>
                            </tbody>
                        </table>
                    </>
                );
            } else {
                // Standard Tank Layout
                return (
                    <>
                        <div className="section-head">Tank Specifications</div>
                        <table className="data-table">
                            <tbody>
                                <tr><td>Volume</td><td>{s.volume}</td></tr>
                                <tr><td>Material</td><td>{s.material}</td></tr>
                                <tr><td>Coil Option</td><td>{s.coil}</td></tr>
                                <tr><td>Packing Dims</td><td>{s.packing}</td></tr>
                            </tbody>
                        </table>
                    </>
                );
            }
        }

        return <div>Generic Specs</div>;
    };

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=1200');
        printWindow.document.write(`
            <html><head><title>${product.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
            <style>${getStyles()}</style></head><body><div class="ds-container">${content}</div></body></html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const getStyles = () => `
        :root { --orange: #F56600; --text: #1d1d1f; --sub: #6e6e73; --bg: #ffffff; }
        body { font-family: 'Inter', sans-serif; color: var(--text); background: white; margin: 0; }
        .ds-container { max-width: 1000px; margin: auto; }
        .section-pad { padding: 40px; }
        .section-head { font-size: 18px; font-weight: 700; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid var(--orange); text-transform: uppercase; }
        .ds-hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; }
        .ds-hero h1 { font-size: 34px; margin: 0 0 5px 0; color: var(--orange); line-height: 1.1; }
        .ds-hero .sub { font-size: 16px; color: var(--sub); font-weight: 600; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
        .ds-hero img { width: 100%; border-radius: 8px; object-fit: contain; max-height: 280px; }
        .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        .badge { background: #f5f5f7; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #eee; }
        .spec-sec { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #eee; margin-top: 20px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table td { padding: 10px 0; border-bottom: 1px solid #eee; }
        .data-table td:first-child { font-weight: 600; width: 50%; color: #444; }
        .data-table td:last-child { text-align: right; color: var(--sub); }
        .disclaimer { font-size: 10px; color: #999; text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        .missing-img-placeholder { width: 100%; height: 250px; background: #f9f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; border-radius: 12px; border: 2px dashed #eee; }
    `;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* SIDEBAR */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
                <div className="p-5 border-b">
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <Package className="text-orange-600"/> Datasheets
                    </h2>
                    <div className="mt-3 relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border rounded-lg text-xs" />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => setSelectedId(p.id)} className={`p-3 rounded-lg cursor-pointer border ${selectedId === p.id ? 'bg-orange-50 border-orange-500' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                            <div className="flex justify-between"><span className="font-bold text-xs">{p.name}</span></div>
                            <span className="text-[10px] text-gray-500 uppercase">{p.category}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* PREVIEW */}
            <div className="flex-1 flex flex-col h-screen relative">
                <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] text-gray-400">
                            Image Source: <span className="font-mono text-blue-500">{getProductImage(selectedId)}</span>
                        </div>
                    </div>
                    <Button onClick={handlePrint} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg flex gap-2"><Printer size={14}/> Print PDF</Button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center">
                    <div className="bg-white shadow-2xl w-[800px] min-h-[1130px] p-0 overflow-hidden" ref={printRef}>
                        <div className="ds-container">
                            <div className="section-pad ds-hero">
                                <div>
                                    <h1>{product.name}</h1>
                                    <p className="sub">{product.category} SERIES</p>
                                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                                    {renderCertBadges(product.certifications)}
                                </div>
                                <div style={{textAlign:'center'}}>
                                    <img 
                                        src={getProductImage(selectedId)} 
                                        alt={product.name}
                                        onError={(e) => {
                                            e.target.onerror = null; 
                                            e.target.style.display = 'none'; 
                                            e.target.nextSibling.style.display = 'flex'; 
                                        }}
                                    />
                                    <div className="missing-img-placeholder" style={{display:'none'}}>
                                        <ImageIcon size={48} />
                                        <span style={{marginTop:'10px', fontSize:'12px'}}>Image not found on GitHub</span>
                                        <span style={{fontSize:'10px', fontFamily:'monospace'}}>{product.id}{IMAGE_EXTENSION}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="section-pad spec-sec">
                                <div>
                                    {renderTechnicalSpecs()}
                                </div>
                                <div>
                                    <div className="section-head">Physical Data</div>
                                    <table className="data-table">
                                        <tbody>
                                            {product.specs.dimensions && <tr><td>Dimensions</td><td>{product.specs.dimensions}</td></tr>}
                                            {product.specs.weight && <tr><td>Weight</td><td>{product.specs.weight}</td></tr>}
                                            {product.specs.orderRef && <tr><td>Order Ref</td><td>{product.specs.orderRef}</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="disclaimer">Karnot Energy Systems Inc. | {product.id.toUpperCase()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatasheetLibrary;
