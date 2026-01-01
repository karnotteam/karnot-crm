import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Printer, Package, Search, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '../data/constants.jsx';
import { db } from '../firebase'; 
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

// --- CONFIGURATION ---
const IMAGE_BASE_URL = "https://raw.githubusercontent.com/karnot-crm-app/images/main/"; 
const IMAGE_EXTENSION = ".png"; 

const DatasheetLibrary = () => {
    // 1. STATE: Holds the live data from your Product Manager
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 2. UI STATE: Which product is showing? Metric or Imperial?
    const [selectedId, setSelectedId] = useState(null);
    const [units, setUnits] = useState('metric');
    const [searchTerm, setSearchTerm] = useState('');
    const printRef = useRef();

    const auth = getAuth();
    const user = auth.currentUser;

    // --- 3. THE ENGINE: Connects to Firestore Database ---
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetches ALL products you imported via CSV
        const q = query(collection(db, "users", user.uid, "products"), orderBy("category", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(list);
            
            // Auto-select the first product if nothing is selected
            if (list.length > 0 && !selectedId) {
                setSelectedId(list[0].id); 
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching products:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // --- 4. SEARCH FILTER ---
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    // Get the currently selected product object
    const product = products.find(p => p.id === selectedId) || products[0];

    // --- 5. DYNAMIC HELPERS ---
    
    // Automatically finds the image on GitHub using the System ID
    const getProductImage = (id) => {
        if (!id) return '';
        if (product?.Image_URL) return product.Image_URL; // Use CSV link if exists
        return `${IMAGE_BASE_URL}${id}${IMAGE_EXTENSION}`; // Fallback to GitHub
    };

    // Parses your "Certificates" column into visual badges
    const renderCertBadges = (certString) => {
        if (!certString) return null;
        // Handles both "CE, MCS" (string) and ["CE", "MCS"] (array) formats
        const certs = Array.isArray(certString) ? certString : String(certString).split(',');
        return (
            <div className="badges">
                {certs.map((c, i) => (
                    <span key={i} className={`badge ${c.trim().includes('MCS') ? 'mcs' : ''}`}>
                        {c.trim().includes('MCS') && <i className="bi bi-patch-check-fill" style={{marginRight: '4px'}}></i>}
                        {c.trim()}
                    </span>
                ))}
            </div>
        );
    };

    // --- 6. SMART LAYOUT ENGINE ---
    // This decides WHICH technical table to show based on the Product Category
    const renderTechnicalSpecs = () => {
        if (!product) return null;
        
        const cat = (product.category || '').toUpperCase();
        
        // LAYOUT A: HEAT PUMPS (iHEAT / AquaHERO)
        if (cat.includes("IHEAT") || cat.includes("AQUAHERO")) {
            return (
                <>
                    <div className="section-head">Performance Data</div>
                    <table className="data-table">
                        <tbody>
                            <tr><td>Heating Capacity</td><td>{product.kW_Heating_Nominal || product.kW_DHW_Nominal || '-'} kW</td></tr>
                            <tr><td>COP (Efficiency)</td><td>{product.COP_DHW || '-'}</td></tr>
                            {product.kW_Cooling_Nominal > 0 && <tr><td>Cooling Capacity</td><td>{product.kW_Cooling_Nominal} kW</td></tr>}
                            <tr><td>Max Water Temp</td><td>{product.max_temp_c || '-'} °C</td></tr>
                            <tr><td>Refrigerant</td><td>{product.Refrigerant || '-'}</td></tr>
                        </tbody>
                    </table>
                </>
            );
        }

        // LAYOUT B: REFRIGERATION (iCOOL)
        if (cat.includes("ICOOL")) {
            return (
                <>
                    <div className="section-head">Refrigeration Performance</div>
                    <table className="data-table">
                        <tbody>
                            <tr><td>Cooling Capacity (MT)</td><td>{product.kW_Cooling_Nominal || '-'} kW</td></tr>
                            <tr><td>Refrigerant</td><td>{product.Refrigerant || '-'}</td></tr>
                            <tr><td>Compressor</td><td>{product.Suitable_Compressor || '-'}</td></tr>
                            <tr><td>Evap Temp Range</td><td>{product.Evaporating_Temp_Nominal || '-'}</td></tr>
                        </tbody>
                    </table>
                </>
            );
        }

        // LAYOUT C: STORAGE (iSTOR)
        if (cat.includes("ISTOR")) {
            // Detects "P5" or "Battery" in name to show PCM specs vs Standard Tank specs
            if (product.name.includes("P5") || product.name.includes("P58") || product.name.includes("Battery")) {
                 return (
                    <>
                        <div className="section-head">Thermal Performance</div>
                        <table className="data-table">
                            <tbody>
                                <tr><td>Storage Capacity</td><td>{product.Receiver_Volume || '-'} kWh</td></tr>
                                <tr><td>Max Flow Rate</td><td>{product.WaterFlow_Heating_m3h || '-'} m³/h</td></tr>
                                <tr><td>Dimensions</td><td>{product.Unit_Dimensions}</td></tr>
                            </tbody>
                        </table>
                    </>
                );
            } else {
                // Standard Stainless Tank
                return (
                    <>
                        <div className="section-head">Tank Specifications</div>
                        <table className="data-table">
                            <tbody>
                                <tr><td>Volume</td><td>{product.Receiver_Volume || '-'} L</td></tr>
                                <tr><td>Material</td><td>Stainless Steel</td></tr>
                                <tr><td>Coil Option</td><td>See Options</td></tr>
                                <tr><td>Packing Dims</td><td>{product.Unit_Dimensions || '-'}</td></tr>
                            </tbody>
                        </table>
                    </>
                );
            }
        }

        // LAYOUT D: FAN COILS (iZONE)
        if (cat.includes("IZONE") || cat.includes("FAN COIL")) {
            return (
                <>
                    <div className="section-head">Air & Water Data</div>
                    <table className="data-table">
                        <tbody>
                            <tr><td>Airflow (High)</td><td>{product.Airflow_H_m3h || '-'} m³/h</td></tr>
                            <tr><td>Heating Output</td><td>{product.kW_Heating_Nominal || '-'} kW</td></tr>
                            <tr><td>Cooling Output</td><td>{product.kW_Cooling_Nominal || '-'} kW</td></tr>
                            <tr><td>Water Flow</td><td>{product.WaterFlow_Heating_m3h || '-'} m³/h</td></tr>
                            <tr><td>Noise Level</td><td>{product.Noise_H_dBA || '-'} dBA</td></tr>
                        </tbody>
                    </table>
                </>
            );
        }

        // LAYOUT E: DEFAULT (Anything else)
        return (
            <>
                <div className="section-head">Technical Data</div>
                <table className="data-table">
                    <tbody>
                       <tr><td>Category</td><td>{product.category}</td></tr>
                       <tr><td>Price</td><td>${product.salesPriceUSD}</td></tr>
                       <tr><td>Power Input</td><td>{product.Rated_Power_Input || '-'} kW</td></tr>
                       <tr><td>Dimensions</td><td>{product.Unit_Dimensions || '-'}</td></tr>
                    </tbody>
                </table>
            </>
        );
    };

    // --- 7. PDF PRINT GENERATOR ---
    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=1200');
        printWindow.document.write(`
            <html><head><title>${product?.name || 'Datasheet'}</title>
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
        .badge.mcs { color: #00884A; border-color: #00884A; background: #f0fdf4; }
        .spec-sec { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #eee; margin-top: 20px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table td { padding: 10px 0; border-bottom: 1px solid #eee; }
        .data-table td:first-child { font-weight: 600; width: 50%; color: #444; }
        .data-table td:last-child { text-align: right; color: var(--sub); }
        .disclaimer { font-size: 10px; color: #999; text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        .missing-img-placeholder { width: 100%; height: 250px; background: #f9f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; border-radius: 12px; border: 2px dashed #eee; }
        .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; }
        .feat-item { background: #f9f9fa; padding: 15px; border-radius: 10px; border: 1px solid #e5e5e5; }
        .feat-item i { font-size: 20px; color: var(--orange); display: block; margin-bottom: 8px; }
        .feat-item h3 { font-size: 13px; margin: 0 0 4px 0; font-weight: 700; }
        .feat-item p { font-size: 11px; margin: 0; color: var(--sub); line-height: 1.4; }
    `;

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Product Library...</div>;
    if (!product) return <div className="p-10 text-center text-gray-500">No products found. Please add products in Product Manager.</div>;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* LEFT SIDEBAR - PRODUCT LIST */}
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
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setUnits('metric')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${units === 'metric' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Metric</button>
                            <button onClick={() => setUnits('imperial')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${units === 'imperial' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Imperial</button>
                        </div>
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
                                    <p className="text-sm text-gray-600 mb-4">{product.specs || product.Order_Reference || 'High efficiency system designed for commercial and residential applications.'}</p>
                                    
                                    {renderCertBadges(product.Certificate_Detail || product.Certificates)}
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
                                        <span style={{marginTop:'10px', fontSize:'12px'}}>Image not found</span>
                                        <span style={{fontSize:'10px', fontFamily:'monospace'}}>{product.id}{IMAGE_EXTENSION}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="section-pad" style={{ background: '#fff', paddingBottom: '20px' }}>
                                <div className="section-head">Key Features</div>
                                <div className="feat-grid">
                                    <div className="feat-item">
                                        <i className="bi bi-shield-check"></i>
                                        <h3>Reliability</h3>
                                        <p>Engineered with high-quality components for long service life.</p>
                                    </div>
                                    <div className="feat-item">
                                        <i className="bi bi-lightning-charge"></i>
                                        <h3>Efficiency</h3>
                                        <p>Optimized for low energy consumption and high performance.</p>
                                    </div>
                                    <div className="feat-item">
                                        <i className="bi bi-tools"></i>
                                        <h3>Serviceability</h3>
                                        <p>Designed for easy maintenance and quick part replacement.</p>
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
                                            <tr><td>Power Supply</td><td>{product.Power_Supply || '-'}</td></tr>
                                            <tr><td>Sound Level</td><td>{product.Sound_Power_Level ? product.Sound_Power_Level + ' dBA' : '-'}</td></tr>
                                            <tr><td>Dimensions</td><td>{product.Unit_Dimensions || '-'}</td></tr>
                                            <tr><td>Net Weight</td><td>{product.Net_Weight ? product.Net_Weight + ' kg' : '-'}</td></tr>
                                            <tr><td>Breaker</td><td>{product.Recommended_Breaker || '-'}</td></tr>
                                        </tbody>
                                    </table>
                                    
                                    <div style={{marginTop: '30px', background: '#f9f9fa', padding:'15px', borderRadius:'8px', border:'1px solid #eee'}}>
                                        <h4 style={{fontSize:'13px', fontWeight:'700', marginBottom:'5px', color:'#333'}}>System Notes</h4>
                                        <p style={{fontSize:'11px', color:'#666', lineHeight:'1.4'}}>
                                            • Ref. Order Code: {product.Order_Reference || '-'}<br/>
                                            • Certifications: {product.Certificates || 'Pending'}
                                        </p>
                                    </div>
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
