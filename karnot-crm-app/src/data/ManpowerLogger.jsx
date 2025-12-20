import React, { useState, useEffect } from 'react';
import { Clock, Users, Trash2, Save, Check, X } from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';
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
        hourlyRate: 500, // Default rate, can be adjusted
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
        if (!log.staffName || !log.hours || !log.companyId) return alert("Please fill in Staff Name, Hours, and Project.");

        setLoading(true);
        const totalCost = parseFloat(log.hours) * parseFloat(log.hourlyRate);

        try {
            if (editingId) {
                await updateDoc(doc(db, "users", auth.currentUser.uid, "manpower_logs", editingId), {
                    ...log,
                    totalCost
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, "users", auth.currentUser.uid, "manpower_logs"), {
                    ...log,
                    totalCost,
                    createdAt: new Date().toISOString()
                });
            }
            setLog(prev => ({ ...prev, staffName: '', hours: '', description: '' }));
        } catch (error) {
            console.error(error);
            alert("Error saving log.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this time log?")) {
            const auth = getAuth();
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "manpower_logs", id));
        }
    };

    return (
        <div className="space-y-8">
            <Card className="border-t-4 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="text-blue-600" /> {editingId ? "Edit Time Log" : "Log Manpower Hours"}
                    </h2>
                    {editingId && <Button onClick={() => setEditingId(null)} variant="secondary">Cancel</Button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Date" type="date" value={log.date} onChange={e => setLog({...log, date: e.target.value})} />
                    <Input label="Staff Name" placeholder="e.g. Juan Dela Cruz" value={log.staffName} onChange={e => setLog({...log, staffName: e.target.value})} />
                    <select className="w-full p-2 border rounded mt-6" value={log.companyId} onChange={e => setLog({...log, companyId: e.target.value})}>
                        <option value="">-- Select Project/Company --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Input label="Hours Worked" type="number" value={log.hours} onChange={e => setLog({...log, hours: e.target.value})} />
                    <Input label="Hourly Rate (₱)" type="number" value={log.hourlyRate} onChange={e => setLog({...log, hourlyRate: e.target.value})} />
                    <div className="mt-8 font-bold text-blue-700">
                        Total Cost: ₱{(parseFloat(log.hours || 0) * parseFloat(log.hourlyRate || 0)).toLocaleString()}
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={handleSave} variant="primary" disabled={loading}>
                        <Save className="mr-2" size={16} /> Save Work Log
                    </Button>
                </div>
            </Card>

            <Card>
                <h3 className="font-bold mb-4">Project Manpower History</h3>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                            <th className="p-3 border">Date</th>
                            <th className="p-3 border">Staff</th>
                            <th className="p-3 border">Hours</th>
                            <th className="p-3 border">Cost</th>
                            <th className="p-3 border text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timeLogs.map(item => (
                            <tr key={item.id} className="border-b">
                                <td className="p-3 border">{item.date}</td>
                                <td className="p-3 border font-bold">{item.staffName}</td>
                                <td className="p-3 border">{item.hours} hrs</td>
                                <td className="p-3 border text-blue-700 font-mono">₱{item.totalCost?.toLocaleString()}</td>
                                <td className="p-3 border text-center">
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default ManpowerLogger;
