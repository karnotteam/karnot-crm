import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Globe, Upload, Search, MapPin, ShieldCheck, AlertTriangle, CheckSquare, Wand2, Calendar, MessageSquare, Square, Filter, Clock, FileText, Link as LinkIcon, Users, User, ArrowRight, Navigation, ClipboardCheck, Linkedin, Tag } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx'; // <--- Added PRICING_TIERS

// --- 1. Helper: Haversine Distance Formula (km) ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);  
    const dLon = deg2rad(lon2 - lon1); 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

const deg2rad = (deg) => deg * (Math.PI/180);

// --- 2. Stats Badge ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3
                ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
            `}
        >
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon size={20} />
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
                </p>
            </div>
        </div>
    );
};

// --- 3. Duplicate Resolver ---
const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());

    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedToDelete(newSet);
    };

    const handleAutoSelect = () => {
        const newSet = new Set();
        let count = 0;
        duplicates.forEach(group => {
            const sortedItems = [...group.items].sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB; 
            });
            for (let i = 1; i < sortedItems.length; i++) {
                newSet.add(sortedItems[i].id);
                count++;
            }
        });
        setSelectedToDelete(newSet);
        if(count > 0) alert(`Auto-selected ${count} newer duplicates.`);
    };

    const handleResolve = () => {
        if (window.confirm(`Permanently delete ${selectedToDelete.size} selected companies?`)) {
            onResolve(Array.from(selectedToDelete));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500"/> {duplicates.length} Duplicate Groups
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">Select records to <span className="text-red-600 font-bold">DELETE</span>.</p>
                    <Button onClick={handleAutoSelect} variant="secondary" className="text-sm"><Wand2 size={14} className="mr-2 text-purple-600"/>Auto-Select All</Button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-6 p-2">
                    {duplicates.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-orange-200 rounded-lg overflow-hidden">
                            <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 flex justify-between">
                                <span>Conflict: {group.key}</span>
                                <span className="text-xs uppercase bg-white px-2 py-0.5 rounded">Group {groupIndex + 1}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.items.map(company => (
                                    <div key={company.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(company.id) ? 'bg-red-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedToDelete.has(company.id)} onChange={() => toggleSelection(company.id)} className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{company.companyName}</p>
                                                <p className="text-xs text-gray-500">{company.industry} • {company.address}</p>
                                            </div>
                                        </div>
                                        {selectedToDelete.has(company.id) && <span className="text-xs font-bold text-red-600">Delete</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}><Trash2 className="mr-2" size={16}/> Delete Selected ({selectedToDelete.size})</Button>
                </div>
            </Card>
        </div>
    );
};

// --- 4. CompanyModal (Updated Logic) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes, contacts, commissioningReports, onOpenQuote, onOpenReport, onEditContact }) => {
    const isEditMode = Boolean(companyToEdit);
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [linkedIn, setLinkedIn] = useState(companyToEdit?.linkedIn || '');
    
    // --- NEW: Pricing Tier State ---
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');

    const [activeTab, setActiveTab] = useState('ACTIVITY'); // ACTIVITY, DATA
    
    // Editable GPS
    const [latitude, setLatitude] = useState(companyToEdit?.latitude || '');
    const [longitude, setLongitude] = useState(companyToEdit?.longitude || '');
    
    // Status
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');

    // Interactions
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [newLogType, setNewLogType] = useState('Visit');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    // --- SMART MATCHING LOGIC ---
    const targetName = companyToEdit ? companyToEdit.companyName.toLowerCase().trim() : companyName.toLowerCase().trim();
    const targetId = companyToEdit?.id;

    const companyContacts = useMemo(() => {
        if (!contacts) return [];
        return contacts.filter(c => 
            c.companyId === targetId || 
            (c.companyName && c.companyName.toLowerCase().trim() === targetName)
        );
    }, [contacts, targetName, targetId]);

    const relevantQuotes = useMemo(() => {
        if (!quotes) return [];
        return quotes.filter(q => 
            q.customer?.name?.toLowerCase().includes(targetName) || 
            q.customer?.name?.toLowerCase() === targetName
        );
    }, [quotes, targetName]);

    const relevantReports = useMemo(() => {
        if (!commissioningReports) return [];
        return commissioningReports.filter(r => 
            r.companyId === targetId ||
            (r.customerName && r.customerName.toLowerCase().includes(targetName))
        );
    }, [commissioningReports, targetName, targetId]);

    // GPS Handler
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
            },
            (error) => {
                alert("Unable to retrieve your location. Ensure GPS is on.");
            }
        );
    };

    const handleAddInteraction = () => {
        if (!newLogOutcome) return alert("Please enter details.");
        
        let linkedQuote = null;
        if (selectedQuoteId) {
            const q = relevantQuotes.find(rq => rq.id === selectedQuoteId);
            if (q) linkedQuote = { id: q.id, total: q.finalSalesPrice || 0, status: q.status };
        }

        const newInteraction = {
            id: Date.now(),
            date: newLogDate,
            type: newLogType,
            outcome: newLogOutcome,
            linkedQuote
        };

        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    const handleDeleteInteraction = (id) => setInteractions(interactions.filter(i => i.id !== id));

    const handleQuoteClick = (quoteId) => {
        const fullQuote = quotes.find(q => q.id === quoteId);
        if (fullQuote && onOpenQuote) {
            onOpenQuote(fullQuote); 
        } else {
            alert("Could not find full quote details.");
        }
    };

    const handleSave = () => {
        if (!companyName) { alert('Please enter a company name.'); return; }
        onSave({ 
            companyName, website, industry, address, linkedIn, tier, // Added Tier
            isVerified, isTarget, notes, interactions,
            latitude: latitude ? parseFloat(latitude) : null, 
            longitude: longitude ? parseFloat(longitude) : null
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col md:flex-row gap-6">
                
                {/* Left: Details */}
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Company' : 'New Company'}</h3>
                        <button onClick={onClose} className="md:hidden text-gray-500"><X /></button>
                    </div>
                    <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    
                    {/* --- NEW: PRICING TIER DROPDOWN --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier (Discount Level)</label>
                        <select 
                            value={tier} 
                            onChange={e => setTier(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500"
                        >
                            {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                <option key={key} value={key}>
                                    {t.label} ({t.discount}% Off)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.com" />
                        <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Food & Beverage" />
                    </div>
                    
                    <Textarea label="Address / Plant Location" rows="2" value={address} onChange={(e) => setAddress(e.target.value)} />
                    
                    {/* EDITABLE LOCATION */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <label className="block text-xs font-bold text-gray-600 mb-1">GPS Coordinates</label>
                        <div className="flex gap-2 mb-2">
                            <Input placeholder="Lat" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="text-xs"/>
                            <Input placeholder="Long" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="text-xs"/>
                        </div>
                        <Button onClick={handleGetLocation} variant="secondary" className="w-full text-xs py-1">
                            <MapPin size={14} className="mr-1"/> Capture Current Location
                        </Button>
                    </div>

                    <Input label="LinkedIn URL" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="https://linkedin.com/company/..." />

                    <Textarea label="General Notes" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    
                    <div className="grid grid-cols-2 gap-4 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <Checkbox id="isVerifiedComp" label="Verified Data" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                        <Checkbox id="isTarget" label="Target Account" checked={isTarget} onChange={(e) => setIsTarget(e.target.checked)} />
                    </div>
                </div>

                {/* Right: Tabs (Activity / Data) */}
                <div className="flex-1 border-l border-gray-200 pl-0 md:pl-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('ACTIVITY')}
                                className={`px-3 py-1 rounded text-sm font-bold ${activeTab === 'ACTIVITY' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                Activity Log
                            </button>
                            <button 
                                onClick={() => setActiveTab('DATA')}
                                className={`px-3 py-1 rounded text-sm font-bold ${activeTab === 'DATA' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                Linked Data ({companyContacts.length + relevantQuotes.length + relevantReports.length})
                            </button>
                        </div>
                        <button onClick={onClose} className="hidden md:block text-gray-500 hover:text-gray-800"><X /></button>
                    </div>

                    {activeTab === 'ACTIVITY' ? (
                        <>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4 space-y-2">
                                <div className="flex gap-2">
                                    <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-sm w-1/3" />
                                    <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="block w-2/3 px-2 py-2 bg-white border-gray-300 rounded-md shadow-sm text-sm">
                                        <option value="Visit">Site Visit</option>
                                        <option value="Call">Call</option>
                                        <option value="Email">Email</option>
                                        <option value="Note">Note</option>
                                    </select>
                                </div>
                                {relevantQuotes.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <LinkIcon size={14} className="text-gray-500"/>
                                        <select value={selectedQuoteId} onChange={(e) => setSelectedQuoteId(e.target.value)} className="block w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                                            <option value="">-- Attach Quote (Optional) --</option>
                                            {relevantQuotes.map(q => <option key={q.id} value={q.id}>{q.id} - ${q.finalSalesPrice?.toLocaleString()} ({q.status})</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Details..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                    <Button onClick={handleAddInteraction} variant="secondary" className="px-3"><Plus size={16}/></Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{minHeight: '200px', maxHeight: '500px'}}>
                                {interactions.map((log) => (
                                    <div key={log.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                                <span className="text-xs text-gray-500">{log.date}</span>
                                            </div>
                                            <button onClick={() => handleDeleteInteraction(log.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                        </div>
                                        <p className="text-sm text-gray-800">{log.outcome}</p>
                                        {log.linkedQuote && (
                                            <div 
                                                onClick={() => handleQuoteClick(log.linkedQuote.id)}
                                                className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded p-1.5 w-fit cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                            >
                                                <FileText size={14} className="text-blue-600"/>
                                                <span className="text-xs font-semibold text-blue-800">{log.linkedQuote.id} (${log.linkedQuote.total?.toLocaleString()})</span>
                                                <ArrowRight size={12} className="text-blue-400"/>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        // --- DATA TAB ---
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {/* CONTACTS */}
                            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <h5 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><Users size={14}/> Contacts ({companyContacts.length})</h5>
                                {companyContacts.length === 0 ? <p className="text-xs text-gray-400">None found.</p> : (
                                    companyContacts.map(c => (
                                        <div key={c.id} className="bg-white p-2 rounded border border-gray-100 mb-1 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold">{c.firstName} {c.lastName}</p>
                                                <p className="text-xs text-gray-500">{c.jobTitle}</p>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {c.phone && <a href={`tel:${c.phone}`} className="text-blue-600 text-xs hover:underline">{c.phone}</a>}
                                                <Button onClick={() => onEditContact(c)} variant="secondary" className="px-2 py-1 h-auto text-xs"><Edit size={12}/></Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* QUOTES */}
                            <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <h5 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><FileText size={14}/> Quotes ({relevantQuotes.length})</h5>
                                {relevantQuotes.length === 0 ? <p className="text-xs text-blue-400">None found.</p> : (
                                    relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => handleQuoteClick(q.id)} className="bg-white p-2 rounded border border-blue-100 mb-1 cursor-pointer hover:bg-blue-50">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-blue-700">{q.id}</span>
                                                <span className="text-xs text-gray-500">{new Date(q.createdAt?.seconds ? q.createdAt.seconds*1000 : q.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm font-bold">₱{q.finalSalesPrice?.toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* COMMISSIONING */}
                            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                                <h5 className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2"><ClipboardCheck size={14}/> Reports ({relevantReports.length})</h5>
                                {relevantReports.length === 0 ? <p className="text-xs text-green-400">None found.</p> : (
                                    relevantReports.map(r => (
                                        <div 
                                            key={r.id} 
                                            onClick={() => onOpenReport(r)} 
                                            className="bg-white p-2 rounded border border-green-100 mb-1 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-colors"
                                        >
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-green-700">{r.heatPumpSerial || 'Unknown Unit'}</span>
                                                <span className="text-xs text-gray-500">{new Date(r.commissionDate?.seconds ? r.commissionDate.seconds*1000 : r.commissionDate).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-600">COP: {r.cop} | {r.unitMode}</p>
                                            <div className="flex justify-end mt-1">
                                                <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold">Edit <ArrowRight size={10}/></span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button onClick={handleSave} variant="primary"><Plus className="mr-2" size={16} /> Save Company</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 5. CompanyCard (Updated with Distance) ---
const CompanyCard = ({ company, onEdit, onDelete, userLocation }) => {
    const lastActivity = company.interactions && company.interactions.length > 0 ? company.interactions[0] : null;
    
    // Calculate distance if both exist
    let distance = null;
    if (userLocation && company.latitude && company.longitude) {
        distance = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, company.latitude, company.longitude).toFixed(1);
    }
    
    // Get Tier Badge Logic
    const tierInfo = PRICING_TIERS[company.tier || 'STANDARD'];

    return (
        <Card className="p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between h-full hover:border-orange-300 transition-colors relative">
            <div>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-gray-800">{company.companyName}</h4>
                        {company.isVerified && <ShieldCheck size={18} className="text-green-600" title="Verified"/>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => onEdit(company)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                        <Button onClick={() => onDelete(company.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                    </div>
                </div>
                {company.industry && <p className="text-sm text-orange-600 mb-1">{company.industry}</p>}
                
                {/* --- NEW: TIER BADGE --- */}
                {tierInfo && tierInfo.discount > 0 && (
                     <div className={`text-xs font-bold inline-block px-2 py-0.5 rounded-full mb-2 bg-${tierInfo.color}-100 text-${tierInfo.color}-800`}>
                        {tierInfo.label} ({tierInfo.discount}% Off)
                     </div>
                )}
                
                <div className="text-sm text-gray-500 flex items-start gap-1 mb-3">
                    <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="line-clamp-2">{company.address || 'No Address'}</p>
                        {distance && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                📍 {distance} km away
                            </span>
                        )}
                    </div>
                </div>

                {lastActivity ? (
                    <div className="mb-3 bg-blue-50 p-2 rounded border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                {lastActivity.type === 'Visit' ? <Building size={10}/> : <Phone size={10}/>} {lastActivity.type}
                            </span>
                            <span className="text-[10px] text-gray-500">{lastActivity.date}</span>
                        </div>
                        <p className="text-xs text-gray-700 truncate">{lastActivity.outcome}</p>
                    </div>
                ) : (
                    <div className="mb-3 p-2 text-xs text-gray-400 italic">No recent activity</div>
                )}
            </div>
            
            {/* Quick Actions Row */}
            <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500 items-center">
                <div className="flex gap-2">
                    {company.isTarget && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">Target Acct</span>}
                </div>
                <div className="flex gap-2 text-gray-400">
                    {company.website && <a href={`//${company.website}`} target="_blank" rel="noreferrer" className="hover:text-orange-600" title="Website"><Globe size={14}/></a>}
                    {company.linkedIn && <a href={company.linkedIn} target="_blank" rel="noreferrer" className="hover:text-blue-800" title="LinkedIn"><Linkedin size={14}/></a>}
                </div>
            </div>
        </Card>
    );
};

// --- Main Companies Page ---
const CompaniesPage = ({ companies, user, quotes, contacts, commissioningReports, onOpenQuote, onOpenReport, onEditContact }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    
    // User GPS State
    const [userLocation, setUserLocation] = useState(null);

    const stats = useMemo(() => {
        const total = companies.length;
        const verified = companies.filter(c => c.isVerified).length;
        const targets = companies.filter(c => c.isTarget).length;
        const active = companies.filter(c => c.interactions && c.interactions.length > 0).length;
        return { total, verified, targets, active };
    }, [companies]);

    // --- Dedupe Logic ---
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    const handleScanForDuplicates = () => {
        const groups = {};
        companies.forEach(company => {
            const key = company.companyName.toLowerCase().trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(company);
        });
        const conflicts = Object.keys(groups).filter(key => groups[key].length > 1).map(key => ({ key, items: groups[key] }));
        if (conflicts.length === 0) alert("No duplicate company names found!");
        else { setDuplicateGroups(conflicts); setShowDuplicateModal(true); }
    };

    const handleResolveDuplicates = async (idsToDelete) => {
        if (!user || !user.uid) return;
        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => { batch.delete(doc(db, "users", user.uid, "companies", id)); });
            await batch.commit();
            alert(`Deleted ${idsToDelete.length} duplicates.`);
            setShowDuplicateModal(false);
        } catch (error) { console.error(error); alert("Failed to delete duplicates."); }
    };

    // --- Nearby Filter Logic (20km Radius) ---
    const handleNearMe = () => {
        if (activeFilter === 'NEARBY') {
            setActiveFilter('ALL');
            setUserLocation(null);
            return;
        }

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setActiveFilter('NEARBY');
            },
            (error) => {
                alert("Unable to retrieve location. Please allow GPS access.");
            }
        );
    };

    const handleSaveCompany = async (companyData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try { await addDoc(collection(db, "users", user.uid, "companies"), { ...companyData, createdAt: serverTimestamp() }); handleCloseModal(); } catch (e) { console.error(e); alert("Failed to save."); }
    };

    const handleUpdateCompany = async (companyData) => {
        if (!editingCompany) return;
        try { await setDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...companyData, lastModified: serverTimestamp() }, { merge: true }); handleCloseModal(); } catch (e) { console.error(e); alert("Failed to update."); }
    };
    
    const handleDeleteCompany = async (companyId) => {
        if (window.confirm("Permanently delete this company?")) {
            try { await deleteDoc(doc(db, "users", user.uid, "companies", companyId)); } catch (e) { alert("Failed to delete."); }
        }
    };

    const handleSave = (data) => editingCompany ? handleUpdateCompany(data) : handleSaveCompany(data);
    const handleOpenNewModal = () => { setEditingCompany(null); setShowModal(true); };
    const handleOpenEditModal = (c) => { setEditingCompany(c); setShowModal(true); };
    const handleCloseModal = () => { setEditingCompany(null); setShowModal(false); };
    const handleImportClick = () => fileInputRef.current.click();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: false, skipEmptyLines: true,
            complete: async (results) => {
                const allRows = results.data;
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(allRows.length, 10); i++) {
                    const row = allRows[i];
                    if (row.includes("Company") || row.includes("CompanyName") || row.includes("Company Name")) {
                        headerRowIndex = i; break;
                    }
                }
                if (headerRowIndex === -1) { alert("Error: Could not find 'Company' column."); setIsImporting(false); return; }
                
                const header = allRows[headerRowIndex];
                const dataRows = allRows.slice(headerRowIndex + 1);
                const findCol = (options) => header.findIndex(h => options.includes(h.trim()));
                
                const colName = findCol(["Company", "Company Name", "CompanyName", "CompanyFinal"]);
                const colWeb = findCol(["Website", "Web", "WebsiteGuess"]);
                const colInd = findCol(["Industry", "Sector"]);
                const colAddr = findCol(["Address", "Location"]);

                const batch = writeBatch(db);
                const companiesRef = collection(db, "users", user.uid, "companies");
                let importCount = 0;
                let duplicateCount = 0;
                const existingNames = new Set(companies.map(c => c.companyName.toLowerCase().trim()));

                dataRows.forEach(row => {
                    const name = colName !== -1 ? row[colName].trim() : '';
                    if (!name) return;
                    if (existingNames.has(name.toLowerCase())) { duplicateCount++; return; }

                    batch.set(doc(companiesRef), {
                        companyName: name,
                        website: colWeb !== -1 ? row[colWeb] : '',
                        industry: colInd !== -1 ? row[colInd] : '',
                        address: colAddr !== -1 ? row[colAddr] : '',
                        isVerified: false, isTarget: false, notes: '', interactions: [],
                        tier: 'STANDARD', // Default tier for imports
                        createdAt: serverTimestamp()
                    });
                    importCount++;
                });

                try { await batch.commit(); alert(`Import Complete!\n✅ Added: ${importCount}\n🚫 Skipped: ${duplicateCount}`); } catch (error) { console.error(error); alert("Import failed."); }
                setIsImporting(false);
                event.target.value = null;
            },
            error: () => { alert("Failed to parse CSV."); setIsImporting(false); }
        });
    };

    const filteredCompanies = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        let list = [...companies]; // Copy array to sort safely

        if (activeFilter === 'VERIFIED') list = list.filter(c => c.isVerified);
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'ACTIVE') list = list.filter(c => c.interactions && c.interactions.length > 0);
        
        // --- NEARBY FILTER (20km Limit) ---
        if (activeFilter === 'NEARBY' && userLocation) {
            const withDistance = list
                .filter(c => c.latitude && c.longitude)
                .map(c => ({
                    ...c,
                    distance: getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, c.latitude, c.longitude)
                }));
            list = withDistance.filter(c => c.distance <= 20).sort((a, b) => a.distance - b.distance);
        }

        return list.filter(c =>
            c.companyName.toLowerCase().includes(lowerSearchTerm) ||
            (c.industry && c.industry.toLowerCase().includes(lowerSearchTerm)) ||
            (c.address && c.address.toLowerCase().includes(lowerSearchTerm)) ||
            (c.tier && c.tier.toLowerCase().includes(lowerSearchTerm)) // <--- SEARCH BY TIER ADDED
        );
    }, [companies, searchTerm, activeFilter, userLocation]); 

    return (
        <div className="w-full">
            {showModal && <CompanyModal onSave={handleSave} onClose={handleCloseModal} companyToEdit={editingCompany} quotes={quotes} contacts={contacts} commissioningReports={commissioningReports} onOpenQuote={onOpenQuote} onOpenReport={onOpenReport} onEditContact={onEditContact} />}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatBadge icon={Building} label="Total Companies" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Navigation} label="Near Me (20km)" count={filteredCompanies.length} total={stats.total} color="orange" active={activeFilter === 'NEARBY'} onClick={handleNearMe} />
                <StatBadge icon={CheckSquare} label="Target Accts" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter(activeFilter === 'TARGETS' ? 'ALL' : 'TARGETS')} />
                <StatBadge icon={Clock} label="Active Logs" count={stats.active} total={stats.total} color="blue" active={activeFilter === 'ACTIVE'} onClick={() => setActiveFilter(activeFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')} />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Companies ({filteredCompanies.length})</h1>
                <div className="flex gap-2">
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate companies"><CheckSquare className="mr-2" size={16}/> Dedupe</Button>
                    <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}><Upload className="mr-2" size={16} /> {isImporting ? '...' : 'Import CSV'}</Button>
                    <Button onClick={handleOpenNewModal} variant="primary"><Plus className="mr-2" size={16} /> New Company</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />

            <div className="mb-4 relative">
                <Input type="text" placeholder="Search companies, address, or Pricing Tier (e.g. 'VIP', 'Dealer')..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map(company => (
                    <CompanyCard 
                        key={company.id} 
                        company={company} 
                        onEdit={handleOpenEditModal} 
                        onDelete={handleDeleteCompany} 
                        userLocation={userLocation} 
                    />
                ))}
            </div>
            {companies.length === 0 && <div className="text-center py-10"><Building size={48} className="mx-auto text-gray-400"/><p>No companies found.</p></div>}
        </div>
    );
};

export default CompaniesPage;
