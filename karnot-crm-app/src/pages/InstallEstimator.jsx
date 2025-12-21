import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wrench, Truck, Users, Save, FileText, Calculator, 
    HardHat, ArrowRight, DollarSign 
} from 'lucide-react';
import { Card, Button, Input, Textarea, Section } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const InstallEstimator = ({ quotes = [], user }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- STATE: COST ESTIMATION ---
    const [estimation, setEstimation] = useState({
        manpowerCount: 2,
        manpowerDays: 3,
        manpowerRate: 800, // Daily rate per head
        mobilizationCost: 5000, // Travel, Gas, Tolls
        accommodationCost: 0, // Hotel/Food
        materialsCost: 15000, // Pipes, wires, consumables
        contingency: 10, // % Contingency
        markup: 30, // % Margin on service
    });

    // --- STATE: SCOPE & PLAN ---
    const [scope, setScope] = useState({
        scopeOfWork: '1. Position and level heat pump unit.\n2. Connect hydraulic piping (Supply/Return).\n3. Electrical termination to isolator.\n4. System flushing and air bleeding.\n5. Startup and parameter configuration.',
        notes: '',
        targetStart: ''
    });

    // --- 1. LOAD PROJECTS (WON/INVOICED QUOTES) ---
    useEffect(() => {
        if (!quotes) return;
        // Filter for quotes that are likely ready for install
        const installable = quotes.filter(q => 
            q.status === 'WON' || q.status === 'INVOICED' || q.status === 'APPROVED'
        );
        setProjects(installable);
    }, [quotes]);

    // --- 2. CALCULATIONS ---
    const costs = useMemo(() => {
        const labor = estimation.manpowerCount * estimation.manpowerDays * estimation.manpowerRate;
        const logistics = parseFloat(estimation.mobilizationCost) + parseFloat(estimation.accommodationCost);
        const materials = parseFloat(estimation.materialsCost);
        
        const baseCost = labor + logistics + materials;
        const contingencyAmount = baseCost * (estimation.contingency / 100);
        const totalBase = baseCost + contingencyAmount;
        
        const markupAmount = totalBase * (estimation.markup / 100);
        const servicePrice = totalBase + markupAmount;

        return { labor, logistics, materials, baseCost, contingencyAmount, totalBase, markupAmount, servicePrice };
    }, [estimation]);

    // --- 3. HANDLERS ---
    const handleProjectSelect = (e) => {
        const quoteId = e.target.value;
        const proj = projects.find(p => p.id === quoteId);
        setSelectedProject(proj);
    };

    const handleSaveEstimate = async () => {
        if (!selectedProject || !user) return alert("Select a project first.");
        
        setLoading(true);
        try {
            await addDoc(collection(db, "users", user.uid, "installation_proposals"), {
                quoteId: selectedProject.id,
                customerName: selectedProject.customer?.name,
                estimation,
                costs,
                scope,
                status: 'DRAFT',
                createdAt: serverTimestamp()
            });
            alert("Installation Estimate Saved!");
        } catch (error) {
            console.error(error);
            alert("Error saving estimate.");
        } finally {
            setLoading(false);
        }
    };

    // --- 4. GENERATE PROPOSAL PDF ---
    const generateProposalPDF = () => {
        if (!selectedProject) return;

        const logoURL = "https://img1.wsimg.com/isteam/ip/cb1de239-c2b8-4674-b57d-5ae86a72feb1/Asset%2010%404x.png/:/rs=w:400,cg:true,m";
        const date = new Date().toLocaleDateString();

        const html = `
        <html>
        <head>
            <title>Service Proposal - ${selectedProject.id}</title>
            <style>
                body { font-family: Helvetica, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
                .title { color: #0d9488; font-size: 24px; font-weight: bold; text-transform: uppercase; }
                .section { margin-bottom: 30px; }
                .label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .value { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { text-align: left; background: #f0fdfa; padding: 10px; font-size: 12px; border-bottom: 2px solid #ccfbf1; }
                td { border-bottom: 1px solid #eee; padding: 10px; font-size: 13px; }
                .total-box { float: right; width: 300px; background: #f0fdfa; padding: 20px; margin-top: 20px; border-radius: 8px; border: 1px solid #ccfbf1; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <img src="${logoURL}" width="150" />
                    <p style="font-size:12px; margin-top:10px;">
                        <strong>Karnot Energy Solutions Inc.</strong><br>
                        Mapandan, Pangasinan
                    </p>
                </div>
                <div style="text-align:right;">
                    <div class="title">Installation Proposal</div>
                    <p>Ref: INST-${selectedProject.id}<br>Date: ${date}</p>
                </div>
            </div>

            <div class="section">
                <div class="label">Client Details</div>
                <div class="value">${selectedProject.customer?.name}</div>
                <div style="font-size:12px;">${selectedProject.customer?.address}</div>
            </div>

            <div class="section">
                <div class="label">Scope of Work</div>
                <div style="white-space: pre-wrap; font-size:13px; margin-top:10px; line-height: 1.5; background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">${scope.scopeOfWork}</div>
            </div>

            <div class="section">
                <div class="label">Commercial Offer</div>
                <table>
                    <thead>
                        <tr><th>Description</th><th style="text-align:right;">Amount (PHP)</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Professional Installation Services</strong><br><span style="color:#666; font-size:11px;">Labor, Engineering, and Supervision</span></td>
                            <td style="text-align:right;">${(costs.labor + (costs.labor * (estimation.markup/100))).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td><strong>Mobilization & Logistics</strong><br><span style="color:#666; font-size:11px;">Transport, Hauling, and Accommodation</span></td>
                            <td style="text-align:right;">${(costs.logistics + (costs.logistics * (estimation.markup/100))).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td><strong>Installation Materials</strong><br><span style="color:#666; font-size:11px;">Piping, Fittings, Electrical Components</span></td>
                            <td style="text-align:right;">${(costs.materials + (costs.materials * (estimation.markup/100))).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td><strong>Testing & Commissioning</strong><br><span style="color:#666; font-size:11px;">System startup, parameter setting, handover</span></td>
                            <td style="text-align:right;">INCLUDED</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="total-box">
                <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold; color: #0f766e;">
                    <span>Total Project Cost:</span>
                    <span>PHP ${costs.servicePrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <p style="font-size:10px; margin-top:10px; color:#666;">* Proposal valid for 30 days. Payment terms per main contract.</p>
            </div>

            <div style="clear:both; padding-top: 80px; display: flex; justify-content: space-between;">
                <div style="width: 45%;">
                    <div class="label">Prepared By:</div>
                    <div style="margin-top:40px; border-top: 1px solid #ccc; font-size:12px; padding-top: 5px;">Karnot Energy Solutions Inc.</div>
                </div>
                <div style="width: 45%;">
                    <div class="label">Conforme:</div>
                    <div style="margin-top:40px; border-top: 1px solid #ccc; font-size:12px; padding-top: 5px;">Client Signature over Printed Name</div>
                </div>
            </div>
        </body>
        </html>
        `;

        const win = window.open("", "Print", "width=800,height=900");
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-teal-100 text-teal-600 rounded-3xl">
                        <HardHat size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Installation Estimator</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Service Proposal Generator</p>
                    </div>
                </div>
                
                <div className="w-full md:w-auto mt-4 md:mt-0">
                    <select 
                        onChange={handleProjectSelect}
                        className="w-full md:w-80 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 outline-none focus:border-teal-500"
                    >
                        <option value="">-- Select Sold Project --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.customer?.name} - {p.id}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedProject ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COL: COST ESTIMATION */}
                    <div className="lg:col-span-2 space-y-8">
                        <Section title="1. Internal Cost Estimation">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* MANPOWER */}
                                <Card className="bg-blue-50 border-blue-100 p-4">
                                    <div className="flex items-center gap-2 mb-4 text-blue-700 font-black uppercase text-xs tracking-widest">
                                        <Users size={16}/> Manpower
                                    </div>
                                    <div className="space-y-3">
                                        <Input 
                                            label="Technicians" 
                                            type="number" 
                                            value={estimation.manpowerCount} 
                                            onChange={e => setEstimation({...estimation, manpowerCount: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="Days Required" 
                                            type="number" 
                                            value={estimation.manpowerDays} 
                                            onChange={e => setEstimation({...estimation, manpowerDays: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="Rate / Day (PHP)" 
                                            type="number" 
                                            value={estimation.manpowerRate} 
                                            onChange={e => setEstimation({...estimation, manpowerRate: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <div className="text-right font-black text-blue-600 border-t border-blue-200 pt-2">
                                            ₱{costs.labor.toLocaleString()}
                                        </div>
                                    </div>
                                </Card>

                                {/* LOGISTICS */}
                                <Card className="bg-orange-50 border-orange-100 p-4">
                                    <div className="flex items-center gap-2 mb-4 text-orange-700 font-black uppercase text-xs tracking-widest">
                                        <Truck size={16}/> Logistics
                                    </div>
                                    <div className="space-y-3">
                                        <Input 
                                            label="Mobilization (Gas/Toll)" 
                                            type="number" 
                                            value={estimation.mobilizationCost} 
                                            onChange={e => setEstimation({...estimation, mobilizationCost: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="Accommodation / Food" 
                                            type="number" 
                                            value={estimation.accommodationCost} 
                                            onChange={e => setEstimation({...estimation, accommodationCost: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <div className="h-[74px]"></div>
                                        <div className="text-right font-black text-orange-600 border-t border-orange-200 pt-2">
                                            ₱{costs.logistics.toLocaleString()}
                                        </div>
                                    </div>
                                </Card>

                                {/* MATERIALS & MARKUP */}
                                <Card className="bg-green-50 border-green-100 p-4">
                                    <div className="flex items-center gap-2 mb-4 text-green-700 font-black uppercase text-xs tracking-widest">
                                        <Calculator size={16}/> Materials
                                    </div>
                                    <div className="space-y-3">
                                        <Input 
                                            label="Materials Budget" 
                                            type="number" 
                                            value={estimation.materialsCost} 
                                            onChange={e => setEstimation({...estimation, materialsCost: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <Input 
                                            label="Contingency (%)" 
                                            type="number" 
                                            value={estimation.contingency} 
                                            onChange={e => setEstimation({...estimation, contingency: e.target.value})} 
                                            className="bg-white"
                                        />
                                        <div className="h-[74px]"></div>
                                        <div className="text-right font-black text-green-600 border-t border-green-200 pt-2">
                                            Total: ₱{(costs.materials + costs.contingencyAmount).toLocaleString()}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </Section>

                        <Section title="2. Scope of Work">
                            <Textarea 
                                rows="6" 
                                value={scope.scopeOfWork} 
                                onChange={e => setScope({...scope, scopeOfWork: e.target.value})}
                                placeholder="Describe the installation steps..."
                            />
                        </Section>
                    </div>

                    {/* RIGHT COL: SUMMARY & ACTIONS */}
                    <div className="space-y-6">
                        <Card className="bg-slate-800 text-white p-6 shadow-xl border-0 rounded-3xl">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h3>
                            
                            <div className="flex justify-between mb-2 text-sm">
                                <span className="opacity-70">Total Base Cost</span>
                                <span className="font-mono font-bold">₱{costs.baseCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between mb-4 pb-4 border-b border-slate-700 text-sm">
                                <span className="opacity-70">Contingency ({estimation.contingency}%)</span>
                                <span className="font-mono font-bold">+ ₱{costs.contingencyAmount.toLocaleString()}</span>
                            </div>

                            <div className="mb-4">
                                <Input 
                                    label={<span className="text-slate-400">Target Markup (%)</span>}
                                    type="number" 
                                    value={estimation.markup} 
                                    onChange={e => setEstimation({...estimation, markup: e.target.value})} 
                                    className="bg-slate-700 border-slate-600 text-white font-black text-center text-lg"
                                />
                            </div>

                            <div className="flex justify-between items-end bg-slate-700/50 p-4 rounded-xl">
                                <div>
                                    <p className="font-black uppercase tracking-widest text-[10px] text-teal-400">Client Price</p>
                                    <p className="text-[10px] text-slate-400">Excluding VAT</p>
                                </div>
                                <span className="text-3xl font-black text-white">₱{costs.servicePrice.toLocaleString()}</span>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Planning Details</h3>
                            <Input 
                                label="Target Start Date" 
                                type="date" 
                                value={scope.targetStart} 
                                onChange={e => setScope({...scope, targetStart: e.target.value})}
                            />
                        </Card>

                        <div className="space-y-3">
                            <Button onClick={generateProposalPDF} variant="secondary" className="w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest">
                                <FileText size={16} className="mr-2"/> Generate Proposal PDF
                            </Button>
                            <Button onClick={handleSaveEstimate} variant="primary" className="w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-teal-200 bg-teal-600 hover:bg-teal-700 border-none" disabled={loading}>
                                <Save size={16} className="mr-2"/> Save Estimate
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <div className="p-6 bg-gray-50 rounded-full mb-4">
                        <Wrench size={48} className="text-gray-300"/>
                    </div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Installation Estimator</h3>
                    <p className="text-sm text-gray-400 mt-2 max-w-md">Select a sold project from the dropdown above to begin calculating manpower, logistics, and service costs.</p>
                </div>
            )}
        </div>
    );
};

export default InstallEstimator;
