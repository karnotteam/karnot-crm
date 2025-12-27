import React, { useState, useEffect } from 'react';
import { Mail, Copy, X, FileText, Send } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// ============================================================================
// EMAIL TEMPLATES - Professional outreach templates for different scenarios
// ============================================================================

const EMAIL_TEMPLATES = {
    initial_contact: {
        name: 'Initial Contact',
        category: 'General',
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
www.karnot.com.ph`
    },
    
    cold_outreach_industrial: {
        name: 'Cold Outreach (Industrial)',
        category: 'B2B',
        subject: 'Reducing Thermal Costs at {{company}}',
        body: `Hi {{contact}},

I am reaching out regarding {{company}}'s industrial heating and cooling requirements.

At Karnot, we help facilities reduce thermal energy costs by up to 50% using Industrial Heat Pumps (Waste Heat Recovery). 

If you are currently running Chillers and Boilers separately, we can likely combine them into one efficient R290 system.

Do you have 10 minutes next Tuesday to discuss a potential thermal audit?

Best,
Stuart Cox
Karnot Energy Solutions
www.karnot.com.ph`
    },
    
    asean_partner_intro: {
        name: 'ASEAN Partner Introduction',
        category: 'Export',
        subject: 'Partnership Opportunity - Natural Refrigerant Heat Pumps',
        body: `Dear {{contact}},

I hope this message finds you well.

I'm reaching out from Karnot Energy Solutions, a Philippines-based manufacturer of industrial heat pump systems using natural refrigerant technology (CO₂ and R290).

We're expanding our partner network in Southeast Asia and believe there may be synergies with {{company}}.

Our systems are:
• PFAS-free and compliant with upcoming regional regulations
• Designed for commercial and industrial applications
• Suitable for both heating and cooling requirements
• Manufactured at our BOI-registered facility in the Philippines

Would you be open to a brief conversation about potential collaboration opportunities?

I'm available for a call next week if that suits your schedule.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
+63 917 XXX XXXX
www.karnot.com.ph`
    },
    
    uk_mcs_installer: {
        name: 'UK MCS Installer Partnership',
        category: 'Export',
        subject: 'Natural Refrigerant Heat Pumps for UK Market',
        body: `Dear {{contact}},

I hope you're well.

I'm writing from Karnot Energy Solutions regarding potential collaboration opportunities for the UK heat pump market.

We manufacture natural refrigerant (CO₂/R290) heat pump systems and are looking to partner with established MCS-certified installers like {{company}}.

Key points that may interest you:
• PFAS-free systems ahead of regulatory phase-outs
• Proven technology with European deployment experience
• Competitive pricing from our Philippines manufacturing base
• Support for BUS grant applications

Would you have 20 minutes for an introductory call to explore partnership possibilities?

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
www.karnot.com.ph`
    },
    
    follow_up: {
        name: 'Follow-Up Email',
        category: 'General',
        subject: 'Following up - Heat Pump Discussion',
        body: `Hi {{contact}},

I wanted to follow up on my previous message regarding Karnot's natural refrigerant heat pump solutions for {{company}}.

I understand you're likely busy, but I believe a brief conversation could be mutually beneficial.

Would you be available for a quick 15-minute call this week or next?

Please let me know a time that works for you.

Best regards,
Stuart Cox
Karnot Energy Solutions
www.karnot.com.ph`
    },
    
    quote_follow_up: {
        name: 'Quote Follow-Up',
        category: 'Sales',
        subject: 'Re: Your Heat Pump Quotation',
        body: `Dear {{contact}},

I hope this email finds you well.

I wanted to follow up on the quotation we provided for {{company}}'s heat pump project.

Do you have any questions about the proposal? I'd be happy to schedule a call to discuss:
• Technical specifications
• Installation timeline
• Financing options
• ROI calculations

Please let me know if you need any additional information.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
www.karnot.com.ph`
    }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('initial_contact');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [copied, setCopied] = useState(false);

    // Replace template variables with actual data
    const fillTemplate = (text) => {
        if (!text) return '';
        
        const value = Number(opportunity?.estimatedValue) || 0;
        const companyName = opportunity?.customerName || 
                           opportunity?.companyName || 
                           opportunity?.name || 
                           '[Company Name]';
        const contactName = opportunity?.contactName || 
                           opportunity?.contact || 
                           'Sir/Madam';
        const projectName = opportunity?.project || 
                           opportunity?.projectType || 
                           'Energy Project';
        
        return text
            .replace(/{{company}}/g, companyName)
            .replace(/{{contact}}/g, contactName)
            .replace(/{{project}}/g, projectName)
            .replace(/{{value}}/g, '$' + value.toLocaleString());
    };

    // Update template when selection changes
    useEffect(() => {
        const template = EMAIL_TEMPLATES[selectedTemplate];
        if (template) {
            setSubject(fillTemplate(template.subject));
            setBody(fillTemplate(template.body));
        }
    }, [selectedTemplate, opportunity]);

    // Copy email to clipboard
    const handleCopy = () => {
        const fullEmail = `Subject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open in default email client
    const handleOpenEmail = () => {
        const email = opportunity?.contactEmail || opportunity?.email || '';
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    };

    // Group templates by category
    const templatesByCategory = Object.entries(EMAIL_TEMPLATES).reduce((acc, [key, template]) => {
        const category = template.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push({ key, ...template });
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl">
                
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">
                            Email Templates
                        </h2>
                        <p className="text-sm text-orange-100 font-bold mt-1">
                            {opportunity?.customerName || opportunity?.companyName || opportunity?.name || 'Prospect'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    
                    {/* Template Selection */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block flex items-center gap-2">
                            <FileText size={14} />
                            Select Email Template
                        </label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        >
                            {Object.entries(templatesByCategory).map(([category, templates]) => (
                                <optgroup key={category} label={category}>
                                    {templates.map(template => (
                                        <option key={template.key} value={template.key}>
                                            {template.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2 italic">
                            Templates automatically personalized with company/contact details
                        </p>
                    </div>

                    {/* Subject Line */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Subject Line
                        </label>
                        <Input 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                            className="font-bold"
                            placeholder="Email subject..."
                        />
                    </div>

                    {/* Email Body */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Email Body
                        </label>
                        <Textarea 
                            value={body} 
                            onChange={(e) => setBody(e.target.value)} 
                            rows={14} 
                            className="font-mono text-sm"
                            placeholder="Email content..."
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-800 font-bold">
                            💡 <strong>Pro Tip:</strong> Customize the template with specific details about the prospect's industry, location, or recent news for better response rates. Personal touches significantly improve engagement.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={handleCopy}
                        variant="secondary"
                        className="flex-1 flex items-center justify-center gap-2"
                    >
                        <Copy size={16} />
                        {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button
                        onClick={handleOpenEmail}
                        variant="primary"
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
                    >
                        <Mail size={16} />
                        Open Email Client
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default EmailTemplateModal;
