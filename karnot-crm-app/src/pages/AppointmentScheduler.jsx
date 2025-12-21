import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
    Calendar, Phone, User, MapPin, Clock, CheckCircle, X, Plus,
    AlertCircle, Edit, Trash2, Filter, Search, Users, Target, Building
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// --- Appointment Status Badge ---
const StatusBadge = ({ status }) => {
    const styles = {
        'Scheduled': 'bg-blue-100 text-blue-700',
        'Confirmed': 'bg-green-100 text-green-700',
        'Completed': 'bg-teal-100 text-teal-700',
        'Cancelled': 'bg-red-100 text-red-700',
        'Rescheduled': 'bg-orange-100 text-orange-700',
        'No-Show': 'bg-gray-100 text-gray-700'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    );
};

// --- Appointment Modal ---
const AppointmentModal = ({ appointment, companies = [], agents = [], onClose, onSave, currentUser }) => {
    const [companyId, setCompanyId] = useState(appointment?.companyId || '');
    const [companyName, setCompanyName] = useState(appointment?.companyName || '');
    const [contactPerson, setContactPerson] = useState(appointment?.contactPerson || '');
    const [contactPhone, setContactPhone] = useState(appointment?.contactPhone || '');
    const [appointmentDate, setAppointmentDate] = useState(
        appointment?.appointmentDate || new Date().toISOString().split('T')[0]
    );
    const [appointmentTime, setAppointmentTime] = useState(appointment?.appointmentTime || '10:00');
    const [agentId, setAgentId] = useState(appointment?.agentId || '');
    const [purpose, setPurpose] = useState(appointment?.purpose || 'Initial Consultation');
    const [notes, setNotes] = useState(appointment?.notes || '');
    const [status, setStatus] = useState(appointment?.status || 'Scheduled');
    const [priority, setPriority] = useState(appointment?.priority || 'Medium');

    const selectedCompany = companies.find(c => c.id === companyId);
    const selectedAgent = agents.find(a => a.id === agentId);

    const purposeOptions = [
        'Initial Consultation',
        'Product Demo',
        'Site Survey',
        'Quotation Discussion',
        'Contract Signing',
        'Installation Planning',
        'Follow-up Meeting'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-3xl">
                
                {/* Left Panel - Form */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                        {appointment ? 'Edit Appointment' : 'Schedule New Appointment'}
                    </h2>

                    {/* Company Selection */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Company/Account
                        </label>
                        <select
                            value={companyId}
                            onChange={e => {
                                setCompanyId(e.target.value);
                                const company = companies.find(c => c.id === e.target.value);
                                if (company) setCompanyName(company.companyName);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value="">Select Company</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>
                                    {company.companyName} {company.isCustomer && '(Customer)'} {company.isTarget && '(Target)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Contact Details */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <p className="text-[10px] font-black uppercase text-slate-500">Contact Person Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder="Contact Name"
                                value={contactPerson}
                                onChange={e => setContactPerson(e.target.value)}
                                className="bg-white"
                            />
                            <Input
                                placeholder="Phone Number"
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Appointment Date
                            </label>
                            <input
                                type="date"
                                value={appointmentDate}
                                onChange={e => setAppointmentDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Time
                            </label>
                            <input
                                type="time"
                                value={appointmentTime}
                                onChange={e => setAppointmentTime(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            />
                        </div>
                    </div>

                    {/* Assign Agent */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Assign to Sales Rep
                        </label>
                        <select
                            value={agentId}
                            onChange={e => setAgentId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                        >
                            <option value="">Unassigned</option>
                            {agents.filter(a => a.status === 'Active').map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name} - {agent.type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Purpose & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Meeting Purpose
                            </label>
                            <select
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                {purposeOptions.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                <option value="High">High Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="Low">Low Priority</option>
                            </select>
                        </div>
                    </div>

                    {/* Status (only show when editing) */}
                    {appointment && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Rescheduled">Rescheduled</option>
                                <option value="No-Show">No-Show</option>
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <Textarea
                        label="Call Notes / Special Instructions"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows="3"
                        placeholder="Caller's requirements, special requests, directions..."
                    />

                    {/* Booked By Info */}
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Booked By</p>
                        <p className="text-sm font-bold text-gray-700">
                            {appointment?.bookedBy || currentUser?.displayName || 'Call Centre'}
                        </p>
                    </div>
                </div>

                {/* Right Panel - Preview & Actions */}
                <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex flex-col">
                    <div className="flex-1 space-y-4">
                        <h3 className="text-lg font-black text-gray-700 uppercase">Appointment Summary</h3>
                        
                        {/* Company Info */}
                        {selectedCompany && (
                            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Company</p>
                                <p className="font-black text-gray-800">{selectedCompany.companyName}</p>
                                {selectedCompany.address && (
                                    <p className="text-xs text-gray-500 mt-1">{selectedCompany.address}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                    {selectedCompany.isCustomer && (
                                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-[9px] font-black">
                                            CUSTOMER
                                        </span>
                                    )}
                                    {selectedCompany.isTarget && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black">
                                            TARGET
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Date/Time */}
                        <div className="bg-white p-4 rounded-2xl border shadow-sm">
                            <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Scheduled For</p>
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} className="text-blue-600" />
                                <p className="font-black text-gray-800">
                                    {new Date(appointmentDate).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-blue-600" />
                                <p className="font-black text-gray-800">{appointmentTime}</p>
                            </div>
                        </div>

                        {/* Assigned Agent */}
                        {selectedAgent && (
                            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Assigned To</p>
                                <p className="font-black text-gray-800">{selectedAgent.name}</p>
                                <p className="text-xs text-gray-500">{selectedAgent.type}</p>
                                <p className="text-xs text-gray-500 mt-1">{selectedAgent.phone}</p>
                            </div>
                        )}

                        {/* Purpose */}
                        <div className="bg-white p-4 rounded-2xl border shadow-sm">
                            <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Purpose</p>
                            <p className="font-black text-gray-800">{purpose}</p>
                            <div className="mt-2">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black ${
                                    priority === 'High' ? 'bg-red-100 text-red-700' :
                                    priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {priority} PRIORITY
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t flex gap-3">
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => onSave({
                                companyId,
                                companyName: selectedCompany?.companyName || companyName,
                                contactPerson,
                                contactPhone,
                                appointmentDate,
                                appointmentTime,
                                agentId,
                                agentName: selectedAgent?.name || null,
                                purpose,
                                priority,
                                status,
                                notes,
                                bookedBy: appointment?.bookedBy || currentUser?.displayName || 'Call Centre'
                            })}
                            variant="primary"
                            className="flex-1"
                            disabled={!companyId || !appointmentDate || !contactPerson}
                        >
                            {appointment ? 'Update' : 'Schedule'} Appointment
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- Appointment Card ---
const AppointmentCard = ({ appointment, onEdit, onDelete, onStatusChange }) => {
    const isPast = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`) < new Date();
    
    return (
        <Card className={`p-4 rounded-2xl border-2 transition-all hover:shadow-lg group relative ${
            appointment.status === 'Completed' ? 'bg-green-50 border-green-200' :
            appointment.status === 'Cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
            isPast && appointment.status === 'Scheduled' ? 'border-red-300 bg-red-50' :
            'bg-white border-gray-200 hover:border-blue-400'
        }`}>
            {/* Status & Priority */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                    <StatusBadge status={appointment.status} />
                    {appointment.priority === 'High' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[9px] font-black">
                            HIGH PRIORITY
                        </span>
                    )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(appointment)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(appointment.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Company Name */}
            <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight mb-2">
                {appointment.companyName}
            </h4>

            {/* Contact Info */}
            <div className="space-y-1 mb-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <User size={14} className="text-blue-500" />
                    <span className="font-bold">{appointment.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-blue-500" />
                    <span className="font-bold">{appointment.contactPhone}</span>
                </div>
            </div>

            {/* Date & Time */}
            <div className="bg-blue-50 p-3 rounded-xl mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="text-sm font-black text-gray-800">
                        {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-600" />
                    <span className="text-sm font-black text-gray-800">{appointment.appointmentTime}</span>
                </div>
            </div>

            {/* Agent & Purpose */}
            <div className="text-xs text-gray-600 space-y-1 mb-3">
                <p><span className="font-black">Agent:</span> {appointment.agentName || 'Unassigned'}</p>
                <p><span className="font-black">Purpose:</span> {appointment.purpose}</p>
            </div>

            {/* Quick Status Change */}
            {appointment.status === 'Scheduled' && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onStatusChange(appointment.id, 'Confirmed')}
                        className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase hover:bg-green-200 transition-colors"
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => onStatusChange(appointment.id, 'Cancelled')}
                        className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </Card>
    );
};

// --- Main Appointment Scheduler Component ---
const AppointmentScheduler = ({ appointments = [], companies = [], agents = [], user }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterAgent, setFilterAgent] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('upcoming'); // upcoming, today, week, all

    const filtered = useMemo(() => {
        let result = appointments;

        // Status filter
        if (filterStatus !== 'ALL') {
            result = result.filter(a => a.status === filterStatus);
        }

        // Agent filter
        if (filterAgent !== 'ALL') {
            result = result.filter(a => a.agentId === filterAgent);
        }

        // Date filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        if (dateFilter === 'today') {
            result = result.filter(a => {
                const aptDate = new Date(a.appointmentDate);
                aptDate.setHours(0, 0, 0, 0);
                return aptDate.getTime() === today.getTime();
            });
        } else if (dateFilter === 'upcoming') {
            result = result.filter(a => new Date(a.appointmentDate) >= today);
        } else if (dateFilter === 'week') {
            result = result.filter(a => {
                const aptDate = new Date(a.appointmentDate);
                return aptDate >= today && aptDate <= weekFromNow;
            });
        }

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.companyName.toLowerCase().includes(term) ||
                a.contactPerson.toLowerCase().includes(term) ||
                a.purpose.toLowerCase().includes(term)
            );
        }

        return result.sort((a, b) => 
            new Date(`${a.appointmentDate}T${a.appointmentTime}`) - 
            new Date(`${b.appointmentDate}T${b.appointmentTime}`)
        );
    }, [appointments, filterStatus, filterAgent, dateFilter, searchTerm]);

    const stats = useMemo(() => ({
        total: appointments.length,
        scheduled: appointments.filter(a => a.status === 'Scheduled').length,
        confirmed: appointments.filter(a => a.status === 'Confirmed').length,
        completed: appointments.filter(a => a.status === 'Completed').length
    }), [appointments]);

    const handleSave = async (data) => {
        if (!user) return;
        if (editingAppointment) {
            await updateDoc(
                doc(db, "users", user.uid, "appointments", editingAppointment.id),
                { ...data, lastModified: serverTimestamp() }
            );
        } else {
            await addDoc(collection(db, "users", user.uid, "appointments"), {
                ...data,
                createdAt: serverTimestamp()
            });
        }
        setShowModal(false);
        setEditingAppointment(null);
    };

    const handleDelete = async (appointmentId) => {
        if (!confirm('Delete this appointment?')) return;
        await deleteDoc(doc(db, "users", user.uid, "appointments", appointmentId));
    };

    const handleStatusChange = async (appointmentId, newStatus) => {
        await updateDoc(
            doc(db, "users", user.uid, "appointments", appointmentId),
            { status: newStatus, lastModified: serverTimestamp() }
        );
    };

    return (
        <div className="w-full space-y-6">
            {/* Modal */}
            {showModal && (
                <AppointmentModal
                    appointment={editingAppointment}
                    companies={companies}
                    agents={agents}
                    onClose={() => {
                        setShowModal(false);
                        setEditingAppointment(null);
                    }}
                    onSave={handleSave}
                    currentUser={user}
                />
            )}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <Calendar className="text-blue-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{stats.total}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Total Appointments</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                    <Clock className="text-orange-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{stats.scheduled}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Scheduled</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
                    <CheckCircle className="text-green-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{stats.confirmed}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Confirmed</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                    <Users className="text-teal-600 mb-2" size={24} />
                    <p className="text-3xl font-black text-gray-800">{stats.completed}</p>
                    <p className="text-[10px] font-black uppercase text-gray-500">Completed</p>
                </Card>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                    Call Centre Dashboard ({filtered.length})
                </h2>
                <Button
                    onClick={() => {
                        setEditingAppointment(null);
                        setShowModal(true);
                    }}
                    variant="primary"
                >
                    <Plus size={16} className="mr-1" />
                    Book Appointment
                </Button>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                    {['upcoming', 'today', 'week', 'all'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                dateFilter === filter
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-[10px] font-black uppercase"
                >
                    <option value="ALL">All Status</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <select
                    value={filterAgent}
                    onChange={e => setFilterAgent(e.target.value)}
                    className="px-3 py-2 border rounded-xl text-[10px] font-black uppercase"
                >
                    <option value="ALL">All Agents</option>
                    {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                </select>
            </div>

            {/* Search */}
            <div className="relative">
                <Input
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Appointments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(appointment => (
                    <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onEdit={(a) => {
                            setEditingAppointment(a);
                            setShowModal(true);
                        }}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <Card className="p-12 text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-black text-gray-400 uppercase mb-2">No Appointments Found</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {searchTerm || filterStatus !== 'ALL' 
                            ? 'Try adjusting your filters'
                            : 'Start scheduling appointments for your sales team'
                        }
                    </p>
                    {!searchTerm && filterStatus === 'ALL' && (
                        <Button onClick={() => setShowModal(true)} variant="primary">
                            Book First Appointment
                        </Button>
                    )}
                </Card>
            )}
        </div>
    );
};

export default AppointmentScheduler;
