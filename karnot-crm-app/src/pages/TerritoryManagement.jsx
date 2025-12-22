import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
    MapPin, Users, Phone, Calendar, Target, Award, TrendingUp,
    Edit, Trash2, Plus, User, Mail, Building, Navigation, CheckCircle, Clock, X
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// Haversine Distance Calculator
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

// Territory Badge Component
const TerritoryBadge = ({ territory, isSelected, onClick, stats }) => {
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
};

// Agent Assignment Modal
const AgentModal = ({ territory, agents = [], onClose, onSave, companies = [], appointments = [] }) => {
    const [selectedAgentId, setSelectedAgentId] = useState(territory?.agentId || '');
    const [commission, setCommission] = useState(territory?.commission || 15);
    const [exclusivityRadius, setExclusivityRadius] = useState(territory?.exclusivityRadius || 20);
    const [notes, setNotes] = useState(territory?.notes || '');

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
            .slice(0, 5);
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

                    <Textarea
                        label="Territory Notes"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows="3"
                        placeholder="Special conditions, key accounts, market intel..."
                    />

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
};

// Create Territory Modal
const TerritoryCreateModal = ({ onClose, onSave, existingTerritories = [] }) => {
    const [name, setName] = useState('');
    const [province, setProvince] = useState('');
    const [centerLat, setCenterLat] = useState('');
    const [centerLon, setCenterLon] = useState('');
    const [radius, setRadius] = useState(20);
    const [description, setDescription] = useState('');

    const provinces = [
        // NCR - National Capital Region
        { region: 'NCR', name: 'Metro Manila - Makati CBD' },
        { region: 'NCR', name: 'Metro Manila - BGC (Taguig)' },
        { region: 'NCR', name: 'Metro Manila - Ortigas Center (Pasig)' },
        { region: 'NCR', name: 'Metro Manila - Eastwood/Libis (QC)' },
        { region: 'NCR', name: 'Metro Manila - Quezon City North' },
        { region: 'NCR', name: 'Metro Manila - Quezon City South' },
        { region: 'NCR', name: 'Metro Manila - Manila Downtown' },
        { region: 'NCR', name: 'Metro Manila - Binondo/Chinatown' },
        { region: 'NCR', name: 'Metro Manila - Ermita/Malate' },
        { region: 'NCR', name: 'Metro Manila - Mandaluyong/Shaw' },
        { region: 'NCR', name: 'Metro Manila - San Juan' },
        { region: 'NCR', name: 'Metro Manila - Pasay/MOA Area' },
        { region: 'NCR', name: 'Metro Manila - Paranaque/BF Homes' },
        { region: 'NCR', name: 'Metro Manila - Las Pinas/Zapote' },
        { region: 'NCR', name: 'Metro Manila - Muntinlupa/Alabang' },
        { region: 'NCR', name: 'Metro Manila - Caloocan North' },
        { region: 'NCR', name: 'Metro Manila - Caloocan South' },
        { region: 'NCR', name: 'Metro Manila - Malabon' },
        { region: 'NCR', name: 'Metro Manila - Navotas' },
        { region: 'NCR', name: 'Metro Manila - Valenzuela' },
        { region: 'NCR', name: 'Metro Manila - Marikina' },
        { region: 'NCR', name: 'Metro Manila - Pateros' },
        
        // Region I - Ilocos Region
        { region: 'Region I', name: 'Ilocos Norte - Laoag City' },
        { region: 'Region I', name: 'Ilocos Norte - Batac' },
        { region: 'Region I', name: 'Ilocos Sur - Vigan City' },
        { region: 'Region I', name: 'Ilocos Sur - Candon City' },
        { region: 'Region I', name: 'La Union - San Fernando' },
        { region: 'Region I', name: 'La Union - Bauang' },
        { region: 'Region I', name: 'La Union - San Juan (Surf Capital)' },
        { region: 'Region I', name: 'Pangasinan - Dagupan City' },
        { region: 'Region I', name: 'Pangasinan - Urdaneta City' },
        { region: 'Region I', name: 'Pangasinan - San Carlos City' },
        { region: 'Region I', name: 'Pangasinan - Alaminos (Hundred Islands)' },
        { region: 'Region I', name: 'Pangasinan - Lingayen' },
        
        // Region II - Cagayan Valley
        { region: 'Region II', name: 'Cagayan - Tuguegarao City' },
        { region: 'Region II', name: 'Isabela - Ilagan City' },
        { region: 'Region II', name: 'Isabela - Santiago City' },
        { region: 'Region II', name: 'Isabela - Cauayan City' },
        { region: 'Region II', name: 'Nueva Vizcaya - Bayombong' },
        { region: 'Region II', name: 'Quirino - Cabarroguis' },
        { region: 'Region II', name: 'Batanes - Basco' },
        
        // Region III - Central Luzon
        { region: 'Region III', name: 'Bulacan - Malolos City' },
        { region: 'Region III', name: 'Bulacan - San Jose del Monte City' },
        { region: 'Region III', name: 'Bulacan - Meycauayan City' },
        { region: 'Region III', name: 'Bulacan - Marilao' },
        { region: 'Region III', name: 'Bulacan - Bocaue' },
        { region: 'Region III', name: 'Nueva Ecija - Cabanatuan City' },
        { region: 'Region III', name: 'Nueva Ecija - Gapan City' },
        { region: 'Region III', name: 'Nueva Ecija - San Jose City' },
        { region: 'Region III', name: 'Pampanga - Angeles City' },
        { region: 'Region III', name: 'Pampanga - San Fernando City' },
        { region: 'Region III', name: 'Pampanga - Mabalacat City (Clark Freeport)' },
        { region: 'Region III', name: 'Tarlac - Tarlac City' },
        { region: 'Region III', name: 'Zambales - Olongapo City' },
        { region: 'Region III', name: 'Zambales - Subic Bay Freeport' },
        { region: 'Region III', name: 'Zambales - Iba' },
        { region: 'Region III', name: 'Bataan - Balanga City' },
        { region: 'Region III', name: 'Bataan - Mariveles (BEPZ)' },
        { region: 'Region III', name: 'Aurora - Baler' },
        
        // Region IV-A - CALABARZON
        { region: 'CALABARZON', name: 'Cavite - Bacoor City' },
        { region: 'CALABARZON', name: 'Cavite - Imus City' },
        { region: 'CALABARZON', name: 'Cavite - Dasmarinas City' },
        { region: 'CALABARZON', name: 'Cavite - General Trias City' },
        { region: 'CALABARZON', name: 'Cavite - Trece Martires City' },
        { region: 'CALABARZON', name: 'Cavite - Tagaytay City' },
        { region: 'CALABARZON', name: 'Cavite - Silang' },
        { region: 'CALABARZON', name: 'Cavite - Rosario (LIMA)' },
        { region: 'CALABARZON', name: 'Laguna - Santa Rosa City (Nuvali)' },
        { region: 'CALABARZON', name: 'Laguna - Calamba City' },
        { region: 'CALABARZON', name: 'Laguna - San Pablo City' },
        { region: 'CALABARZON', name: 'Laguna - Binan City' },
        { region: 'CALABARZON', name: 'Laguna - Cabuyao City' },
        { region: 'CALABARZON', name: 'Laguna - Sta. Cruz' },
        { region: 'CALABARZON', name: 'Batangas - Batangas City' },
        { region: 'CALABARZON', name: 'Batangas - Lipa City' },
        { region: 'CALABARZON', name: 'Batangas - Tanauan City' },
        { region: 'CALABARZON', name: 'Batangas - Santo Tomas' },
        { region: 'CALABARZON', name: 'Rizal - Antipolo City' },
        { region: 'CALABARZON', name: 'Rizal - Cainta' },
        { region: 'CALABARZON', name: 'Rizal - Taytay' },
        { region: 'CALABARZON', name: 'Rizal - Rodriguez (Montalban)' },
        { region: 'CALABARZON', name: 'Rizal - San Mateo' },
        { region: 'CALABARZON', name: 'Quezon - Lucena City' },
        { region: 'CALABARZON', name: 'Quezon - Tayabas City' },
        { region: 'CALABARZON', name: 'Quezon - Sariaya' },
        
        // Region IV-B - MIMAROPA
        { region: 'MIMAROPA', name: 'Mindoro Oriental - Calapan City' },
        { region: 'MIMAROPA', name: 'Mindoro Occidental - Mamburao' },
        { region: 'MIMAROPA', name: 'Palawan - Puerto Princesa City' },
        { region: 'MIMAROPA', name: 'Romblon - Romblon' },
        { region: 'MIMAROPA', name: 'Marinduque - Boac' },
        
        // Region V - Bicol Region
        { region: 'Region V', name: 'Albay - Legazpi City' },
        { region: 'Region V', name: 'Camarines Norte - Daet' },
        { region: 'Region V', name: 'Camarines Sur - Naga City' },
        { region: 'Region V', name: 'Catanduanes - Virac' },
        { region: 'Region V', name: 'Masbate - Masbate City' },
        { region: 'Region V', name: 'Sorsogon - Sorsogon City' },
        
        // Region VI - Western Visayas
        { region: 'Region VI', name: 'Aklan - Kalibo' },
        { region: 'Region VI', name: 'Aklan - Boracay Island' },
        { region: 'Region VI', name: 'Antique - San Jose' },
        { region: 'Region VI', name: 'Capiz - Roxas City' },
        { region: 'Region VI', name: 'Iloilo - Iloilo City' },
        { region: 'Region VI', name: 'Iloilo - Jaro' },
        { region: 'Region VI', name: 'Iloilo - Pavia' },
        { region: 'Region VI', name: 'Negros Occidental - Bacolod City' },
        { region: 'Region VI', name: 'Negros Occidental - Silay City' },
        { region: 'Region VI', name: 'Negros Occidental - Talisay City' },
        { region: 'Region VI', name: 'Guimaras - Jordan' },
        
        // Region VII - Central Visayas
        { region: 'Region VII', name: 'Bohol - Tagbilaran City' },
        { region: 'Region VII', name: 'Bohol - Panglao Island' },
        { region: 'Region VII', name: 'Cebu - Cebu City' },
        { region: 'Region VII', name: 'Cebu - Mandaue City' },
        { region: 'Region VII', name: 'Cebu - Lapu-Lapu City (Mactan)' },
        { region: 'Region VII', name: 'Cebu - Talisay City' },
        { region: 'Region VII', name: 'Cebu - Naga City' },
        { region: 'Region VII', name: 'Cebu - Carcar City' },
        { region: 'Region VII', name: 'Cebu - Toledo City' },
        { region: 'Region VII', name: 'Cebu - Danao City' },
        { region: 'Region VII', name: 'Cebu - Moalboal' },
        { region: 'Region VII', name: 'Negros Oriental - Dumaguete City' },
        { region: 'Region VII', name: 'Negros Oriental - Bais City' },
        { region: 'Region VII', name: 'Siquijor - Siquijor' },
        
        // Region VIII - Eastern Visayas
        { region: 'Region VIII', name: 'Leyte - Tacloban City' },
        { region: 'Region VIII', name: 'Southern Leyte - Maasin City' },
        { region: 'Region VIII', name: 'Samar - Catbalogan City' },
        { region: 'Region VIII', name: 'Eastern Samar - Borongan City' },
        { region: 'Region VIII', name: 'Northern Samar - Catarman' },
        { region: 'Region VIII', name: 'Biliran - Naval' },
        
        // Region IX - Zamboanga Peninsula
        { region: 'Region IX', name: 'Zamboanga del Norte - Dipolog City' },
        { region: 'Region IX', name: 'Zamboanga del Sur - Pagadian City' },
        { region: 'Region IX', name: 'Zamboanga City' },
        { region: 'Region IX', name: 'Zamboanga Sibugay - Ipil' },
        
        // Region X - Northern Mindanao
        { region: 'Region X', name: 'Bukidnon - Malaybalay City' },
        { region: 'Region X', name: 'Bukidnon - Valencia City' },
        { region: 'Region X', name: 'Camiguin - Mambajao' },
        { region: 'Region X', name: 'Lanao del Norte - Tubod' },
        { region: 'Region X', name: 'Lanao del Norte - Iligan City' },
        { region: 'Region X', name: 'Misamis Occidental - Oroquieta City' },
        { region: 'Region X', name: 'Misamis Occidental - Ozamiz City' },
        { region: 'Region X', name: 'Misamis Oriental - Cagayan de Oro City' },
        { region: 'Region X', name: 'Misamis Oriental - Gingoog City' },
        
        // Region XI - Davao Region
        { region: 'Region XI', name: 'Davao del Norte - Tagum City' },
        { region: 'Region XI', name: 'Davao del Norte - Panabo City' },
        { region: 'Region XI', name: 'Davao del Sur - Digos City' },
        { region: 'Region XI', name: 'Davao Oriental - Mati City' },
        { region: 'Region XI', name: 'Davao de Oro - Nabunturan' },
        { region: 'Region XI', name: 'Davao City - Poblacion' },
        { region: 'Region XI', name: 'Davao City - Matina' },
        { region: 'Region XI', name: 'Davao City - Lanang' },
        { region: 'Region XI', name: 'Davao City - Buhangin' },
        
        // Region XII - SOCCSKSARGEN
        { region: 'Region XII', name: 'Cotabato - Kidapawan City' },
        { region: 'Region XII', name: 'South Cotabato - Koronadal City' },
        { region: 'Region XII', name: 'South Cotabato - General Santos City' },
        { region: 'Region XII', name: 'South Cotabato - Polomolok' },
        { region: 'Region XII', name: 'Sultan Kudarat - Isulan' },
        { region: 'Region XII', name: 'Sultan Kudarat - Tacurong City' },
        { region: 'Region XII', name: 'Sarangani - Alabel' },
        
        // Region XIII - Caraga
        { region: 'Region XIII', name: 'Agusan del Norte - Butuan City' },
        { region: 'Region XIII', name: 'Agusan del Sur - San Francisco' },
        { region: 'Region XIII', name: 'Surigao del Norte - Surigao City' },
        { region: 'Region XIII', name: 'Surigao del Sur - Tandag City' },
        { region: 'Region XIII', name: 'Dinagat Islands - San Jose' },
        
        // CAR - Cordillera Administrative Region
        { region: 'CAR', name: 'Abra - Bangued' },
        { region: 'CAR', name: 'Apayao - Kabugao' },
        { region: 'CAR', name: 'Benguet - Baguio City' },
        { region: 'CAR', name: 'Benguet - La Trinidad' },
        { region: 'CAR', name: 'Ifugao - Lagawe' },
        { region: 'CAR', name: 'Kalinga - Tabuk City' },
        { region: 'CAR', name: 'Mountain Province - Bontoc' },
        
        // BARMM - Bangsamoro Autonomous Region
        { region: 'BARMM', name: 'Basilan - Isabela City' },
        { region: 'BARMM', name: 'Lanao del Sur - Marawi City' },
        { region: 'BARMM', name: 'Maguindanao - Cotabato City' },
        { region: 'BARMM', name: 'Sulu - Jolo' },
        { region: 'BARMM', name: 'Tawi-Tawi - Bongao' }
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
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Province/City</label>
                        <select
                            value={province}
                            onChange={e => setProvince(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value="">Select Location</option>
                            {Object.entries(
                                provinces.reduce((acc, p) => {
                                    if (!acc[p.region]) acc[p.region] = [];
                                    acc[p.region].push(p.name);
                                    return acc;
                                }, {})
                            ).map(([region, locations]) => (
                                <optgroup key={region} label={region}>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </optgroup>
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
};

// Main Territory Management Component
const TerritoryManagement = ({ territories = [], agents = [], companies = [], user, appointments = [] }) => {
    const [selectedTerritory, setSelectedTerritory] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

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

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                    Territory Management
                </h2>
                <Button onClick={() => setShowCreateModal(true)} variant="primary">
                    <Plus size={16} className="mr-1" />
                    New Territory
                </Button>
            </div>

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
};

export default TerritoryManagement;
