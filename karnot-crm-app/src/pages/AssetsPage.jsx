import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from '../data/constants';
import { Plus, Package, Edit, Trash2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const EQUIPMENT_TYPES = {
    'iSTOR_CO2': 'iSTOR CO₂ Heat Pump',
    'iHEAT_R290': 'iHEAT R290 Heat Pump',
    'HYBRID_SYSTEM': 'Hybrid System',
    'CUSTOM': 'Custom Installation'
};

const AssetsPage = ({ companies, user }) => {
    const [assets, setAssets] = useState([]);
    const [showNewAsset, setShowNewAsset] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        equipment_type: 'iSTOR_CO2',
        serial_number: '',
        model: '',
        capacity_kw: '',
        client_ref: '',
        installation_address: '',
        installation_date: new Date().toISOString().split('T')[0],
        commissioning_date: '',
        warranty_expiry: '',
        status: 'Active', // Active, Decommissioned, Under_Maintenance
        notes: ''
    });

    useEffect(() => {
        const assetsQuery = query(collection(db, 'assets'), orderBy('installation_date', 'desc'));
        const unsubscribe = onSnapshot(assetsQuery, (snapshot) => {
            const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssets(assetsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSaveAsset = async () => {
        try {
            // Auto-calculate warranty expiry (1 year from commissioning or installation)
            if (!formData.warranty_expiry && (formData.commissioning_date || formData.installation_date)) {
                const baseDate = new Date(formData.commissioning_date || formData.installation_date);
                baseDate.setFullYear(baseDate.getFullYear() + 1);
                formData.warranty_expiry = baseDate.toISOString().split('T')[0];
            }

            const assetData = {
                ...formData,
                capacity_kw: parseFloat(formData.capacity_kw) || 0,
                created_at: new Date().toISOString(),
                created_by: user?.email || 'Unknown'
            };

            if (selectedAsset) {
                await updateDoc(doc(db, 'assets', selectedAsset.id), assetData);
            } else {
                await addDoc(collection(db, 'assets'), assetData);
            }

            // Reset form
            setShowNewAsset(false);
            setSelectedAsset(null);
            setFormData({
                equipment_type: 'iSTOR_CO2',
                serial_number: '',
                model: '',
                capacity_kw: '',
                client_ref: '',
                installation_address: '',
                installation_date: new Date().toISOString().split('T')[0],
                commissioning_date: '',
                warranty_expiry: '',
                status: 'Active',
                notes: ''
            });
        } catch (error) {
            console.error('Error saving asset:', error);
            alert('Error saving asset: ' + error.message);
        }
    };

    const handleDeleteAsset = async (assetId) => {
        if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'assets', assetId));
            } catch (error) {
                console.error('Error deleting asset:', error);
                alert('Error deleting asset: ' + error.message);
            }
        }
    };

    const handleEditAsset = (asset) => {
        setSelectedAsset(asset);
        setFormData({
            equipment_type: asset.equipment_type,
            serial_number: asset.serial_number,
            model: asset.model,
            capacity_kw: asset.capacity_kw,
            client_ref: asset.client_ref,
            installation_address: asset.installation_address,
            installation_date: asset.installation_date,
            commissioning_date: asset.commissioning_date || '',
            warranty_expiry: asset.warranty_expiry || '',
            status: asset.status,
            notes: asset.notes || ''
        });
        setShowNewAsset(true);
    };

    const getClientName = (clientRef) => {
        const company = companies.find(c => c.id === clientRef);
        return company?.name || clientRef;
    };

    const getWarrantyStatus = (warrantyExpiry) => {
        if (!warrantyExpiry) return { label: 'No Warranty', color: 'text-gray-500 bg-gray-100' };
        
        const today = new Date();
        const expiryDate = new Date(warrantyExpiry);
        
        if (expiryDate < today) return { label: 'Expired', color: 'text-red-700 bg-red-100' };
        
        const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) return { label: `${daysRemaining}d left`, color: 'text-orange-700 bg-orange-100' };
        
        return { label: 'Under Warranty', color: 'text-green-700 bg-green-100' };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'text-green-700 bg-green-100';
            case 'Under_Maintenance': return 'text-orange-700 bg-orange-100';
            case 'Decommissioned': return 'text-gray-700 bg-gray-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading assets...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Asset Registry</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Installed Equipment Inventory
                    </p>
                </div>
                <Button onClick={() => setShowNewAsset(true)} variant="primary">
                    <Plus size={16} className="mr-2" /> Register Asset
                </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-3xl font-black text-gray-800">{assets.length}</div>
                    <div className="text-xs uppercase font-bold text-gray-500">Total Assets</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-3xl font-black text-green-700">
                        {assets.filter(a => a.status === 'Active').length}
                    </div>
                    <div className="text-xs uppercase font-bold text-gray-500">Active</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-3xl font-black text-orange-700">
                        {assets.filter(a => getWarrantyStatus(a.warranty_expiry).label !== 'Expired' && a.warranty_expiry).length}
                    </div>
                    <div className="text-xs uppercase font-bold text-gray-500">Under Warranty</div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <div className="text-3xl font-black text-blue-700">
                        {assets.reduce((sum, a) => sum + (a.capacity_kw || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-xs uppercase font-bold text-gray-500">Total kW Capacity</div>
                </div>
            </div>

            {/* New/Edit Asset Form */}
            {showNewAsset && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 shadow-lg">
                    <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                        {selectedAsset ? 'Edit Asset' : 'Register New Asset'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Equipment Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Equipment Type</label>
                            <select
                                value={formData.equipment_type}
                                onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                {Object.entries(EQUIPMENT_TYPES).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Serial Number */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Serial Number *</label>
                            <input
                                type="text"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="SN-2025-001"
                            />
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Model</label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="iSTOR-500"
                            />
                        </div>

                        {/* Capacity */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Capacity (kW)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.capacity_kw}
                                onChange={(e) => setFormData({ ...formData, capacity_kw: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Client */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Client *</label>
                            <select
                                value={formData.client_ref}
                                onChange={(e) => setFormData({ ...formData, client_ref: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">Select Client</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Installation Address */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Installation Address</label>
                            <input
                                type="text"
                                value={formData.installation_address}
                                onChange={(e) => setFormData({ ...formData, installation_address: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="123 Industrial Ave, Pasig City"
                            />
                        </div>

                        {/* Installation Date */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Installation Date</label>
                            <input
                                type="date"
                                value={formData.installation_date}
                                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Commissioning Date */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commissioning Date</label>
                            <input
                                type="date"
                                value={formData.commissioning_date}
                                onChange={(e) => setFormData({ ...formData, commissioning_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Warranty Expiry */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Warranty Expiry</label>
                            <input
                                type="date"
                                value={formData.warranty_expiry}
                                onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="Active">Active</option>
                                <option value="Under_Maintenance">Under Maintenance</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Installation notes, special configurations, etc."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6">
                        <Button
                            onClick={() => {
                                setShowNewAsset(false);
                                setSelectedAsset(null);
                            }}
                            variant="secondary"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveAsset} variant="primary">
                            {selectedAsset ? 'Update Asset' : 'Register Asset'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Assets List */}
            <div className="grid gap-4">
                {assets.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <Package size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 font-bold uppercase text-sm">No assets registered</p>
                        <p className="text-gray-400 text-xs mt-1">Start by registering your first installation</p>
                    </div>
                ) : (
                    assets.map(asset => {
                        const warrantyStatus = getWarrantyStatus(asset.warranty_expiry);
                        
                        return (
                            <div key={asset.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Package size={24} className="text-orange-600" />
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800">
                                                    {EQUIPMENT_TYPES[asset.equipment_type]} - {asset.model}
                                                </h3>
                                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">
                                                    SN: {asset.serial_number}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 flex-wrap mt-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(asset.status)}`}>
                                                {asset.status.replace('_', ' ')}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${warrantyStatus.color}`}>
                                                {warrantyStatus.label}
                                            </span>
                                            {asset.capacity_kw > 0 && (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-700">
                                                    {asset.capacity_kw} kW
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 uppercase font-bold text-xs">Client:</span>
                                        <p className="text-gray-800 font-bold">{getClientName(asset.client_ref)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 uppercase font-bold text-xs">Location:</span>
                                        <p className="text-gray-800">{asset.installation_address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 uppercase font-bold text-xs">Installed:</span>
                                        <p className="text-gray-800">{asset.installation_date}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 uppercase font-bold text-xs">Commissioned:</span>
                                        <p className="text-gray-800">{asset.commissioning_date || 'Not yet'}</p>
                                    </div>
                                </div>

                                {asset.notes && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                        <p className="text-xs text-gray-600">{asset.notes}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button onClick={() => handleEditAsset(asset)} variant="secondary" className="flex-1">
                                        <Edit size={14} className="mr-1" /> Edit
                                    </Button>
                                    <Button onClick={() => handleDeleteAsset(asset.id)} variant="secondary" className="text-red-600 hover:bg-red-50">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AssetsPage;
