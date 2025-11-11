// src/pages/OpportunityDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { Mail, Phone, Hash, ArrowLeft, DollarSign, List, Calendar } from 'lucide-react';
// FIX: Need to import all necessary components
import { Card, Button, Section, Input, Textarea } from '../data/constants.jsx'; 

// This component simulates the detail page for one lead
const OpportunityDetailPage = ({ opportunity, quotes, onBack, onAddQuote }) => {
    // Basic formatting for probability to look nice
    const formatProb = (p) => {
        if (p >= 90) return 'text-green-600';
        if (p >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (!opportunity) {
        return <div className="text-center p-10">Opportunity data not loaded.</div>;
    }

    // Filter quotes relevant to this opportunity (requires linking field to be added later)
    const relatedQuotes = quotes.filter(q => q.customer.name === opportunity.customerName);

    return (
        <div className="space-y-6">
            
            <Button onClick={onBack} variant="secondary" className="mb-4">
                <ArrowLeft size={16} className="mr-2"/> Back to Funnel
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- Column 1: Opportunity Details --- */}
                <Card className="lg:col-span-2">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{opportunity.customerName}</h2>
                    <p className="text-xl font-semibold text-orange-600 mb-6">{opportunity.project}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">Estimated Value</p>
                            <p className="text-2xl font-bold text-green-700">${opportunity.estimatedValue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">Current Stage / Win Chance</p>
                            <p className={`text-2xl font-bold ${formatProb(opportunity.probability)}`}>{opportunity.stage} ({opportunity.probability}%)</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                            <p className="text-sm text-gray-500">Created At</p>
                            <p className="text-base font-medium">
                                {opportunity.createdAt && opportunity.createdAt.toDate().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* --- Column 2: Contact & Notes --- */}
                <Card>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center mb-4">Contact Info</h3>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Hash size={18} className="text-orange-500"/>
                            <span className="font-medium">{opportunity.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-orange-500"/>
                            <span className="text-sm text-gray-600">{opportunity.contactEmail}</span>
                        </div>
                        
                        <Section title="Activity/Notes">
                            <Textarea rows="4" placeholder="Add a new activity log or note..." />
                            <Button className="mt-2 w-full" variant="secondary">Add Note</Button>
                        </Section>
                    </div>
                </Card>
            </div>

            {/* --- Quotes Section --- */}
            <Card>
                <Section title="Related Quotes">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Quotes ({relatedQuotes.length})</h3>
                        <Button onClick={onAddQuote} variant="primary">
                            <Plus size={16} className="mr-2"/> Create New Quote
                        </Button>
                    </div>
                    
                    {relatedQuotes.length > 0 ? (
                        <ul className="space-y-2">
                            {relatedQuotes.map(q => (
                                <li key={q.id} className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                                    <span className="font-medium text-gray-700 flex items-center gap-2"><FileText size={16}/> Quote: {q.id}</span>
                                    <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${q.status === 'APPROVED' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                        ${(q.finalSalesPrice || 0).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic">No quotes created for this opportunity yet.</p>
                    )}
                </Section>
            </Card>

        </div>
    );
};

export default OpportunityDetailPage;