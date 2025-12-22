import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Upload, Search, 
    CheckSquare, FileText, UserCheck, Mail, PlusCircle, 
    ExternalLink, Download, Send, Handshake, Map as MapIcon, Copy,
    Navigation, Target, Globe, User, Phone, Zap 
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// --- HELPER: Open Website ---
const openWebsite = (url) => {
    if (!url) return;
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
};

// --- Haversine Distance Calculator ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

// --- 1. StatBadge Component ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div 
            onClick={onClick} 
            className={`cursor-pointer flex-1 min-w-[200px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                active 
                    ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` 
                    : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
            }`}
        >
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon size={20} />
            </div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
                </p>
            </div>
        </div>
    );
};

// --- 1B. Proximity Search Panel ---
const ProximitySearch = ({ companies, onSelectCompany, onClose }) => {
    const [currentLat, setCurrentLat] = useState('');
    const [currentLon, setCurrentLon] = useState('');
    const [radiusKm, setRadiusKm] = useState(50);
    const [isLocating, setIsLocating] = useState(false);
    const [nearbyResults, setNearbyResults] = useState([]);

    const getCurrentLocation = () => {
        setIsLocating(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLat(position.coords.latitude.toFixed(6));
                    setCurrentLon(position.coords.longitude.toFixed(6));
                    setIsLocating(false);
                },
                (error) => {
                    alert("Unable to get location: " + error.message);
                    setIsLocating(false);
                }
            );
        } else {
            alert("Geolocation not supported by your browser");
            setIsLocating(false);
        }
    };

    const findNearby = () => {
        if (!currentLat || !currentLon) {
            alert("Please set your current location first");
            return;
        }

        const lat = parseFloat(currentLat);
        const lon = parseFloat(currentLon);
        
        const companiesWithGPS = companies.filter(c => c.latitude && c.longitude);
        const results = companiesWithGPS.map(c => ({
            ...c,
            distance: calculateDistance(lat, lon, parseFloat(c.latitude), parseFloat(c.longitude))
        }))
        .filter(c => c.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

        setNearbyResults(results);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl bg-white rounded-3xl">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Nearby Companies</h2>
                            <p className="text-xs font-bold text-indigo-100 mt-1">Find accounts near your location</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-500">Your Current Location</span>
                            <Button onClick={getCurrentLocation} variant="secondary" disabled={isLocating} className="!py-1.5 !px-3 text-xs">
                                <Navigation size={14} className="mr-1" />
                                {isLocating ? 'Locating...' : 'Use GPS'}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Latitude" value={currentLat} onChange={e => setCurrentLat(e.target.value)} className="bg-white"/>
                            <Input placeholder="Longitude" value={currentLon} onChange={e => setCurrentLon(e.target.value)} className="bg-white"/>
                        </div>
                    </div>

                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">Search Radius</span>
                            <span className="text-2xl font-black text-orange-600">{radiusKm} km</span>
                        </div>
                        <input type="range" min="5" max="200" step="5" value={radiusKm} onChange={e => setRadiusKm(parseInt(e.target.value))} className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"/>
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                            <span>5 km</span>
                            <span>200 km</span>
                        </div>
                    </div>

                    <Button onClick={findNearby} variant="primary" className="w-full !py-3">
                        <Target size={18} className="mr-2" />
                        Find Companies Within {radiusKm} km
                    </Button>
                </div>

                {nearbyResults.length > 0 && (
                    <div className="flex-1 overflow-y-auto border-t bg-slate-50 p-6">
                        <h3 className="text-sm font-black uppercase text-gray-500 mb-4">Found {nearbyResults.length} Companies</h3>
                        <div className="space-y-3">
                            {nearbyResults.map(company => (
                                <div key={company.id} onClick={() => onSelectCompany(company)} className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-indigo-400 cursor-pointer transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-black text-gray-800 uppercase text-sm">{company.companyName}</h4>
                                            <p className="text-[10px] font-bold text-orange-600 uppercase">{company.industry || 'Account'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-indigo-600">{company.distance.toFixed(1)} km</div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">Away</p>
                                        </div>
                                    </div>
                                    {company.address && <p className="text-xs text-gray-500 font-bold mb-2">{company.address}</p>}
                                    <div className="flex gap-2 pt-2 border-t">
                                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${company.latitude},${company.longitude}`, '_blank'); }} className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                            <MapIcon size={12} /> Navigate
                                        </button>
                                        {company.isCustomer && <span className="text-[10px] font-black uppercase px-2 py-1 bg-teal-50 text-teal-600 rounded-lg"><Handshake size={12} className="inline mr-1" /> Customer</span>}
                                        {company.isTarget && <span className="text-[10px] font-black uppercase px-2 py-1 bg-purple-50 text-purple-600 rounded-lg"><Target size={12} className="inline mr-1" /> Target</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {nearbyResults.length === 0 && currentLat && currentLon && (
                    <div className="p-12 text-center text-gray-400">
                        <Navigation size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">Click "Find Companies" to search nearby accounts</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

// --- 2. Company Modal Component ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], contacts = [], onOpenQuote, existingCompanies = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    
    // GPS FIELDS
    const [latitude, setLatitude] = useState(companyToEdit?.latitude || '');
    const [longitude, setLongitude] = useState(companyToEdit?.longitude || '');
    
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);
    const [isCustomer, setIsCustomer] = useState(companyToEdit?.isCustomer || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    const isDuplicate = useMemo(() => {
        if (companyToEdit) return false;
        return existingCompanies.some(c => c.companyName.toLowerCase().trim() === companyName.toLowerCase().trim());
    }, [companyName, existingCompanies, companyToEdit]);

    const targetName = (companyName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    const relatedContacts = useMemo(() => {
        if (!contacts || !companyToEdit) return [];
        return contacts.filter(c => c.companyId === companyToEdit.id || (c.companyName && c.companyName.toLowerCase().trim() === targetName));
    }, [contacts, companyToEdit, targetName]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        let linkedQuote = null;
        if (selectedQuoteId) {
            linkedQuote = relevantQuotes.find(rq => rq.id === selectedQuoteId);
        }
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome, linkedQuote };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    const openInGoogleMaps = () => {
        if (latitude && longitude) {
            window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-3xl p-0">
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 space-y-6">
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">{companyToEdit ? 'Edit Account' : 'New Account'}</h2>
                    {isDuplicate && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-3 text-red-600 animate-pulse">
                            <Copy size={18} />
                            <p className="text-xs font-black uppercase">Company already exists in directory.</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Tier</label>
                                <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-black uppercase text-xs">
                                    {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                        <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                            </div>
                            {website && (
                                <Button onClick={() => openWebsite(website)} variant="secondary" className="h-[46px] w-[46px] !p-0 flex items-center justify-center bg-blue-50 text-blue-600 border-blue-200" title="Open Website">
                                    <ExternalLink size={20} />
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                                    <span>GPS Site Location</span>
                                    {(latitude || longitude || address) && (
                                        <button onClick={openInGoogleMaps} type="button" className="text-blue-600 hover:underline flex items-center gap-1">VIEW ON MAP <ExternalLink size={10}/></button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} className="bg-white" />
                                    <Input placeholder="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} className="bg-white" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                            <Checkbox label="Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                            <Checkbox label="Intro Emailed" checked={isEmailed} onChange={e => setIsEmailed(e.target.checked)} />
                            <Checkbox label="Target Account" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                            <Checkbox label={<span className="text-teal-700 font-bold">Existing Customer</span>} checked={isCustomer} onChange={e => setIsCustomer(e.target.checked)} />
                        </div>
                        <Textarea label="Internal Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Quotes ({relevantQuotes.length})</button>
                        <button onClick={() => setActiveTab('PEOPLE')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PEOPLE' ? 'text-teal-600 border-b-4 border-teal-600' : 'text-gray-400'}`}>People ({relatedContacts.length})</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded-xl p-2 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option>
                                            <option value="Visit">Site Visit</option>
                                            <option value="Email">Email</option>
                                        </select>
                                    </div>
                                    {relevantQuotes.length > 0 && (
                                        <select value={selectedQuoteId} onChange={e => setSelectedQuoteId(e.target.value)} className="w-full text-[10px] border p-2 rounded-xl font-bold uppercase bg-white">
                                            <option value="">Attach Quote Link (Optional)</option>
                                            {relevantQuotes.map(q => (<option key={q.id} value={q.id}>{q.id} - ${q.finalSalesPrice?.toLocaleString()}</option>))}
                                        </select>
                                    )}
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2.5 border rounded-xl" />
                                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-2xl border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : log.type === 'Email' ? 'bg-purple-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        {log.linkedQuote && (
                                            <button type="button" onClick={() => onOpenQuote(log.linkedQuote)} className="mt-2 flex items-center gap-1.5 text-blue-600 bg-blue-50 p-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all">
                                                <FileText size={12}/>
                                                <span className="text-[9px] font-black uppercase">Ref: {log.linkedQuote.id}</span>
                                                <ExternalLink size={10}/>
                                            </button>
                                        )}
                                        <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'DATA' && (
                            <div className="space-y-2">
                                {relevantQuotes.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm font-bold py-8">No quotes found for this company</p>
                                ) : (
                                    relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center p-4 border rounded-2xl bg-white hover:border-orange-500 cursor-pointer group transition-all">
                                            <span className="font-black text-xs text-gray-800">{q.id}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-600 font-black">${q.finalSalesPrice?.toLocaleString()}</span>
                                                <ExternalLink size={12} className="text-gray-300 group-hover:text-orange-500"/>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'PEOPLE' && (
                            <div className="space-y-3">
                                {relatedContacts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <User size={48} className="mx-auto text-gray-200 mb-2"/>
                                        <p className="text-gray-400 text-sm font-bold">No contacts linked yet.</p>
                                        <p className="text-[10px] text-gray-400">Add contacts via the Contacts tab and search for "{companyName}".</p>
                                    </div>
                                ) : (
                                    relatedContacts.map(c => (
                                        <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{c.firstName} {c.lastName}</h4>
                                                    <p className="text-xs text-teal-600 font-bold uppercase">{c.jobTitle || 'No Title'}</p>
                                                </div>
                                                {c.phone && <a href={`tel:${c.phone}`} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Phone size={14} /></a>}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500"><Mail size={12} /><span>{c.email || 'No Email'}</span></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 bg-white border-t flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, website, industry, address, latitude, longitude, tier, isVerified, isTarget, isEmailed, isCustomer, notes, interactions })} variant="primary" disabled={isDuplicate && !companyToEdit}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Component ---
const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [], onOpenQuote }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [showProximitySearch, setShowProximitySearch] = useState(false);
    const fileInputRef = useRef(null);

    const activeCompanies = useMemo(() => (companies || []).filter(c => !c.isDeleted), [companies]);

    const stats = useMemo(() => ({
        total: activeCompanies.length,
        targets: activeCompanies.filter(c => c.isTarget).length,
        customers: activeCompanies.filter(c => c.isCustomer).length,
        esco: activeCompanies.filter(c => (c.notes || '').includes('ESCO')).length, // ADDED ESCO STAT
    }), [activeCompanies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = activeCompanies.filter(c => 
            c.companyName.toLowerCase().includes(term) || 
            (c.industry || '').toLowerCase().includes(term) || 
            (c.notes || '').toLowerCase().includes(term)
        );
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'CUSTOMERS') list = list.filter(c => c.isCustomer);
        if (activeFilter === 'ESCO') list = list.filter(c => (c.notes || '').includes('ESCO')); // ADDED ESCO FILTER
        return list;
    }, [activeCompanies, searchTerm, activeFilter]);

    const checkHasQuotes = (compName) => quotes.some(q => (q.customer?.name || '').toLowerCase().includes(compName?.toLowerCase().trim()));

    const handleBulkExport = () => {
        const selected = activeCompanies.filter(c => selectedIds.has(c.id));
        const csv = Papa.unparse(selected.map(c => ({
            "Company": c.companyName,
            "Industry": c.industry || '',
            "Website": c.website || '',
            "Address": c.address || '',
            "Latitude": c.latitude || '',
            "Longitude": c.longitude || '',
            "Tier": c.tier || 'STANDARD',
            "IsCustomer": c.isCustomer ? 'Yes' : 'No',
            "IsTarget": c.isTarget ? 'Yes' : 'No',
            "IsVerified": c.isVerified ? 'Yes' : 'No'
        })));
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: 'text/csv' })));
        link.setAttribute("download", `karnot_companies_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkEmail = () => {
        const emails = activeCompanies.filter(c => selectedIds.has(c.id) && c.website).map(c => c.companyName);
        alert(`BCC Email function ready for ${emails.length} companies.`);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Move ${selectedIds.size} accounts to Trash?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.update(doc(db, "users", user.uid, "companies", id), { isDeleted: true }));
        await batch.commit();
        setSelectedIds(new Set());
    };

    // --- ENHANCED CSV IMPORT (FIXED FOR ESCO FILE) ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                let addedCount = 0;
                let skippedCount = 0;
                
                const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                const existingNames = new Set(activeCompanies.map(c => normalize(c.companyName)));
                
                results.data.forEach(row => {
                    // MAPPING FIX: Handle "Company Name" explicitly for ESCO files
                    const name = row['Company'] || row['CompanyName'] || row['Company Name']; 
                    if (!name) return;

                    const normalizeName = normalize(name);
                    if (existingNames.has(normalizeName)) {
                        skippedCount++;
                        return;
                    }

                    // AUTO-TAGGING ESCO
                    let industry = row['Industry'] || '';
                    let notes = '';
                    
                    // Detect ESCO file by unique columns
                    if (row['Classification'] || row['Name of Representative']) {
                        industry = 'ESCO';
                        notes = `Imported from ESCO List. Classification: ${row['Classification'] || 'N/A'}`;
                    }

                    const ref = doc(collection(db, "users", user.uid, "companies"));
                    batch.set(ref, {
                        companyName: name, 
                        industry: industry,
                        address: row['Address'] || row['Company Address'] || '', // Mapped Address
                        website: row['Website'] || '',
                        latitude: row['Latitude'] || '',
                        longitude: row['Longitude'] || '',
                        tier: row['Tier'] || 'STANDARD',
                        isCustomer: false, 
                        isTarget: true, // Default to Target for imported leads
                        isVerified: false,
                        isEmailed: false,
                        interactions: [],
                        notes: notes, // Populated notes for search
                        createdAt: serverTimestamp()
                    });
                    
                    existingNames.add(normalizeName);
                    addedCount++;
                });
                
                if (addedCount > 0) await batch.commit();
                
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                alert(`Import Complete!\n✅ Added: ${addedCount}\n⛔ Skipped (duplicates): ${skippedCount}`);
            },
            error: (error) => {
                console.error("CSV Error:", error);
                setIsImporting(false);
                alert("Error reading CSV file.");
            }
        });
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSave = async (data) => {
        if (!user) return;
        if (editingCompany) {
            await updateDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false);
        setEditingCompany(null);
    };

    return (
        <div className="w-full space-y-6">
            {showModal && <CompanyModal onClose={() => { setShowModal(false); setEditingCompany(null); }} onSave={handleSave} companyToEdit={editingCompany} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} existingCompanies={activeCompanies} />}
            {showProximitySearch && <ProximitySearch companies={activeCompanies} onSelectCompany={(company) => { setEditingCompany(company); setShowProximitySearch(false); setShowModal(true); }} onClose={() => setShowProximitySearch(false)} />}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBadge icon={Building} label="Total Directory" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Handshake} label="Existing Customers" count={stats.customers} total={stats.total} color="teal" active={activeFilter === 'CUSTOMERS'} onClick={() => setActiveFilter('CUSTOMERS')} />
                <StatBadge icon={CheckSquare} label="Targets" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
                <StatBadge icon={Zap} label="ESCO Projects" count={stats.esco} total={stats.total} color="yellow" active={activeFilter === 'ESCO'} onClick={() => setActiveFilter('ESCO')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Directory ({filtered.length}) <button onClick={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))} className="text-xs font-bold text-orange-600 underline ml-2">{selectedIds.size === filtered.length ? 'Deselect' : 'Select'} All</button></h2>
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <Button onClick={() => setShowProximitySearch(true)} variant="secondary" className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"><Navigation size={16} className="mr-1"/> Nearby</Button>
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> {isImporting ? 'Importing...' : 'Import CSV'}</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus size={16} className="mr-1"/> New Account</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative">
                <Input placeholder="Search accounts, sector, or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className={`p-5 rounded-2xl border-gray-100 hover:border-orange-400 transition-all bg-white relative ${selectedIds.has(c.id) ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50' : ''}`}>
                        <div className="absolute top-4 left-4 z-10">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer" />
                        </div>
                        <div className="pl-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight">{c.companyName}</h4>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{c.industry || 'Account'}</p>
                                </div>
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-2 text-gray-300 hover:text-indigo-600"><Edit size={16}/></button>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <Button onClick={() => { setEditingCompany(c); setShowModal(true); }} variant="secondary" className="flex-1 !py-2 text-[9px] font-black uppercase tracking-widest">View History</Button>
                                {c.website && <button onClick={() => openWebsite(c.website)} className="px-3 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-blue-600 transition-all" title="Visit Website"><Globe size={16}/></button>}
                                {c.latitude && c.longitude && <button onClick={() => window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, '_blank')} className="px-3 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 text-orange-600 transition-all" title="Open in Google Maps"><MapIcon size={16}/></button>}
                            </div>
                        </div>
                        <div className="pt-3 border-t grid grid-cols-4 gap-1 text-[8px] text-gray-500 text-center font-black">
                            <div className={`p-1 rounded uppercase ${c.isCustomer ? 'bg-teal-50 text-teal-700' : ''}`}><Handshake size={14} className={`mx-auto mb-1 ${c.isCustomer ? 'text-teal-600' : 'text-gray-300'}`}/> Customer</div>
                            <div className={`p-1 rounded uppercase ${checkHasQuotes(c.companyName) ? 'bg-orange-50 text-orange-700' : ''}`}><CheckSquare size={14} className={`mx-auto mb-1 ${checkHasQuotes(c.companyName) ? 'text-orange-600' : 'text-gray-300'}`}/> Quoted</div>
                            <div className={`p-1 rounded uppercase ${c.isEmailed ? 'bg-purple-50 text-purple-700' : ''}`}><Mail size={14} className={`mx-auto mb-1 ${c.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed</div>
                            <div className={`p-1 rounded uppercase ${c.isVerified ? 'bg-green-50 text-green-700' : ''}`}><UserCheck size={14} className={`mx-auto mb-1 ${c.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified</div>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                    <button onClick={handleBulkEmail} className="flex items-center gap-2 hover:text-orange-400 transition-colors"><Send size={18} /><span className="text-sm font-bold">Email</span></button>
                    <button onClick={handleBulkExport} className="flex items-center gap-2 hover:text-green-400 transition-colors"><Download size={18} /><span className="text-sm font-bold">Export</span></button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors"><Trash2 size={18} /><span className="text-sm font-bold">Delete</span></button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white"><X size={18}/></button>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
