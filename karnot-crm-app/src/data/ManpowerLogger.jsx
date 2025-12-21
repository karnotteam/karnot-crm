import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, Button, Input } from '../data/constants.jsx';
import { Clock, Trash2, User, Briefcase, Plus, Calendar } from 'lucide-react';
import { getAuth } from "firebase/auth";

const ManpowerLogger = ({ quotes = [] }) => { // Updated prop to quotes
    const [logs, setLogs] = useState([]);
    const [newLog, setNewLog] = useState({
        staffName: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        rate: '',
        quoteId: '', // Changed from companyId to quoteId
        taskDescription: ''
    });

    const auth = getAuth();
    const user = auth.currentUser;

    // Fetch Logs
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "manpower_logs"), orderBy("date", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    // Derived Lists
    const activeProjects = quotes.filter(q => ['WON', 'APPROVED', 'INVOICED'].includes(q.status));

    const handleAddLog = async () => {
        if (!newLog.staffName || !newLog.hours || !newLog.rate || !newLog.quoteId) {
            alert("Please fill all required fields");
            return;
        }

        // Find Project Name for easy reading later
        const selectedProject = quotes.find(q => q.id === newLog.quoteId);
        const projectLabel = selectedProject ? `${selectedProject.customer?.name} (${selectedProject.id})` : 'Unknown';

        const totalCost = parseFloat(newLog.hours) * parseFloat(newLog.rate);

        await addDoc(collection(db, "users", user.uid, "manpower_logs"), {
            ...newLog,
            projectLabel, 
            totalCost,
            createdAt: serverTimestamp()
        });

        setNewLog({ ...newLog, hours: '', taskDescription: '' }); // Reset fields but keep staff/project for speed
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this log entry?")) {
            await deleteDoc(doc(db, "users", user.uid, "manpower_logs", id));
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* INPUT CARD */}
            <Card className="p-6 bg-white shadow-sm border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Manpower & Labor Log</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Track project hours for ROI Analysis</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date</label>
                        <Input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Staff Name</label>
                        <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <Input 
                                placeholder="Technician Name" 
                                value={newLog.staffName} 
                                onChange={e => setNewLog({...newLog, staffName: e.target.value})} 
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Project Assignment</label>
                        <div className="relative">
                            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <select 
                                className="w-full p-3 pl-9 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                value={newLog.quoteId}
                                onChange={e => setNewLog({...newLog, quoteId: e.target.value})}
                            >
                                <option value="">-- Select Active Project --</option>
                                {activeProjects.map(q => (
                                    <option key={q.id} value={q.id}>
                                        {q.customer?.name} (Ref: {q.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hourly Rate</label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={newLog.rate} 
                            onChange={e => setNewLog({...newLog, rate: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-end">
                    <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Task Details</label>
                        <Input 
                            placeholder="Description of work performed..." 
                            value={newLog.taskDescription} 
                            onChange={e => setNewLog({...newLog, taskDescription: e.target.value})} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hours</label>
                            <Input 
                                type="number" 
                                placeholder="0" 
                                value={newLog.hours} 
                                onChange={e => setNewLog({...newLog, hours: e.target.value})} 
                            />
                        </div>
                        <Button onClick={handleAddLog} variant="primary" className="h-[46px] px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                            <Plus size={20} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* LOGS LIST */}
            <div className="space-y-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Recent Logs</h3>
                {logs.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-500 font-bold text-xs flex flex-col items-center min-w-[60px]">
                                <Calendar size={14} className="mb-1"/>
                                {new Date(log.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{log.staffName}</h4>
                                <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
                                    <Briefcase size={10}/> {log.projectLabel}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{log.taskDescription}</p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-6">
                            <div>
                                <p className="text-lg font-black text-gray-800">{log.hours} <span className="text-[10px] text-gray-400 font-bold uppercase">Hrs</span></p>
                                <p className="text-xs text-gray-500">@ ₱{log.rate}/hr</p>
                            </div>
                            <div className="text-right w-24">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Cost</p>
                                <p className="text-lg font-black text-blue-600">₱{log.totalCost?.toLocaleString()}</p>
                            </div>
                            <button 
                                onClick={() => handleDelete(log.id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                ))}
                {logs.length === 0 && <p className="text-center text-gray-400 text-xs italic py-8">No manpower logs recorded yet.</p>}
            </div>
        </div>
    );
};

export default ManpowerLogger;
