import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Button } from '../data/constants';
import { CheckCircle, XCircle, AlertCircle, Camera, Save, Clock, Wrench, Package, FileText } from 'lucide-react';

const MaintenanceEventDetail = ({ eventId, onClose, user }) => {
    const [event, setEvent] = useState(null);
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [completionData, setCompletionData] = useState({
        completed_by: user?.displayName || user?.email || '',
        completion_date: new Date().toISOString(),
        labor_hours: 0,
        checklist_completed: [],
        parts_used: [],
        tech_notes: '',
        next_service_recommendation: '',
        photo_urls: []
    });

    useEffect(() => {
        const loadEventData = async () => {
            try {
                // Load event
                const eventDoc = await getDoc(doc(db, 'maintenance_events', eventId));
                if (eventDoc.exists()) {
                    const eventData = { id: eventDoc.id, ...eventDoc.data() };
                    setEvent(eventData);

                    // Load contract if exists
                    if (eventData.contract_ref) {
                        const contractDoc = await getDoc(doc(db, 'service_contracts', eventData.contract_ref));
                        if (contractDoc.exists()) {
                            const contractData = { id: contractDoc.id, ...contractDoc.data() };
                            setContract(contractData);

                            // Initialize checklist based on maintenance type
                            const checklist = eventData.maintenance_type === 'Annual_Service'
                                ? contractData.annual_checklist
                                : contractData.quarterly_checklist;

                            setCompletionData(prev => ({
                                ...prev,
                                checklist_completed: checklist.map(item => ({
                                    item,
                                    status: 'Pending', // Pending, Pass, Fail, Action_Taken
                                    notes: ''
                                }))
                            }));
                        }
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error('Error loading event:', error);
                setLoading(false);
            }
        };

        loadEventData();
    }, [eventId]);

    const handleChecklistUpdate = (index, field, value) => {
        const updated = [...completionData.checklist_completed];
        updated[index] = { ...updated[index], [field]: value };
        setCompletionData({ ...completionData, checklist_completed: updated });
    };

    const handleAddPart = () => {
        const newPart = {
            part_number: '',
            part_name: '',
            quantity: 1,
            action: 'Replaced',
            cost: 0
        };
        setCompletionData({
            ...completionData,
            parts_used: [...completionData.parts_used, newPart]
        });
    };

    const handlePartUpdate = (index, field, value) => {
        const updated = [...completionData.parts_used];
        updated[index] = { ...updated[index], [field]: value };
        setCompletionData({ ...completionData, parts_used: updated });
    };

    const handleRemovePart = (index) => {
        const updated = completionData.parts_used.filter((_, i) => i !== index);
        setCompletionData({ ...completionData, parts_used: updated });
    };

    const handleCompleteService = async () => {
        try {
            // Update maintenance event with completion data
            await updateDoc(doc(db, 'maintenance_events', eventId), {
                status: 'Completed',
                actual_date: new Date().toISOString(),
                completion_data: completionData
            });

            // Update contract scheduled visits
            if (contract) {
                const updatedVisits = contract.scheduled_visits.map(visit => {
                    if (visit.due_date === event.scheduled_date && visit.maintenance_event_ref === eventId) {
                        return { ...visit, status: 'Completed' };
                    }
                    return visit;
                });

                await updateDoc(doc(db, 'service_contracts', contract.id), {
                    scheduled_visits: updatedVisits
                });
            }

            alert('Service completed successfully!');
            if (onClose) onClose();
        } catch (error) {
            console.error('Error completing service:', error);
            alert('Error completing service: ' + error.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading service details...</div>;
    }

    if (!event) {
        return <div className="p-8 text-center">Event not found</div>;
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pass': return 'bg-green-100 text-green-700 border-green-500';
            case 'Fail': return 'bg-red-100 text-red-700 border-red-500';
            case 'Action_Taken': return 'bg-orange-100 text-orange-700 border-orange-500';
            default: return 'bg-gray-100 text-gray-700 border-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pass': return <CheckCircle size={16} className="text-green-600" />;
            case 'Fail': return <XCircle size={16} className="text-red-600" />;
            case 'Action_Taken': return <AlertCircle size={16} className="text-orange-600" />;
            default: return <Clock size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase">{event.maintenance_type}</h1>
                        <p className="text-gray-600 mt-1">Scheduled: {event.scheduled_date} at {event.scheduled_time}</p>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wide mt-1">
                            Location: {event.service_address}
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        event.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        event.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {event.status}
                    </span>
                </div>

                {event.access_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                        <strong>Access Notes:</strong> {event.access_notes}
                    </div>
                )}
            </div>

            {/* Service Checklist */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={20} className="text-gray-700" />
                    <h2 className="text-xl font-black text-gray-800 uppercase">Service Checklist</h2>
                </div>

                <div className="space-y-3">
                    {completionData.checklist_completed.map((item, idx) => (
                        <div key={idx} className={`border-2 rounded-lg p-4 ${getStatusColor(item.status)}`}>
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                    {getStatusIcon(item.status)}
                                    <span className="font-bold text-sm">{item.item}</span>
                                </div>
                                
                                <select
                                    value={item.status}
                                    onChange={(e) => handleChecklistUpdate(idx, 'status', e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs font-bold"
                                    disabled={event.status === 'Completed'}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                    <option value="Action_Taken">Action Taken</option>
                                </select>
                            </div>

                            <textarea
                                value={item.notes}
                                onChange={(e) => handleChecklistUpdate(idx, 'notes', e.target.value)}
                                placeholder="Add notes (measurements, observations, actions taken)..."
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
                                rows={2}
                                disabled={event.status === 'Completed'}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Parts Used */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package size={20} className="text-gray-700" />
                        <h2 className="text-xl font-black text-gray-800 uppercase">Parts Used</h2>
                    </div>
                    {event.status !== 'Completed' && (
                        <Button onClick={handleAddPart} variant="secondary" className="text-xs">
                            <Plus size={14} className="mr-1" /> Add Part
                        </Button>
                    )}
                </div>

                {completionData.parts_used.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No parts used in this service
                    </div>
                ) : (
                    <div className="space-y-3">
                        {completionData.parts_used.map((part, idx) => (
                            <div key={idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <input
                                        type="text"
                                        value={part.part_number}
                                        onChange={(e) => handlePartUpdate(idx, 'part_number', e.target.value)}
                                        placeholder="Part Number"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                        disabled={event.status === 'Completed'}
                                    />
                                    <input
                                        type="text"
                                        value={part.part_name}
                                        onChange={(e) => handlePartUpdate(idx, 'part_name', e.target.value)}
                                        placeholder="Part Name"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                        disabled={event.status === 'Completed'}
                                    />
                                    <input
                                        type="number"
                                        value={part.quantity}
                                        onChange={(e) => handlePartUpdate(idx, 'quantity', parseInt(e.target.value))}
                                        placeholder="Qty"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                        disabled={event.status === 'Completed'}
                                    />
                                    <select
                                        value={part.action}
                                        onChange={(e) => handlePartUpdate(idx, 'action', e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                        disabled={event.status === 'Completed'}
                                    >
                                        <option value="Replaced">Replaced</option>
                                        <option value="Cleaned">Cleaned</option>
                                        <option value="Repaired">Repaired</option>
                                        <option value="Inspected">Inspected</option>
                                    </select>
                                </div>
                                
                                <div className="flex justify-between items-center mt-3">
                                    <input
                                        type="number"
                                        value={part.cost}
                                        onChange={(e) => handlePartUpdate(idx, 'cost', parseFloat(e.target.value))}
                                        placeholder="Cost (PHP)"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm w-32"
                                        disabled={event.status === 'Completed'}
                                    />
                                    
                                    {event.status !== 'Completed' && (
                                        <Button
                                            onClick={() => handleRemovePart(idx)}
                                            variant="secondary"
                                            className="text-red-600 hover:bg-red-50 text-xs"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Technician Notes & Recommendations */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} className="text-gray-700" />
                    <h2 className="text-xl font-black text-gray-800 uppercase">Technician Notes</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                            Service Notes & Observations
                        </label>
                        <textarea
                            value={completionData.tech_notes}
                            onChange={(e) => setCompletionData({ ...completionData, tech_notes: e.target.value })}
                            placeholder="System status, observations, client feedback, recommendations..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
                            rows={4}
                            disabled={event.status === 'Completed'}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                Labor Hours
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={completionData.labor_hours}
                                onChange={(e) => setCompletionData({ ...completionData, labor_hours: parseFloat(e.target.value) })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                                disabled={event.status === 'Completed'}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                Next Service Date (Recommendation)
                            </label>
                            <input
                                type="date"
                                value={completionData.next_service_recommendation}
                                onChange={(e) => setCompletionData({ ...completionData, next_service_recommendation: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                                disabled={event.status === 'Completed'}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Complete Service Button */}
            {event.status !== 'Completed' && (
                <div className="flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">
                        Save Draft
                    </Button>
                    <Button onClick={handleCompleteService} variant="primary" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle size={16} className="mr-2" /> Complete Service
                    </Button>
                </div>
            )}

            {event.status === 'Completed' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-700 font-bold">✓ Service completed on {new Date(event.actual_date).toLocaleDateString()}</p>
                </div>
            )}
        </div>
    );
};

export default MaintenanceEventDetail;
