import React, { useState, useEffect } from 'react';
import { Mail, Copy, X, FileText, Send, TrendingUp, ShieldCheck, Globe, Award } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// ============================================================================
// "NO FLUFF" DIRECT RESPONSE TEMPLATES (With 10k Unit Social Proof)
// ============================================================================

const EMAIL_TEMPLATES = {
    europe_proof: {
        name: '🇪🇺 The "10,000 Units" Pitch (Social Proof)',
        category: 'Trust',
        subject: 'We are new to the UK, but not to Europe',
        body: `Hi {{contact}},

A lot of installers ask me: "I haven't heard of Karnot. Am I the guinea pig?"

The answer is no.

While we are new to the UK trade market, our R290 platform is already a veteran.

**The Stats:**
* **10,000+ Units** currently running across Europe (Germany, Netherlands, Poland).
* **3 Years** of winter field data.
* **0% Duty** (We ship via our Philippines hub, not direct China).

You are getting a machine that has already been stress-tested in climates colder than Manchester.

We just cut out the middleman so you get it for **£2,100** instead of £4,000.

Want to see the case studies?

Cheers,

Stuart
Karnot Energy`
    },

    spec_sheet_smackdown: {
        name: '🛠️ The "What\'s Inside" Pitch (Quality)',
        category: 'Trust',
        subject: 'Panasonic, Grundfos, Carel (Inside our R290 units)',
        body: `Hi {{contact}},

Installers often ask me: "It's half the price of a Vaillant, so what's the catch? Is it certified?"

There is no catch. Just direct supply.

Here is exactly what you get with a Karnot iHEAT R290 Monobloc (£2,100 trade):

**1. The "Paperwork" (Grant Ready):**
✅ **MCS Certified:** Fully approved for the £7,500 BUS Grant.
✅ **Keymark & TUV:** Safety certified.
✅ **Proven:** 10,000+ units currently operating across Europe.

**2. The "Guts" (Tier 1 Components):**
⚙️ **Compressor:** Panasonic R290 "DC Inverter" (Dedicated Propane Design).
⚙️ **Controller:** Full CAREL System (Inverter Drive & PCB).
⚙️ **Pump:** Grundfos UPM3 (The gold standard).
⚙️ **Contactor:** Schneider Electric.

It is top-tier European-spec engineering, built efficiently, sold direct.

Cheers,

Stuart
Karnot Energy`
    },

    margin_fix: {
        name: '💰 The "Margin Fix" (Direct)',
        category: 'Sales',
        subject: 'Stop paying the middleman tax',
        body: `Hi {{contact}},

I used to be a gas fitter, so I know the pain of seeing the merchant make more margin on the kit than I made on the install.

I set up Karnot to fix that.

We supply MCS-Certified R290 Heat Pumps directly to the trade. No wholesalers. No showrooms.

**The math is simple:**
* **Competitor 12kW R290:** ~£3,800 + VAT
* **Karnot 12kW R290:** ~£2,100 + VAT

It’s the same spec (Panasonic/Carel). Same grant eligibility. You just keep the extra £1,700.

Mind if I send you the trade price list?

Best,

Stuart
Karnot Energy`
    },

    cooling_upsell: {
        name: '❄️ The "Free Air Con" Pivot',
        category: 'Upsell',
        subject: 'How to sell Air Con (without the hassle)',
        body: `Hi {{contact}},

Most installers disable the cooling mode on heat pumps because they don't want wet carpets from sweating radiators.

We have a workaround that helps you win more quotes.

**The Karnot "Full Climate" Pack:**
1.  iHEAT R290 Heat Pump (Heating).
2.  **3x iZONE Fan Coils** (Cooling for bedrooms).

You can sell a "Whole House AC & Heating System" for the same price your competitor charges for a standard boiler swap.

I have a PDF showing how to price this for a 3-bed semi. Want a copy?

Best,

Stuart`
    }
};

const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('europe_proof');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [copied, setCopied] = useState(false);

    // Replace template variables
    const fillTemplate = (text) => {
        if (!text) return '';
        const name = opportunity?.contactName || 'Mate'; 
        return text.replace(/{{contact}}/g, name);
    };

    useEffect(() => {
        const template = EMAIL_TEMPLATES[selectedTemplate];
        if (template) {
            setSubject(fillTemplate(template.subject));
            setBody(fillTemplate(template.body));
        }
    }, [selectedTemplate, opportunity]);

    const handleCopy = () => {
        const fullEmail = `Subject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenEmail = () => {
        const email = opportunity?.contactEmail || '';
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
    };

    // Grouping
    const templatesByCategory = Object.entries(EMAIL_TEMPLATES).reduce((acc, [key, template]) => {
        const category = template.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push({ key, ...template });
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl flex flex-col bg-white shadow-2xl rounded-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase flex items-center gap-2">
                            <TrendingUp className="text-green-400" /> Direct Outreach
                        </h2>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                            Target: {opportunity?.customerName || 'New Prospect'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 bg-gray-50 flex-1 overflow-y-auto">
                    
                    {/* Template Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block flex items-center gap-2">
                            <FileText size={14} /> Select Strategy
                        </label>
                        <select 
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:border-green-500 focus:ring-0"
                        >
                            {Object.entries(templatesByCategory).map(([category, templates]) => (
                                <optgroup key={category} label={category}>
                                    {templates.map(t => (
                                        <option key={t.key} value={t.key}>{t.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Editor */}
                    <div className="space-y-3">
                        <Input 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                            className="font-bold border-2 border-slate-200" 
                            placeholder="Subject Line..."
                        />
                        <Textarea 
                            value={body} 
                            onChange={(e) => setBody(e.target.value)} 
                            rows={14} 
                            className="font-mono text-sm border-2 border-slate-200 leading-relaxed" 
                            placeholder="Email body..."
                        />
                    </div>

                    {/* Social Proof Note */}
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-3">
                        <Globe className="text-blue-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-blue-800">
                            <strong>10,000 Unit Stat:</strong> This is your strongest trust signal. It moves the conversation from "Testing a new product" (Risky) to "Using a proven European standard" (Safe).
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-white flex gap-3">
                    <Button onClick={handleCopy} variant="secondary" className="flex-1 border-slate-200">
                        <Copy size={16} className="mr-2" /> 
                        {copied ? 'Copied!' : 'Copy Text'}
                    </Button>
                    <Button onClick={handleOpenEmail} variant="primary" className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                        <Send size={16} className="mr-2" /> Open Mail App
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default EmailTemplateModal;
