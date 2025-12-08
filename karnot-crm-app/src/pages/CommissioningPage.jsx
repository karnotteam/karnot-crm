import React, { useState } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CommissioningPage({ user, onBack }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        heatPumpSerial: '',
        tankSerial: '',
        ventilation: false,
        ignition: false,
        drains: false,
        distances: false,
        filterCheck: '',
        anodeCheck: false,
        safetyValve: false,
        waterFlow: '',
        currentDraw: '',
        deltaT: '',
        notes: ''
    });

    const [photo, setPhoto] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.ventilation || !formData.drains) {
            alert("CRITICAL SAFETY: You must verify Ventilation and Floor Drains for R290 units.");
            return;
        }

        setLoading(true);

        try {
            let photoUrl = "";

            if (photo) {
                const storageRef = ref(storage, `commissioning/${user.uid}/${Date.now()}_leakcheck.jpg`);
                const snapshot = await uploadBytes(storageRef, photo);
                photoUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, "users", user.uid, "commissioning_reports"), {
                ...formData,
                engineerId: user.uid,
                engineerEmail: user.email,
                leakCheckPhoto: photoUrl,
                status: 'Completed',
                createdAt: serverTimestamp()
            });

            alert("Commissioning Report Saved Successfully!");
            onBack(); 

        } catch (error) {
            console.error("Error saving report:", error);
            alert("Error saving report: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-orange-600 mb-6 flex items-center gap-2">
                <CheckCircle /> Commissioning: iHEAT R290
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Customer / Site Name</label>
                        <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Heat Pump Serial</label>
                        <input type="text" name="heatPumpSerial" value={formData.heatPumpSerial} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                    </div>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <h3 className="font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={20}/> R290 Safety Protocols (Mandatory)
                    </h3>
                    <div className="mt-3 space-y-2">
                        <label className="flex items-center space-x-3">
                            <input type="checkbox" name="ventilation" checked={formData.ventilation} onChange={handleChange} className="h-5 w-5 text-red-600" />
                            <span>Ventilation Verified (Outdoor/Mechanical)</span>
                        </label>
                        <label className="flex items-center space-x-3">
                            <input type="checkbox" name="drains" checked={formData.drains} onChange={handleChange} className="h-5 w-5 text-red-600" />
                            <span>Floor Drains Sealed (Gas > Air)</span>
                        </label>
                        <label className="flex items-center space-x-3">
                            <input type="checkbox" name="ignition" checked={formData.ignition} onChange={handleChange} className="h-5 w-5 text-red-600" />
                            <span>No Ignition Sources within 3m</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Water Flow (L/m)</label>
                        <input type="number" name="waterFlow" value={formData.waterFlow} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Delta T (K)</label>
                        <input type="number" name="deltaT" value={formData.deltaT} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Current (Amps)</label>
                        <input type="number" name="currentDraw" value={formData.currentDraw} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                    </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center">
                    <label className="cursor-pointer block">
                        <Camera className="mx-auto text-gray-400 mb-2" />
                        <span className="text-gray-600">Upload Leak Check Photo</span>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                    {photo && <p className="text-sm text-green-600 mt-2">Selected: {photo.name}</p>}
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onBack} className="w-1/3 py-2 px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="w-2/3 py-2 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>

            </form>
        </div>
    );
}
