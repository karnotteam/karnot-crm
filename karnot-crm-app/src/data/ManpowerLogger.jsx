import React, { useState, useEffect } from 'react';
import { Clock, Users, Trash2, Save, Check, X } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const ManpowerLogger = ({ companies = [] }) => {
    const [loading, setLoading] = useState(false);
    const [timeLogs, setTimeLogs] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [log, setLog] = useState({
        date: new Date().toISOString().split('T')[0],
        staffName: '',
        hours: '',
        hourlyRate: 500,
        companyId: '',
        description: ''
    });

    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;

        const q = query(
            collection(db, "users", auth.currentUser.uid, "manpower_logs"),
            orderBy("date", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTimeLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        if (!log.staffName || !log.hours || !log.companyId) {
            return alert("Please fill in Staff Name, Hours, and Project.");
        }

        setLoading(true);
        
        // Find the company name from the selected ID to ensure robust linking
        const selectedCompany = companies.find(c => c.id === log.companyId);
        const companyName = selectedCompany ? selectedCompany.companyName : '';
        const totalCost = parseFloat(log.hours) * parseFloat(log.hourlyRate);

        try {
            const logData = {
                ...log,
                companyName: companyName, // SAVING NAME FOR ROI LINKING
                totalCost: totalCost,
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, "users", auth.currentUser.uid, "manpower_logs", editingId), logData);
                setEditingId(null);
            } else {
                await addDoc(collection(db, "users", auth.currentUser.uid, "manpower_logs"), {
                    ...logData,
                    createdAt: new Date().toISOString()
                });
            }
            // Reset form but keep company and date for faster logging
            setLog(prev => ({ ...prev, staffName: '', hours: '', description: '' }));
        } catch (error) {
            console.error("Error saving log:", error);
            alert("Error saving log.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this time log?")) {
            const auth = getAuth();
            try {
                await deleteDoc(doc(db, "users", auth.currentUser.uid, "manpower_logs", id));
            } catch (error) {
                console.error("Error deleting:", error);
            }
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setLog({
            date: item.date,
            staffName: item.staffName,
            hours: item.hours,
            hourlyRate: item.hourlyRate || 500,
            companyId: item.companyId,
            description: item.description || ''
        });
    };

    return (
        <div className="space-y-8">
            <Card className="border-t-4 border-blue-500 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                        <Clock className="text-blue-600" /> {editingId ? "Edit Time Log" : "Log Manpower Hours"}
                    </h2>
                    {editingId && (
                        <Button onClick={() => {setEditingId(null); setLog({...log, staffName: '', hours: ''})}} variant="secondary">
                            <X size={16} className="mr-2"/> Cancel
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Date" type="date" value={log.date} onChange={e => setLog({...log, date: e.target.value})} />
                    <Input label="Staff Name" placeholder="e.g. Juan Dela Cruz" value={log.staffName} onChange={e => setLog({...log, staffName: e.target.value})} />
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Project / Company</label>
                        <select 
                            className="w-full p-2 border-2 border-gray-100 rounded-xl bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" 
                            value={log.companyId} 
                            onChange={e => setLog({...log, companyId: e.target.value})}
                        >
                            <option value="">-- Select Project --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Input label="Hours Worked" type="number" value={log.hours} onChange={e => setLog({...log, hours: e.target.value})} />
                    <Input label="Hourly Rate (₱)" type="number" value={log.hourlyRate} onChange={e => setLog({...log, hourlyRate: e.target.value})} />
                    <div className="mt-8 p-3 bg-blue-50 rounded-xl border border-blue-100 font-black text-blue-700 text-center">
                        Total Cost: ₱{(parseFloat(log.hours || 0) * parseFloat(log.hourlyRate || 0)).toLocaleString()}
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={handleSave} variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white px-8" disabled={loading}>
                        <Save className="mr-2" size={16} /> {editingId ? "Update Log" : "Save Work Log"}
                    </Button>
                </div>
            </Card>

            <Card className="shadow-md">
                <h3 className="font-black text-xs uppercase text-gray-400 mb-4 tracking-widest">Recent Manpower History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500">
                            <tr>
                                <th className="p-4 border-b">Date</th>
                                <th className="p-4 border-b">Project</th>
                                <th className="p-4 border-b">Staff</th>
                                <th className="p-4 border-b text-center">Hours</th>
                                <th className="p-4 border-b">Cost</th>
                                <th className="p-4 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {timeLogs.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-600">{item.date}</td>
                                    <td className="p-4 font-bold text-gray-800">{item.companyName || 'Unknown Project'}</td>
                                    <td className="p-4 text-gray-700 font-medium">{item.staffName}</td>
                                    <td className="p-4 text-center font-mono">{item.hours}h</td>
                                    <td className="p-4 text-blue-700 font-black font-mono">₱{item.totalCost?.toLocaleString()}</td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors"><Save size={16}/></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ManpowerLogger;
