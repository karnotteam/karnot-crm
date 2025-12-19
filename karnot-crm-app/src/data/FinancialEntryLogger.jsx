import React, { useState, useEffect } from 'react';
import { Save, Landmark, ArrowRightLeft, ReceiptText } from 'lucide-react';
import { Card, Button, Input, Textarea, Section, KARNOT_CHART_OF_ACCOUNTS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FinancialEntryLogger = ({ companies = [] }) => {
    const [loading, setLoading] = useState(false);
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        subCategory: '',
        amountUSD: '',
        amountPHP: '',
        forexRate: 58.75, // Matches your FX_RATES constant
        companyId: '',
        reference: '',
        description: ''
    });

    // Automatically calculate PHP if USD is typed, and vice versa
    const handleAmountChange = (value, type) => {
        const numValue = parseFloat(value) || 0;
        if (type === 'USD') {
            setEntry(prev => ({
                ...prev,
                amountUSD: value,
                amountPHP: (numValue * prev.forexRate).toFixed(2)
            }));
        } else {
            setEntry(prev => ({
                ...prev,
                amountPHP: value,
                amountUSD: (numValue / prev.forexRate).toFixed(2)
            }));
        }
    };

    const handleSave = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return alert("Please log in first");
        if (!entry.subCategory || !entry.amountPHP) return alert("Please select a line item and enter an amount");

        setLoading(true);
        try {
            // Save to a new collection called 'ledger'
            await addDoc(collection(db, "users", auth.currentUser.uid, "ledger"), {
                ...entry,
                amountPHP: parseFloat(entry.amountPHP),
                amountUSD: parseFloat(entry.amountUSD),
                createdAt: new Date().toISOString(),
                type: 'EXPENSE'
            });

            alert("Posted to Ledger successfully!");
            // Reset form for next entry
            setEntry(prev => ({ ...prev, amountUSD: '', amountPHP: '', reference: '', description: '' }));
        } catch (error) {
            console.error("Error saving to ledger:", error);
            alert("Failed to save entry.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8 border-b-2 border-orange-500 pb-4">
                <Landmark className="text-orange-600" size={32} />
                <h2 className="text-3xl font-bold text-gray-800">Financial Ledger Entry</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* LEFT COLUMN: CATEGORY & DATE */}
                <Section title="1. Categorization">
                    <div className="space-y-4">
                        <Input label="Transaction Date" type="date" value={entry.date} onChange={e => setEntry({...entry, date: e.target.value})} />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Account Group</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500"
                                value={entry.category}
                                onChange={(e) => setEntry({...entry, category: e.target.value, subCategory: ''})}
                            >
                                <option value="">-- Select Group --</option>
                                {Object.keys(KARNOT_CHART_OF_ACCOUNTS).map(cat => (
                                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>

                        {entry.category && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">P&L Line Item</label>
                                <select 
                                    className="w-full px-3 py-2 border border-orange-300 bg-orange-50 rounded-md focus:ring-orange-500 font-semibold"
                                    value={entry.subCategory}
                                    onChange={(e) => setEntry({...entry, subCategory: e.target.value})}
                                >
                                    <option value="">-- Select Specific Account --</option>
                                    {KARNOT_CHART_OF_ACCOUNTS[entry.category].map(item => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <Input label="Reference (OR / Check / Invoice #)" value={entry.reference} onChange={e => setEntry({...entry, reference: e.target.value})} />
                    </div>
                </Section>

                {/* RIGHT COLUMN: MONEY & ALLOCATION */}
                <Section title="2. Values & Projects">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <Input label="Amount (USD)" type="number" value={entry.amountUSD} onChange={e => handleAmountChange(e.target.value, 'USD')} />
                            <div className="mt-6 text-gray-400"><ArrowRightLeft size={20} /></div>
                            <Input label="Amount (PHP)" type="number" value={entry.amountPHP} onChange={e => handleAmountChange(e.target.value, 'PHP')} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Link to Company (for Cost of Sales)</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={entry.companyId}
                                onChange={(e) => setEntry({...entry, companyId: e.target.value})}
                            >
                                <option value="">-- Internal Business Expense --</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                            </select>
                        </div>

                        <Textarea label="Notes / Memo" rows="3" value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} placeholder="e.g. Flight to Davao for installation..." />
                    </div>
                </Section>
            </div>

            <div className="flex justify-end mt-10 pt-6 border-t">
                <Button onClick={handleSave} variant="success" className="w-full md:w-auto px-12 py-3 text-lg" disabled={loading}>
                    <Save className="mr-2" size={20} />
                    {loading ? "Posting..." : "Post Entry to Ledger"}
                </Button>
            </div>
        </Card>
    );
};

export default FinancialEntryLogger;
