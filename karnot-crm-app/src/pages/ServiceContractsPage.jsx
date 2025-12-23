import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Button } from '../data/constants';
import { Plus, Calendar, CheckCircle, AlertCircle, Trash2, Edit, Eye, FileText, Download } from 'lucide-react';

const SERVICE_CONTRACT_TEMPLATES = {
    "Annual_3Q1A": {
        name: "Standard Annual Service Contract (3 Quarterly + 1 Annual)",
        visits_per_year: 4,
        quarterly_checks: 3,
        annual_services: 1,
        default_quarterly_checklist: [
            "Visual inspection of refrigerant lines",
            "Temperature differential check",
            "Electrical connections inspection",
            "Control system diagnostics",
            "Filter inspection"
        ],
        default_annual_checklist: [
            "Complete refrigerant system pressure test",
            "Heat exchanger cleaning",
            "Compressor oil analysis (CO₂ systems)",
            "Safety valve testing",
            "Full electrical system audit",
            "Filter replacement",
            "Firmware updates"
        ]
    },
    "Premium_6Q2A": {
        name: "Premium Bi-Monthly Service (6 Checks + 2 Annual)",
        visits_per_year: 8,
        quarterly_checks: 6,
        annual_services: 2,
        default_quarterly_checklist: [
            "Visual inspection of refrigerant lines",
            "Temperature differential check",
            "Electrical connections inspection",
            "Control system diagnostics",
            "Filter inspection",
            "Performance data logging"
        ],
        default_annual_checklist: [
            "Complete refrigerant system pressure test",
            "Heat exchanger deep cleaning",
            "Compressor oil analysis and replacement",
            "Safety valve testing and calibration",
            "Full electrical system audit",
            "Filter replacement",
            "Firmware updates",
            "Thermal imaging inspection"
        ]
    }
};

const ServiceContractsPage = ({ companies, user }) => {
    const [contracts, setContracts] = useState([]);
    const [assets, setAssets] = useState([]);
    const [showNewContract, setShowNewContract] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        client_ref: '',
        contract_type: 'Annual_3Q1A',
        start_date: new Date().toISOString().split('T')[0],
        contract_value: 48000,
        currency: 'PHP',
        payment_terms: 'Prepaid_Annual',
        auto_renew: true,
        asset_refs: [],
        quarterly_checklist: SERVICE_CONTRACT_TEMPLATES.Annual_3Q1A.default_quarterly_checklist,
        annual_checklist: SERVICE_CONTRACT_TEMPLATES.Annual_3Q1A.default_annual_checklist
    });

    // Load contracts and assets
    useEffect(() => {
        const contractsQuery = query(collection(db, 'service_contracts'), orderBy('start_date', 'desc'));
        const unsubContracts = onSnapshot(contractsQuery, (snapshot) => {
            const contractsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContracts(contractsData);
            setLoading(false);
        });

        // Load assets (you'll need to create this collection or link to existing installations)
        const assetsQuery = query(collection(db, 'assets'), orderBy('installation_date', 'desc'));
        const unsubAssets = onSnapshot(assetsQuery, (snapshot) => {
            const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssets(assetsData);
        });

        return () => {
            unsubContracts();
            unsubAssets();
        };
    }, []);

    const generateMaintenanceSchedule = (startDate, contractType) => {
        const template = SERVICE_CONTRACT_TEMPLATES[contractType];
        const events = [];
        const start = new Date(startDate);

        // Generate quarterly checks
        const monthsPerQuarter = 12 / template.quarterly_checks;
        for (let i = 1; i <= template.quarterly_checks; i++) {
            const dueDate = new Date(start);
            dueDate.setMonth(start.getMonth() + Math.round(i * monthsPerQuarter));
            
            events.push({
                visit_type: "Quarterly_Check",
                due_date: dueDate.toISOString().split('T')[0],
                status: "Pending",
                maintenance_event_ref: null
            });
        }

        // Generate annual service(s)
        for (let i = 1; i <= template.annual_services; i++) {
            const annualDate = new Date(start);
            annualDate.setFullYear(start.getFullYear() + i);
            annualDate.setDate(annualDate.getDate() - 14); // 2 weeks before anniversary

            events.push({
                visit_type: "Annual_Service",
                due_date: annualDate.toISOString().split('T')[0],
                status: "Pending",
                maintenance_event_ref: null
            });
        }

        return events.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    };

    const handleSaveContract = async () => {
        try {
            const endDate = new Date(formData.start_date);
            endDate.setFullYear(endDate.getFullYear() + 1);

            const contractData = {
                ...formData,
                end_date: endDate.toISOString().split('T')[0],
                scheduled_visits: generateMaintenanceSchedule(formData.start_date, formData.contract_type),
                status: 'Active',
                created_at: new Date().toISOString(),
                created_by: user?.email || 'Unknown'
            };

            if (selectedContract) {
                await updateDoc(doc(db, 'service_contracts', selectedContract.id), contractData);
            } else {
                await addDoc(collection(db, 'service_contracts'), contractData);
            }

            // Reset form
            setShowNewContract(false);
            setSelectedContract(null);
            setFormData({
                client_ref: '',
                contract_type: 'Annual_3Q1A',
                start_date: new Date().toISOString().split('T')[0],
                contract_value: 48000,
                currency: 'PHP',
                payment_terms: 'Prepaid_Annual',
                auto_renew: true,
                asset_refs: [],
                quarterly_checklist: SERVICE_CONTRACT_TEMPLATES.Annual_3Q1A.default_quarterly_checklist,
                annual_checklist: SERVICE_CONTRACT_TEMPLATES.Annual_3Q1A.default_annual_checklist
            });
        } catch (error) {
            console.error('Error saving contract:', error);
            alert('Error saving contract: ' + error.message);
        }
    };

    const handleDeleteContract = async (contractId) => {
        if (window.confirm('Are you sure you want to delete this contract? This will also cancel all scheduled maintenance events.')) {
            try {
                await deleteDoc(doc(db, 'service_contracts', contractId));
            } catch (error) {
                console.error('Error deleting contract:', error);
                alert('Error deleting contract: ' + error.message);
            }
        }
    };

    const handleEditContract = (contract) => {
        setSelectedContract(contract);
        setFormData({
            client_ref: contract.client_ref,
            contract_type: contract.contract_type,
            start_date: contract.start_date,
            contract_value: contract.contract_value,
            currency: contract.currency,
            payment_terms: contract.payment_terms,
            auto_renew: contract.auto_renew,
            asset_refs: contract.asset_refs || [],
            quarterly_checklist: contract.quarterly_checklist,
            annual_checklist: contract.annual_checklist
        });
        setShowNewContract(true);
    };

    const getClientName = (clientRef) => {
        const company = companies.find(c => c.id === clientRef);
        return company?.name || clientRef;
    };

    const getContractStatus = (contract) => {
        const today = new Date();
        const endDate = new Date(contract.end_date);
        
        if (contract.status === 'Cancelled') return { label: 'Cancelled', color: 'text-gray-500 bg-gray-100' };
        if (endDate < today) return { label: 'Expired', color: 'text-red-700 bg-red-100' };
        
        const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) return { label: `Expiring in ${daysUntilExpiry}d`, color: 'text-orange-700 bg-orange-100' };
        
        return { label: 'Active', color: 'text-green-700 bg-green-100' };
    };

    const getVisitProgress = (scheduledVisits) => {
        const completed = scheduledVisits?.filter(v => v.status === 'Completed').length || 0;
        const total = scheduledVisits?.length || 0;
        return { completed, total };
    };

    if (loading) {
        return <div className="p-8 text-center">Loading contracts...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Service Contracts</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Prepaid Maintenance Agreements
                    </p>
                </div>
                <Button onClick={() => setShowNewContract(true)} variant="primary">
                    <Plus size={16} className="mr-2" /> New Contract
                </Button>
            </div>

            {/* New/Edit Contract Form */}
            {showNewContract && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 shadow-lg">
                    <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                        {selectedContract ? 'Edit Contract' : 'New Service Contract'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Client Selection */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Client</label>
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

                        {/* Contract Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contract Type</label>
                            <select
                                value={formData.contract_type}
                                onChange={(e) => {
                                    const template = SERVICE_CONTRACT_TEMPLATES[e.target.value];
                                    setFormData({
                                        ...formData,
                                        contract_type: e.target.value,
                                        quarterly_checklist: template.default_quarterly_checklist,
                                        annual_checklist: template.default_annual_checklist
                                    });
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                {Object.entries(SERVICE_CONTRACT_TEMPLATES).map(([key, template]) => (
                                    <option key={key} value={key}>{template.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Contract Value */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contract Value (PHP)</label>
                            <input
                                type="number"
                                value={formData.contract_value}
                                onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Payment Terms */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Terms</label>
                            <select
                                value={formData.payment_terms}
                                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="Prepaid_Annual">Prepaid Annual</option>
                                <option value="Prepaid_Quarterly">Prepaid Quarterly</option>
                                <option value="Postpaid">Postpaid Per Visit</option>
                            </select>
                        </div>

                        {/* Auto-Renew */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.auto_renew}
                                onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                                className="mr-2"
                            />
                            <label className="text-xs font-bold text-gray-700 uppercase">Auto-Renew Contract</label>
                        </div>
                    </div>

                    {/* Quarterly Checklist */}
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Quarterly Check Items</label>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                            {formData.quarterly_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-green-600" />
                                    <span className="text-xs text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Annual Checklist */}
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Annual Service Items</label>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
                            {formData.annual_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6">
                        <Button
                            onClick={() => {
                                setShowNewContract(false);
                                setSelectedContract(null);
                            }}
                            variant="secondary"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveContract} variant="primary">
                            {selectedContract ? 'Update Contract' : 'Create Contract'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Contracts List */}
            <div className="grid gap-4">
                {contracts.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 font-bold uppercase text-sm">No service contracts yet</p>
                        <p className="text-gray-400 text-xs mt-1">Create your first prepaid maintenance contract</p>
                    </div>
                ) : (
                    contracts.map(contract => {
                        const status = getContractStatus(contract);
                        const progress = getVisitProgress(contract.scheduled_visits);
                        
                        return (
                            <div key={contract.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-black text-gray-800">{getClientName(contract.client_ref)}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">
                                            {SERVICE_CONTRACT_TEMPLATES[contract.contract_type]?.name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {contract.start_date} → {contract.end_date}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-gray-800">
                                            ₱{contract.contract_value.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 uppercase font-bold">
                                            {contract.payment_terms.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-600 uppercase">Service Completion</span>
                                        <span className="text-xs font-bold text-gray-800">{progress.completed} / {progress.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full transition-all"
                                            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button onClick={() => handleEditContract(contract)} variant="secondary" className="flex-1">
                                        <Edit size={14} className="mr-1" /> Edit
                                    </Button>
                                    <Button onClick={() => handleDeleteContract(contract.id)} variant="secondary" className="text-red-600 hover:bg-red-50">
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

export default ServiceContractsPage;
