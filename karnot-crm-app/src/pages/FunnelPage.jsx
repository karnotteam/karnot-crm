import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { Plus, X, Edit, Trash2, FileText, DollarSign, Building, ChevronLeft, ChevronRight, Calendar, Mail, FileSpreadsheet, Copy } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { CompanySearchSelector, DuplicateCompanyCleaner } from '../components/CompanySearchSelector.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';

const STAGE_ORDER = [
    'Lead',
    'Qualifying',
    'Site Visit / Demo',
    'Proposal Sent',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost'
];

// ==========================================
// EMAIL TEMPLATES
// ==========================================
const EMAIL_TEMPLATES = {
    initial_contact: {
        name: 'Initial Contact',
        subject: 'Clean Energy Solution for {{company}}',
        body: `Dear {{contact}},

Thank you for your interest in Karnot Energy Solutions' natural refrigerant heat pump systems.

We specialize in PFAS-free, environmentally-friendly heating and cooling solutions using CO₂ and R290 technology for commercial and industrial applications.

Our systems offer:
• 48% cost advantage over traditional systems
• Proven technology with international certifications
• BOI-SIPP registered supplier
• Full installation and maintenance support

I'd like to schedule a brief call to discuss how our technology can benefit {{company}}.

Are you available for a 15-minute call this week?

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
Phone: [Your Phone]
Email: [Your Email]`
    },
    follow_up: {
        name: 'Follow-Up After Demo',
        subject: 'Following Up: {{company}} Heat Pump Project',
        body: `Dear {{contact}},

Thank you for taking the time to meet with us regarding the {{project}} project.

As discussed, our R290 heat pump system can deliver:
• Estimated annual savings: ${{savings}}
• Payback period: {{payback}} months
• Reduced carbon footprint
• Compliance with latest environmental regulations

I've attached our formal proposal for your review.

Would you like to schedule a follow-up call to discuss any questions?

Looking forward to working with {{company}}.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.`
    },
    proposal_sent: {
        name: 'Proposal Sent',
        subject: 'Proposal: {{project}} - Karnot Energy Solutions',
        body: `Dear {{contact}},

Please find attached our detailed proposal for the {{project}} at {{company}}.

Proposal Summary:
• Total Investment: ${{value}}
• Estimated ROI: {{roi}}%
• Implementation Timeline: {{timeline}} weeks
• Warranty: 5 years comprehensive

Our proposal includes:
✓ Complete system design
✓ Professional installation
✓ Commissioning and training
✓ Maintenance contract options

The proposal is valid for 60 days. We're happy to discuss any adjustments or answer questions.

Next Steps:
1. Review the proposal
2. Schedule a technical Q&A session
3. Site survey (if needed)
4. Final approval and contract signing

I'll follow up with you next week to discuss your thoughts.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.`
    },
    negotiation: {
        name: 'Negotiation Phase',
        subject: 'Re: {{project}} - Addressing Your Questions',
        body: `Dear {{contact}},

Thank you for your questions regarding the {{project}} proposal.

I'd like to address your key concerns:

[Address specific concerns here]

We value our partnership with {{company}} and want to ensure this project meets all your requirements.

I'm available this week for a call to discuss any adjustments to the proposal.

Please let me know a convenient time.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.`
    },
    won: {
        name: 'Project Won - Welcome',
        subject: 'Welcome to Karnot Energy Solutions!',
        body: `Dear {{contact}},

Congratulations! We're thrilled to begin working with {{company}} on the {{project}}.

Next Steps:
1. Contract signing (this week)
2. Deposit payment and scheduling
3. Pre-installation site survey
4. Equipment delivery and installation
5. Commissioning and training

Your dedicated project team:
• Project Manager: [Name]
• Lead Technician: [Name]
• Support Contact: [Email/Phone]

We'll keep you updated at every stage of the project.

Thank you for choosing Karnot Energy Solutions. We're committed to delivering exceptional results.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.`
    }
};

// ==========================================
// EMAIL TEMPLATE MODAL
// ==========================================
const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('initial_contact');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [copied, setCopied] = useState(false);

    // Replace template variables
    const fillTemplate = (text) => {
        const value = Number(opportunity.estimatedValue) || 0;
        const savings = Math.round(value * 0.3);
        
        return text
            .replace(/{{company}}/g, opportunity.customerName || '[Company Name]')
            .replace(/{{contact}}/g, opportunity.contactName || '[Contact Name]')
            .replace(/{{project}}/g, opportunity.project || '[Project Name]')
            .replace(/{{value}}/g, value.toLocaleString())
            .replace(/{{savings}}/g, savings.toLocaleString())
            .replace(/{{payback}}/g, '18-24')
            .replace(/{{roi}}/g, '35')
            .replace(/{{timeline}}/g, '8-12');
    };

    useEffect(() => {
        const template = EMAIL_TEMPLATES[selectedTemplate];
        setSubject(fillTemplate(template.subject));
        setBody(fillTemplate(template.body));
    }, [selectedTemplate, opportunity]);

    const handleCopy = () => {
        const fullEmail = `To: ${opportunity.contactEmail || ''}\nSubject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenEmail = () => {
        const mailtoLink = `mailto:${opportunity.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b bg-orange-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase">
                                Email Templates
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {opportunity.customerName} - {opportunity.project}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Template Selector */}
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                            Select Template
                        </label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                        >
                            {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                                <option key={key} value={key}>{template.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                            To
                        </label>
                        <Input value={opportunity.contactEmail || ''} readOnly />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                            Subject
                        </label>
                        <Input 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-2 block">
                            Message Body
                        </label>
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={16}
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Template Variables Info */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 font-bold mb-2">
                            📝 Template Variables (auto-filled):
                        </p>
                        <div className="text-xs text-blue-600 space-y-1">
                            <p>• <code>{"{{company}}"}</code> = {opportunity.customerName}</p>
                            <p>• <code>{"{{contact}}"}</code> = {opportunity.contactName}</p>
                            <p>• <code>{"{{project}}"}</code> = {opportunity.project}</p>
                            <p>• <code>{"{{value}}"}</code> = ${(opportunity.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <Button
                        onClick={handleOpenEmail}
                        variant="primary"
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                        disabled={!opportunity.contactEmail}
                    >
                        <Mail size={16} className="mr-2" />
                        Open in Email Client
                    </Button>
                    <Button
                        onClick={handleCopy}
                        variant="secondary"
                        className="flex-1"
                    >
                        <Copy size={16} className="mr-2" />
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// ==========================================
// OPPORTUNITY CARD COMPONENT
// ==========================================
const OpportunityCard = ({ opp, onUpdate, onDelete, onEdit, onOpen, onEmail, quotesForThisOpp, companyData, upcomingAppointments }) => {
    const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
    const nextStage = STAGE_ORDER[currentStageIndex + 1];
    const previousStage = STAGE_ORDER[currentStageIndex - 1];

    const handleMoveForward = () => {
        if (nextStage) {
            onUpdate(opp.id, nextStage);
        }
    };

    const handleMoveBackward = () => {
        if (previousStage) {
            onUpdate(opp.id, previousStage);
        }
    };

    const companyQuoteCount = companyData?.quoteCount || 0;
    const companyTotalValue = companyData?.totalValue || 0;
    const companyLastQuoteDate = companyData?.lastQuoteDate || null;
    const nextAppointment = upcomingAppointments && upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
    
    return (
        <Card className="p-4 mb-3 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800">
                    {opp.customerName}
                </h4>
                <div className="flex gap-1">
                    <Button onClick={() => onEmail(opp)} variant="secondary" className="p-1 h-auto w-auto" title="Email Template">
                        <Mail size={14}/>
                    </Button>
                    <Button onClick={() => onEdit(opp)} variant="secondary" className="p-1 h-auto w-auto">
                        <Edit size={14}/>
                    </Button>
                    <Button onClick={() => onDelete(opp.id)} variant="danger" className="p-1 h-auto w-auto">
                        <Trash2 size={14}/>
                    </Button>
                </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{opp.project}</p>
            
            {/* Opportunity Value & Probability */}
            <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-orange-600">
                    ${(opp.estimatedValue || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {opp.probability || 0}%
                </span>
            </div>
            
            {/* Quote count for THIS opportunity */}
            {quotesForThisOpp && quotesForThisOpp.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                    <DollarSign size={12} />
                    <span>{quotesForThisOpp.length} Quote{quotesForThisOpp.length > 1 ? 's' : ''} for this Opportunity</span>
                </div>
            )}

            {/* Next Appointment Alert */}
            {nextAppointment && (
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    <Calendar size={12} />
                    <span className="font-semibold">
                        {nextAppointment.purpose} - {new Date(nextAppointment.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ {nextAppointment.appointmentTime}
                    </span>
                </div>
            )}

            {/* Company History Data */}
            {companyData && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-gray-600">
                            <Building size={12} />
                            <span>Company History</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Total Quotes:</span>
                        <span className="font-semibold text-gray-700">{companyQuoteCount}</span>
                    </div>
                    
                    {companyTotalValue > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Total Value:</span>
                            <span className="font-semibold text-green-600">${companyTotalValue.toLocaleString()}</span>
                        </div>
                    )}
                    
                    {companyLastQuoteDate && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Last Quote:</span>
                            <span className="font-semibold text-gray-700">
                                {new Date(companyLastQuoteDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    )}

                    {upcomingAppointments && upcomingAppointments.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Scheduled Visits:</span>
                            <span className="font-semibold text-blue-600">{upcomingAppointments.length}</span>
                        </div>
                    )}
                </div>
            )}
            
            <Button onClick={() => onOpen(opp)} variant="secondary" className="w-full text-xs py-1 mt-3">
                <FileText size={14} className="mr-2"/> View Details / Notes
            </Button>

            {/* Move Backward and Forward buttons */}
            {(opp.stage !== 'Closed-Won' && opp.stage !== 'Closed-Lost') && (
                <div className="mt-2 flex gap-2">
                    {previousStage && (
                        <Button 
                            onClick={handleMoveBackward} 
                            variant="secondary" 
                            className="flex-1 text-xs py-1 flex items-center justify-center"
                        >
                            <ChevronLeft size={14} className="mr-1" /> Back
                        </Button>
                    )}
                    {nextStage && (
                        <Button 
                            onClick={handleMoveForward} 
                            variant="secondary" 
                            className="flex-1 text-xs py-1 flex items-center justify-center"
                        >
                            Forward <ChevronRight size={14} className="ml-1" />
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
};

// ==========================================
// NEW OPPORTUNITY MODAL
// ==========================================
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies, contacts }) => {
    const isEditMode = Boolean(opportunityToEdit);
    
    const [companyId, setCompanyId] = useState('');
    const [contactId, setContactId] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactEmail, setContactEmail] = useState('');

    // Filter contacts by matching companyName
    const availableContacts = useMemo(() => {
        if (!companyId) return [];
        const selectedCompany = companies.find(c => c.id === companyId);
        if (!selectedCompany) return [];
        
        return contacts.filter(contact => contact.companyName === selectedCompany.companyName);
    }, [companyId, companies, contacts]);

    useEffect(() => {
        if (isEditMode) {
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            const foundCompanyId = company ? company.id : '';
            
            setCompanyId(foundCompanyId);
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            
            if (foundCompanyId) {
                const relatedContacts = contacts.filter(c => c.companyName === company.companyName);
                const contact = relatedContacts.find(c => 
                    `${c.firstName} ${c.lastName}` === opportunityToEdit.contactName
                );

                if (contact) {
                    setContactId(contact.id);
                    setContactEmail(contact.email);
                } else {
                    setContactId('');
                    setContactEmail(opportunityToEdit.contactEmail || '');
                }
            }
        } else {
            const defaultCompanyId = companies.length > 0 ? companies[0].id : '';
            setCompanyId(defaultCompanyId);
            setProject('');
            setEstimatedValue(0);
            setProbability(10);
            
            if (defaultCompanyId) {
                const defaultCompany = companies.find(c => c.id === defaultCompanyId);
                const defaultContacts = contacts.filter(c => c.companyName === defaultCompany.companyName);
                if (defaultContacts.length > 0) {
                    setContactId(defaultContacts[0].id);
                    setContactEmail(defaultContacts[0].email);
                } else {
                    setContactId('');
                    setContactEmail('');
                }
            }
        }
    }, [opportunityToEdit, isEditMode, companies, contacts]);

    const handleCompanySelect = (selectedCompanyId) => {
        setCompanyId(selectedCompanyId);

        // Auto-select the first contact from this new company
        const newCompany = companies.find(c => c.id === selectedCompanyId);
        if (newCompany) {
            const newContacts = contacts.filter(c => c.companyName === newCompany.companyName);
            if (newContacts.length > 0) {
                setContactId(newContacts[0].id);
                setContactEmail(newContacts[0].email);
            } else {
                setContactId('');
                setContactEmail('');
            }
        }
    };

    const handleContactChange = (e) => {
        const newContactId = e.target.value;
        setContactId(newContactId);
        
        const contact = contacts.find(c => c.id === newContactId);
        if (contact) {
            setContactEmail(contact.email);
        } else {
            setContactEmail('');
        }
    };

    const handleSave = async () => {
        const selectedCompany = companies.find(c => c.id === companyId);
        const selectedContact = contacts.find(c => c.id === contactId);

        if (!selectedCompany) {
            alert('Please select a valid company.');
            return;
        }
        
        if (!selectedContact) {
            alert('Please select a valid contact.');
            return;
        }
        
        const oppData = {
            companyId: selectedCompany.id,
            customerName: selectedCompany.companyName,
            customerAddress: selectedCompany.address || '',
            customerTIN: selectedCompany.tin || '',
            project,
            estimatedValue: Number(estimatedValue),
            probability: Number(probability),
            contactId: selectedContact.id,
            contactName: `${selectedContact.firstName} ${selectedContact.lastName}`,
            contactEmail: selectedContact.email,
        };
        
        onSave(oppData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Opportunity' : 'New Opportunity'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    
                    {/* Company Selector with Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                        <CompanySearchSelector
                            companies={companies}
                            selectedCompanyId={companyId}
                            onSelect={handleCompanySelect}
                            placeholder="Search companies..."
                        />
                    </div>

                    <Input 
                        label="Project Name" 
                        value={project} 
                        onChange={(e) => setProject(e.target.value)} 
                        placeholder="e.g., Laguna Plant - Cooling/Heat Recovery" 
                        required 
                    />
                    <Input 
                        label="Estimated Value ($)" 
                        type="number" 
                        value={estimatedValue} 
                        onChange={(e) => setEstimatedValue(e.target.value)} 
                    />
                    <Input 
                        label="Probability (%)" 
                        type="number" 
                        value={probability} 
                        onChange={(e) => setProbability(e.target.value)} 
                    />

                    <hr className="my-2"/>
                    <h4 className="text-lg font-semibold text-gray-700">Primary Contact</h4>
                    
                    {/* Smart Contact Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <select
                            value={contactId}
                            onChange={handleContactChange}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            required
                            disabled={availableContacts.length === 0}
                        >
                            {availableContacts.length === 0 ? (
                                <option value="">No contacts found for this company</option>
                            ) : (
                                availableContacts.map(contact => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.firstName} {contact.lastName} ({contact.jobTitle})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    
                    {/* Auto-filled Email */}
                    <Input 
                        label="Contact Email" 
                        type="email" 
                        value={contactEmail} 
                        readOnly 
                        disabled 
                    />

                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> 
                        {isEditMode ? 'Update Opportunity' : 'Save Opportunity'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// ==========================================
// MAIN FUNNEL PAGE COMPONENT
// ==========================================
const FunnelPage = ({ opportunities, user, onOpen, companies, contacts, appointments = [] }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [loadingQuotes, setLoadingQuotes] = useState(true);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailOpportunity, setEmailOpportunity] = useState(null);
    const [showDuplicateCleaner, setShowDuplicateCleaner] = useState(false);
    
    const STAGES = STAGE_ORDER;

    // Fetch quotes from Firebase
    useEffect(() => {
        const fetchQuotes = async () => {
            if (!user || !user.uid) return;
            
            setLoadingQuotes(true);
            try {
                const quotesSnapshot = await getDocs(collection(db, "users", user.uid, "quotes"));
                const quotesData = quotesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setQuotes(quotesData);
                console.log("Loaded quotes:", quotesData.length);
            } catch (error) {
                console.error("Error fetching quotes:", error);
            } finally {
                setLoadingQuotes(false);
            }
        };

        fetchQuotes();
    }, [user]);

    const getQuotesForOpportunity = (opportunityId) => {
        return quotes.filter(quote => quote.opportunityId === opportunityId);
    };

    const getCompanyData = (companyName) => {
        const companyQuotes = quotes.filter(q => q.customerName === companyName || q.customer?.name === companyName);
        
        if (companyQuotes.length === 0) return null;

        const totalValue = companyQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0);
        const lastQuoteDate = companyQuotes
            .map(q => q.createdAt)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0];

        return {
            quoteCount: companyQuotes.length,
            totalValue: totalValue,
            lastQuoteDate: lastQuoteDate
        };
    };

    const getUpcomingAppointments = (companyName) => {
        if (!appointments || appointments.length === 0) return [];
        
        const now = new Date();
        return appointments
            .filter(apt => 
                apt.companyName === companyName &&
                apt.status !== 'Completed' &&
                apt.status !== 'Cancelled' &&
                new Date(apt.appointmentDate) >= now
            )
            .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
    };

    const handleSaveOpportunity = async (newOppData) => {
        if (!user || !user.uid) {
            alert("Error: You are not logged in.");
            return;
        }
        try {
            const newOpp = {
                ...newOppData,
                stage: 'Lead', 
                createdAt: serverTimestamp(), 
                notes: [] 
            };
            await addDoc(collection(db, "users", user.uid, "opportunities"), newOpp);
            console.log("Opportunity saved!");
            handleCloseModal(); 
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save opportunity. Check console.");
        }
    };

    const handleUpdateFullOpportunity = async (oppData) => {
        if (!editingOpportunity || !editingOpportunity.id) {
            alert("Error: No opportunity selected for update.");
            return;
        }
        if (!user || !user.uid) {
            alert("Error: User not logged in.");
            return;
        }

        const oppRef = doc(db, "users", user.uid, "opportunities", editingOpportunity.id);
        try {
            await setDoc(oppRef, {
                ...oppData, 
                lastModified: serverTimestamp() 
            }, { merge: true }); 
            
            console.log("Opportunity updated!");
            handleCloseModal(); 
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update opportunity.");
        }
    };

    const handleSave = (oppDataFromModal) => {
        if (editingOpportunity) {
            handleUpdateFullOpportunity(oppDataFromModal);
        } else {
            handleSaveOpportunity(oppDataFromModal);
        }
    };

    const handleOpenNewModal = () => {
        setEditingOpportunity(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (opp) => {
        setEditingOpportunity(opp);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingOpportunity(null);
    };

    const handleOpenEmailModal = (opp) => {
        setEmailOpportunity(opp);
        setShowEmailModal(true);
    };

    const handleUpdateOpportunityStage = async (oppId, newStage) => {
        if (!user || !user.uid) {
            alert("Error: User not logged in.");
            return;
        }
        
        const oppRef = doc(db, "users", user.uid, "opportunities", oppId);
        let newProbability;
        
        switch (newStage) {
            case 'Lead': newProbability = 10; break;
            case 'Qualifying': newProbability = 25; break;
            case 'Site Visit / Demo': newProbability = 50; break;
            case 'Proposal Sent': newProbability = 75; break;
            case 'Negotiation': newProbability = 90; break;
            case 'Closed-Won': newProbability = 100; break;
            case 'Closed-Lost': newProbability = 0; break;
            default: newProbability = 0;
        }
        
        try {
            await setDoc(oppRef, {
                stage: newStage,
                probability: newProbability,
                lastModified: serverTimestamp()
            }, { merge: true });
            console.log(`Opportunity ${oppId} updated to ${newStage}`);
        } catch (error) {
            console.error("Error updating opportunity: ", error);
            alert("Failed to update lead stage.");
        }
    };

    const handleDeleteOpportunity = async (oppId) => {
        if (!user || !user.uid) {
            alert("Error: User not logged in.");
            return;
        }
        
        if (window.confirm("Are you sure you want to permanently delete this Opportunity?")) {
            const oppRef = doc(db, "users", user.uid, "opportunities", oppId);
            try {
                await deleteDoc(oppRef);
                console.log(`Opportunity ${oppId} deleted`);
            } catch (error) {
                console.error("Error deleting opportunity: ", error);
                alert("Failed to delete lead.");
            }
        }
    };

    const getOppsByStage = (stage) => {
        if (!opportunities) return []; 
        return opportunities.filter(opp => opp.stage === stage);
    };

    // Prepare export data
    const exportData = useMemo(() => {
        if (!opportunities) return [];
        
        return opportunities.map(opp => ({
            customerName: opp.customerName,
            project: opp.project,
            stage: opp.stage,
            estimatedValue: opp.estimatedValue || 0,
            probability: opp.probability || 0,
            contactName: opp.contactName,
            contactEmail: opp.contactEmail,
            createdAt: opp.createdAt?.toDate ? opp.createdAt.toDate().toLocaleDateString() : ''
        }));
    }, [opportunities]);

    return (
        <div className="w-full">
            {/* Modals */}
            {showModal && (
                <NewOpportunityModal 
                    onSave={handleSave} 
                    onClose={handleCloseModal}
                    opportunityToEdit={editingOpportunity} 
                    companies={companies}
                    contacts={contacts} 
                />
            )}

            {showEmailModal && emailOpportunity && (
                <EmailTemplateModal
                    opportunity={emailOpportunity}
                    onClose={() => {
                        setShowEmailModal(false);
                        setEmailOpportunity(null);
                    }}
                />
            )}

            {showDuplicateCleaner && (
                <DuplicateCompanyCleaner
                    companies={companies}
                    user={user}
                    onClose={() => setShowDuplicateCleaner(false)}
                />
            )}
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1>
                
                <div className="flex flex-wrap gap-2">
                    {/* Clean Duplicates Button */}
                    <Button
                        onClick={() => setShowDuplicateCleaner(true)}
                        variant="secondary"
                        className="border-orange-200 text-orange-700 bg-orange-50"
                    >
                        <Copy size={16} className="mr-1" /> Clean Duplicates
                    </Button>

                    {/* Export Button */}
                    <ExportButton
                        data={exportData}
                        filename={`Karnot_Sales_Funnel_${new Date().toISOString().split('T')[0]}.csv`}
                        columns={[
                            { key: 'customerName', label: 'Company' },
                            { key: 'project', label: 'Project' },
                            { key: 'stage', label: 'Stage' },
                            { key: 'estimatedValue', label: 'Value ($)' },
                            { key: 'probability', label: 'Probability (%)' },
                            { key: 'contactName', label: 'Contact' },
                            { key: 'contactEmail', label: 'Email' },
                            { key: 'createdAt', label: 'Date Created' }
                        ]}
                        label="Export"
                    />

                    {/* New Opportunity Button */}
                    <Button onClick={handleOpenNewModal} variant="primary">
                        <Plus className="mr-2" size={16} /> New Opportunity
                    </Button>
                </div>
            </div>

            {loadingQuotes && (
                <div className="text-center text-gray-500 mb-4">Loading quotes...</div>
            )}

            {/* Pipeline Columns */}
            <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight: '60vh'}}>
                {STAGES.map(stage => {
                    const stageOpps = getOppsByStage(stage);
                    const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
                    
                    let columnBg = "bg-gray-200";
                    if (stage === 'Closed-Won') columnBg = "bg-green-100";
                    if (stage === 'Closed-Lost') columnBg = "bg-red-100";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} p-3 rounded-xl shadow-sm`}>
                            <div className="mb-3 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">{stage} ({stageOpps.length})</h3>
                                <span className="text-sm font-bold text-gray-700">${stageValue.toLocaleString()}</span>
                            </div>
                            <div className="h-full space-y-3">
                                {stageOpps
                                    .sort((a, b) => b.estimatedValue - a.estimatedValue) 
                                    .map(opp => (
                                        <OpportunityCard 
                                            key={opp.id} 
                                            opp={opp} 
                                            onUpdate={handleUpdateOpportunityStage}
                                            onDelete={handleDeleteOpportunity}
                                            onEdit={handleOpenEditModal}
                                            onOpen={onOpen}
                                            onEmail={handleOpenEmailModal}
                                            quotesForThisOpp={getQuotesForOpportunity(opp.id)}
                                            companyData={getCompanyData(opp.customerName)}
                                            upcomingAppointments={getUpcomingAppointments(opp.customerName)}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FunnelPage;
