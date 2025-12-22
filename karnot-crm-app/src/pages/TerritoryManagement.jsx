import React, { useState, useMemo } from ‘react’;
import { db } from ‘../firebase’;
import { collection, addDoc, updateDoc, doc, serverTimestamp, writeBatch } from ‘firebase/firestore’;
import {
MapPin, Users, Phone, Calendar, Target, Award, TrendingUp,
Edit, Trash2, Plus, User, Mail, Building, Navigation, CheckCircle, Clock, X
} from ‘lucide-react’;
import { Card, Button, Input, Textarea } from ‘../data/constants.jsx’;

// — Haversine Distance Calculator —
const calculateDistance = (lat1, lon1, lat2, lon2) => {
const R = 6371; // Earth’s radius in kilometers
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLon = (lon2 - lon1) * Math.PI / 180;
const a =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
Math.sin(dLon / 2) * Math.sin(dLon / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
return R * c; // Distance in kilometers
};

// — Territory Badge Component —
const TerritoryBadge = ({ territory, isSelected, onClick, stats }) => {
const statusColor = territory.agentId ? ‘green’ : ‘orange’;

```
return (
    <div
        onClick={onClick}
        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${
            isSelected 
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300' 
                : 'border-gray-200 bg-white hover:border-indigo-300'
        }`}
    >
        <div className="flex justify-between items-start mb-3">
            <div>
                <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight">
                    {territory.name}
                </h4>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {territory.province || 'Territory'}
                </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                territory.agentId 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
            }`}>
                {territory.agentId ? 'Assigned' : 'Open'}
            </span>
        </div>

        {territory.agentId && territory.agentName && (
            <div className="flex items-center gap-2 mb-2 text-sm">
                <User size={14} className="text-indigo-600" />
                <span className="font-bold text-gray-700">{territory.agentName}</span>
            </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center">
            <div>
                <p className="text-xl font-black text-gray-800">{stats?.companies || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Accounts</p>
            </div>
            <div>
                <p className="text-xl font-black text-teal-600">{stats?.customers || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Customers</p>
            </div>
            <div>
                <p className="text-xl font-black text-purple-600">{stats?.targets || 0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Targets</p>
            </div>
        </div>
    </div>
);
```

};

// — Agent Assignment Modal —
const AgentModal = ({ territory, agents = [], onClose, onSave, companies = [], appointments = [] }) => {
const [selectedAgentId, setSelectedAgentId] = useState(territory?.agentId || ‘’);
const [commission, setCommission] = useState(territory?.commission || 15);
const [exclusivityRadius, setExclusivityRadius] = useState(territory?.exclusivityRadius || 20);
const [notes, setNotes] = useState(territory?.notes || ‘’);

```
const selectedAgent = agents.find(a => a.id === selectedAgentId);

// Get companies in this territory
const companiesInTerritory = useMemo(() => {
    if (!territory.centerLat || !territory.centerLon) return [];
    return (companies || []).filter(c => {
        if (!c.latitude || !c.longitude) return false;
        const distance = calculateDistance(
            territory.centerLat,
            territory.centerLon,
            parseFloat(c.latitude),
            parseFloat(c.longitude)
        );
        return distance <= territory.radius;
    });
}, [territory, companies]);

// Get upcoming appointments in this territory
const upcomingAppointments = useMemo(() => {
    const companyIds = companiesInTerritory.map(c => c.id);
    return (appointments || [])
        .filter(apt => 
            companyIds.includes(apt.companyId) && 
            apt.status !== 'Completed' && 
            apt.status !== 'Cancelled' &&
            new Date(apt.appointmentDate) >= new Date()
        )
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
        .slice(0, 5); // Show next 5 appointments
}, [appointments, companiesInTerritory]);

return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <Card className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                    Assign Agent: {territory.name}
                </h2>
                <p className="text-xs font-bold text-indigo-100 mt-1">
                    {territory.province} • {exclusivityRadius}km Exclusive Zone
                </p>
            </div>

            <div className="p-6 space-y-4">
                {/* Agent Selection */}
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                        Select Agent/Partner
                    </label>
                    <select
                        value={selectedAgentId}
                        onChange={e => setSelectedAgentId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                    >
                        <option value="">-- Unassigned (Open Territory) --</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name} - {agent.type} ({agent.phone})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Agent Details Preview */}
                {selectedAgent && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Type</p>
                                <p className="font-black text-indigo-700">{selectedAgent.type}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Phone</p>
                                <p className="font-bold text-gray-700">{selectedAgent.phone}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Email</p>
                                <p className="font-bold text-gray-700">{selectedAgent.email}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Status</p>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    selectedAgent.status === 'Active' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {selectedAgent.status}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Commission Rate */}
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500">Commission Rate</span>
                        <span className="text-2xl font-black text-orange-600">{commission}%</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={commission}
                        onChange={e => setCommission(parseInt(e.target.value))}
                        className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                        <span>5%</span>
                        <span>30%</span>
                    </div>
                </div>

                {/* Exclusivity Radius */}
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500">Exclusivity Zone</span>
                        <span className="text-2xl font-black text-purple-600">{exclusivityRadius} km</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={exclusivityRadius}
                        onChange={e => setExclusivityRadius(parseInt(e.target.value))}
                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                        <span>10 km</span>
                        <span>50 km</span>
                    </div>
                </div>

                {/* Territory Notes */}
                <Textarea
                    label="Territory Notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows="3"
                    placeholder="Special conditions, key accounts, market intel..."
                />

                {/* Upcoming Appointments in Territory (NEW) */}
                {upcomingAppointments.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                        <p className="text-[10px] font-black uppercase text-blue-700 mb-3">
                            📅 Upcoming Appointments ({upcomingAppointments.length})
                        </p>
                        <div className="space-y-2">
                            {upcomingAppointments.map(apt => (
                                <div key={apt.id} className="bg-white p-3 rounded-xl border border-blue-100 text-xs">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-black text-gray-800">{apt.companyName}</span>
                                        <span className="text-[9px] text-gray-400 font-bold">
                                            {new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 font-bold">{apt.purpose}</p>
                                    {apt.agentName && (
                                        <p className="text-[10px] text-indigo-600 font-bold mt-1">→ {apt.agentName}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                <Button onClick={onClose} variant="secondary">Cancel</Button>
                <Button
                    onClick={() => onSave({
                        agentId: selectedAgentId || null,
                        agentName: selectedAgent?.name || null,
                        commission,
                        exclusivityRadius,
                        notes
                    })}
                    variant="primary"
                >
                    Save Assignment
                </Button>
            </div>
        </Card>
    </div>
);
```

};

// — Create Territory Modal —
const TerritoryCreateModal = ({ onClose, onSave, existingTerritories = [] }) => {
const [name, setName] = useState(’’);
const [province, setProvince] = useState(’’);
const [centerLat, setCenterLat] = useState(’’);
const [centerLon, setCenterLon] = useState(’’);
const [radius, setRadius] = useState(20);
const [description, setDescription] = useState(’’);

```
const provinces = [
    'Metro Manila', 'Cavite', 'Laguna', 'Batangas', 'Rizal', 'Bulacan', 
    'Pampanga', 'Cebu', 'Davao', 'Iloilo', 'Negros Occidental', 'Baguio'
];

return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <Card className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Create New Territory</h2>
                <p className="text-xs font-bold text-green-100 mt-1">Define a 20km exclusive distribution zone</p>
            </div>

            <div className="p-6 space-y-4">
                <Input
                    label="Territory Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Manila North, Cebu City Central"
                />

                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Province/Region</label>
                    <select
                        value={province}
                        onChange={e => setProvince(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                    >
                        <option value="">Select Province</option>
                        {provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-[10px] font-black text-slate-500 uppercase">Territory Center Point (GPS)</div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            placeholder="Latitude"
                            value={centerLat}
                            onChange={e => setCenterLat(e.target.value)}
                            className="bg-white"
                        />
                        <Input
                            placeholder="Longitude"
                            value={centerLon}
                            onChange={e => setCenterLon(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500">Territory Radius</span>
                        <span className="text-2xl font-black text-purple-600">{radius} km</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={radius}
                        onChange={e => setRadius(parseInt(e.target.value))}
                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                </div>

                <Textarea
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows="2"
                    placeholder="Key landmarks, coverage areas..."
                />
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                <Button onClick={onClose} variant="secondary">Cancel</Button>
                <Button
                    onClick={() => onSave({
                        name,
                        province,
                        centerLat: centerLat ? parseFloat(centerLat) : null,
                        centerLon: centerLon ? parseFloat(centerLon) : null,
                        radius,
                        description,
                        agentId: null,
                        agentName: null,
                        commission: 15,
                        exclusivityRadius: 20,
                        status: 'Active'
                    })}
                    variant="primary"
                    disabled={!name || !province}
                >
                    Create Territory
                </Button>
            </div>
        </Card>
    </div>
);
```

};

// — Main Territory Management Component —
const TerritoryManagement = ({ territories = [], agents = [], companies = [], user, appointments = [] }) => {
const [selectedTerritory, setSelectedTerritory] = useState(null);
const [showAgentModal, setShowAgentModal] = useState(false);
const [showCreateModal, setShowCreateModal] = useState(false);
const [viewMode, setViewMode] = useState(‘grid’); // grid or map

```
// Calculate stats for each territory
const territoryStats = useMemo(() => {
    const stats = {};
    territories.forEach(territory => {
        if (territory.centerLat && territory.centerLon) {
            const companiesInTerritory = companies.filter(c => {
                if (!c.latitude || !c.longitude) return false;
                const distance = calculateDistance(
                    territory.centerLat,
                    territory.centerLon,
                    parseFloat(c.latitude),
                    parseFloat(c.longitude)
                );
                return distance <= territory.radius;
            });

            stats[territory.id] = {
                companies: companiesInTerritory.length,
                customers: companiesInTerritory.filter(c => c.isCustomer).length,
                targets: companiesInTerritory.filter(c => c.isTarget).length
            };
        } else {
            stats[territory.id] = { companies: 0, customers: 0, targets: 0 };
        }
    });
    return stats;
}, [territories, companies]);

const handleAssignAgent = async (data) => {
    if (!user || !selectedTerritory) return;
    await updateDoc(
        doc(db, "users", user.uid, "territories", selectedTerritory.id),
        { ...data, lastModified: serverTimestamp() }
    );
    setShowAgentModal(false);
    setSelectedTerritory(null);
};

const handleCreateTerritory = async (data) => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "territories"), {
        ...data,
        createdAt: serverTimestamp()
    });
    setShowCreateModal(false);
};

const assignedCount = territories.filter(t => t.agentId).length;
const openCount = territories.filter(t => !t.agentId).length;
const totalCompaniesInTerritories = Object.values(territoryStats).reduce((sum, s) => sum + s.companies, 0);

return (
    <div className="w-full space-y-6">
        {/* Modals */}
        {showAgentModal && selectedTerritory && (
            <AgentModal
                territory={selectedTerritory}
                agents={agents}
                companies={companies}
                appointments={appointments}
                onClose={() => {
                    setShowAgentModal(false);
                    setSelectedTerritory(null);
                }}
                onSave={handleAssignAgent}
            />
        )}

        {showCreateModal && (
            <TerritoryCreateModal
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateTerritory}
                existingTerritories={territories}
            />
        )}

        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <MapPin className="text-indigo-600 mb-2" size={24} />
                <p className="text-3xl font-black text-gray-800">{territories.length}</p>
                <p className="text-[10px] font-black uppercase text-gray-500">Total Territories</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
                <CheckCircle className="text-green-600 mb-2" size={24} />
                <p className="text-3xl font-black text-gray-800">{assignedCount}</p>
                <p className="text-[10px] font-black uppercase text-gray-500">Assigned</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <Clock className="text-orange-600 mb-2" size={24} />
                <p className="text-3xl font-black text-gray-800">{openCount}</p>
                <p className="text-[10px] font-black uppercase text-gray-500">Open Zones</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <Building className="text-blue-600 mb-2" size={24} />
                <p className="text-3xl font-black text-gray-800">{totalCompaniesInTerritories}</p>
                <p className="text-[10px] font-black uppercase text-gray-500">Accounts Mapped</p>
            </Card>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                Territory Management
            </h2>
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
                <Plus size={16} className="mr-1" />
                New Territory
            </Button>
        </div>

        {/* Territory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {territories.map(territory => (
                <TerritoryBadge
                    key={territory.id}
                    territory={territory}
                    isSelected={selectedTerritory?.id === territory.id}
                    onClick={() => {
                        setSelectedTerritory(territory);
                        setShowAgentModal(true);
                    }}
                    stats={territoryStats[territory.id]}
                />
            ))}
        </div>

        {territories.length === 0 && (
            <Card className="p-12 text-center">
                <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-black text-gray-400 uppercase mb-2">No Territories Defined</h3>
                <p className="text-sm text-gray-500 mb-4">Start by creating your first 20km distribution zone</p>
                <Button onClick={() => setShowCreateModal(true)} variant="primary">
                    Create First Territory
                </Button>
            </Card>
        )}
    </div>
);
```

};

export default TerritoryManagement;

