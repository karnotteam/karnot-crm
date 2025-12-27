import React, { useState, useEffect } from 'react';
import { Mail, Copy, X } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

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
CEO, Karnot Energy Solutions Inc.`
    },
    cold_outreach_industrial: {
        name: 'Cold Outreach (Industrial)',
        subject: 'Reducing Thermal Costs at {{company}}',
        body: `Hi {{contact}},

I am reaching out regarding {{company}}'s industrial heating and cooling requirements.

At Karnot, we help facilities reduce thermal energy costs by up to 50% using Industrial Heat Pumps (Waste Heat Recovery). 

If you are currently running Chillers and Boilers separately, we can likely combine them into one efficient R290 system.

Do you have 10 minutes next Tuesday to discuss a potential thermal audit?

Best,
Stuart Cox
Karnot Energy Solutions`
    }
};

const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('initial_contact');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [copied, setCopied] = useState(false);

    // Replace template variables
    const fillTemplate = (text) => {
        const value = Number(opportunity.estimatedValue) || 0;
        
        return text
            .replace(/{{company}}/g, opportunity.customerName || opportunity.companyName || opportunity.name || '[Company Name]')
            .replace(/{{contact}}/g, opportunity.contactName || 'Partner')
            .replace(/{{project}}/g, opportunity.project || 'Energy Project')
            .replace(/{{value}}/g, '$' + value.toLocaleString());
    };

    useEffect(() => {
        const template = EMAIL_TEMPLATES[selectedTemplate];
        setSubject(fillTemplate(template.subject));
        setBody(fillTemplate(template.body));
    }, [selectedTemplate, opportunity]);

    const handleCopy = () => {
        const fullEmail = `Subject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenEmail = () => {
        const mailtoLink = `mailto:${opportunity.contactEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
                <div className="p-6 border-b bg-orange-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase">Email Templates</h2>
                        <p className="text-sm text-gray-600 mt-1">{opportunity.customerName || opportunity.name}</p>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Select Template</label>
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

                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} label="Subject" />
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} label="Message Body" className="font-mono text-sm" />
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <Button onClick={handleOpenEmail} variant="primary" className="flex-1 bg-orange-600 hover:bg-orange-700">
                        <Mail size={16} className="mr-2" /> Open Email Client
                    </Button>
                    <Button onClick={handleCopy} variant="secondary" className="flex-1">
                        <Copy size={16} className="mr-2" /> {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default EmailTemplateModal;
