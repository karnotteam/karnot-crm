import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
    Users, Phone, Mail, MapPin, Award, TrendingUp, DollarSign,
    Plus, Edit, Trash2, X, CheckCircle, Clock, AlertCircle, Building
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// --- Agent Type Badge ---
const AgentTypeBadge = ({ type }) => {
    const styles = {
        'Distributor': 'bg-purple-100 text-purple-700',
        'Agent': 'bg-blue-100 text-blue-700',
        'Partner': 'bg-green-100 text-green-700',
        'Reseller': 'bg-orange-100 text-orange-700'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
            {type}
        </span>
    );
};

// --- Agent Modal ---
const AgentModal = ({ agent, onClose, onSave }) => {
    const [name, setName] = useState(agent?.name || '');
    const [type, setType] = useState(agent?.type || 'Agent');
    const [phone, setPhone] = useState(agent?.phone || '');
    const [email, setEmail] = useState(agent?.email || '');
    const [address, setAddress] = useState(agent?.address || '');
    const [baseCommission, setBaseCommission] = useState(agent?.baseCommission || 15);
    const [targetMonthly, setTargetMonthly] = useState(agent?.targetMonthly || 10);
    const [notes, setNotes] = useState(agent?.notes || '');
    const [status, setStatus] = useState(agent?.status || 'Active');
    const [territories, setTerritories] = useState(agent?.territories || []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">
                                {agent ? 'Edit Agent/Partner' : 'New Agent/Partner'}
                            </h2>
                            <p className="text-xs font-bold text-blue-100 mt-1">
                                Territory representative configuration
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Agent/Partner Name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Juan Dela Cruz"
                        />
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Type</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                <option value="Agent">Sales Agent</option>
                                <option value="Distributor">Distributor</option>
                                <option value="Partner">Strategic Partner</option>
                                <option value="Reseller">Authorized Reseller</option>
                            </select>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">Contact Information</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder="Phone Number"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="bg-white"
                            />
                            <Input
                                placeholder="Email Address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        <Textarea
                            placeholder="Business Address"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            rows="2"
                            className="bg-white"
                        />
                    </div>

                    {/* Performance & Commission */}
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 space-y-3">
                        <p className="text-[10px] font-black uppercase text-gray-500">Performance & Compensation</p>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase text-gray-500">Base Commission</span>
                                <span className="text-2xl font-black text-green-600">{baseCommission}%</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="30"
                                step="1"
                                value={baseCommission}
                                onChange={e => setBaseCommission(parseInt(e.target.value))}
                                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">
                                    Monthly Target (Units)
                                </label>
                                <input
                                    type="number"
                                    value={targetMonthly}
                                    onChange={e => setTargetMonthly(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-xl bg-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-xl bg-white font-bold"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <Textarea
                        label="Internal Notes"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows="3"
                        placeholder="Contract details, special terms, performance notes..."
                    />
                </div>

                <div className="p-6 bg-gray-50 border-t sticky bottom-0 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button
                        onClick={() => onSave({
                            name, type, phone, email, address,
                            baseCommission, targetMonthly, notes, status,
                            territories: territories || []
                        })}
                        variant="primary"
                        disabled={!name || !phone}
                    >
                        {agent ? 'Update Agent' : 'Create Agent'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- Agent Card Component ---
const AgentCard = ({ agent, territories = [], onEdit, onDelete, stats }) => {
    const assignedTerritories = territories.filter(t => t.agentId === agent.id);
    
    return (
        <Card className="p-5 rounded-2xl border-gray-200 hover:border-blue-400 transition-all bg-white relative group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight">
                        {agent.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <AgentTypeBadge type={agent.type} />
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                            agent.status === 'Active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                            {agent.status}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(agent)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(agent.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-blue-500" />
                    <span className="font-bold">{agent.phone}</span>
                </div>
                {agent.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} className="text-blue-500" />
                        <span className="font-bold">{agent.email}</span>
                    </div>
                )}
            </div>

            {/* Territory Assignment */}
            <div className="mb-4 pb-4 border-b">
                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Assigned Territories</p>
                {assignedTerritories.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {assignedTerritories.map(t => (
                            <span key={t.id} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black">
                                {t.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic">No territories assigned</p>
                )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xl font-black text-gray-800">{agent.baseCommission}%</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Commission</p>
                </div>
                <div>
                    <p className="text-xl font-black text-green-600">{stats?.deals || 0}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Deals</p>
                </div>
                <div>
                    <p className="text-xl font-black text-purple-600">{agent.targetMonthly}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Target/Mo</p>
                </div>
            </div>
        </Card>
    );
};

// --- Main Agent Management Component ---
const AgentManagement = ({ agents = [], territories = [], user, quotes = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Calculate stats for each agent
    const agentStats = useMemo(() => {
        const stats = {};
        agents.forEach(agent => {
            // Count deals/quotes attributed to this agent
            const agentQuotes = quotes.filter(q => q.agentId === agent.id);
            stats[agent.id] = {
                deals: agentQuotes.length,
                revenue: agentQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0)
            };
        });
        return stats;
    }, [agents, quotes]);

    const filtered = useMemo(() => {
        if (filterStatus === 'ALL') return agents;
        return agents.filter(a => a.status === filterStatus);
    }, [agents, filterStatus]);

    const activeCount = agents.filter(a => a.status === 'Active').length;
    const totalTerritories = territories.filter(t => t.agentId).length;

    const handleSave = async (data) => {
        if (!user) return;
        if (editingAgent) {
            await updateDoc(
                doc(db, "users", user.uid, "agents", editingAgent.id),
                { ...data, lastModified: serverTimestamp() }
            );
        } else {
            await addDoc(collection(db, "users", user.uid, "agents"), {
                ...data,
                createdAt: serverTimestamp()
            });
        }
        setShowModal(false);
        setEditingAgent(null);
    };

    const handleDelete = async (agentId) => {
        if (!confirm('Remove this agent? Their territories will become unassigned.')) return;
        await deleteDoc(doc(db, "users", user.uid, "agents", agentId));
    };

    return (
        <div className="w-full space-y-6">
            {/* Modal */}
            {showModal && (
                <AgentModal
                    agent={editingAgent}
                    onClose={() => {
                        setShowModal(false);
                        setEditingAgent(null);
                    }}
                    onSave={handleSave}
                />
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <Users className="text-blue-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{agents.length}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Total Agents</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
                    <CheckCircle className="text-green-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{activeCount}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Active</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <MapPin className="text-purple-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{totalTerritories}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Territories Covered</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                    <TrendingUp className="text-orange-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">
                        {Object.values(agentStats).reduce((sum, s) => sum + s.deals, 0)}
                    </p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Total Deals</p>
                </Card>
            </div>

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                        Agent Network ({filtered.length})
                    </h2>
                    <div className="flex gap-2">
                        {['ALL', 'Active', 'Inactive', 'Pending'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                                    filterStatus === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingAgent(null);
                        setShowModal(true);
                    }}
                    variant="primary"
                >
                    <Plus size={16} className="mr-1" />
                    Add Agent/Partner
                </Button>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(agent => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        territories={territories}
                        onEdit={(a) => {
                            setEditingAgent(a);
                            setShowModal(true);
                        }}
                        onDelete={handleDelete}
                        stats={agentStats[agent.id]}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <Card className="p-12 text-center">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-400 uppercase mb-2">
                        {filterStatus === 'ALL' ? 'No Agents Yet' : `No ${filterStatus} Agents`}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Build your distribution network by adding agents and partners
                    </p>
                    <Button onClick={() => setShowModal(true)} variant="primary">
                        Add First Agent
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default AgentManagement;
