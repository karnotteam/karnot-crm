import React, { useState, useEffect } from 'react';
import { Mail, Copy, X, FileText, Send, TrendingUp, ShieldCheck, Cpu, Award, Zap } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// ============================================================================
// KARNOT UK: DIRECT RESPONSE TEMPLATES (Final Strategy Edition)
// ============================================================================

const EMAIL_TEMPLATES = {
    spec_sheet_smackdown: {
        name: '🛠️ The "What\'s Inside" (Quality Proof)',
        category: 'Trust',
        subject: 'Panasonic, Grundfos, Carel (Inside our £2k unit)',
        body: `Hi {{contact}},

A lot of installers ask me: "It's half the price of a Vaillant, so is it cheap junk?"

I don't hide what's inside our boxes. I brag about it.

Here is exactly what you get inside a Karnot iHEAT R290 Monobloc (Trade: £2,100):

**The "Guts" (Tier 1 Components):**
✅ **Compressor:** Panasonic R290 "DC Inverter" (Dedicated Propane Design).
✅ **Controller:** Full CAREL System (Italian Inverter Drive & PCB).
✅ **Pump:** Grundfos UPM3 (The gold standard).
✅ **Contactor:** Schneider Electric.
✅ **Safety:** Explosion-Proof Internal Components.

It is European-spec engineering, built efficiently, sold direct.

Why pay £4,000 for a badge when the components are the same?

Cheers,

Stuart
Karnot Energy`
    },

    margin_fix: {
        name: '💰 The "Cash Margin" Pitch',
        category: 'Sales',
        subject: 'Stop paying the wholesaler\'s pension',
        body: `Hi {{contact}},

I used to be a gas fitter. I know the pain of doing the hard work while the merchant makes the easy margin.

I set up Karnot to fix that. We supply MCS-Certified R290 Heat Pumps direct to the trade.

**The math is simple:**
* **Competitor 12kW R290:** ~£3,800 + VAT (Wholesale)
* **Karnot 12kW R290:** ~£2,100 + VAT (Direct)

**The Result:**
You do the same install. You claim the same £7,500 BUS Grant. You keep an extra **£1,700 profit** in your back pocket.

Mind if I send you the spec sheet?

Best,

Stuart
Ex-Gas Engineer & CEO, Karnot`
    },

    r32_price_war: {
        name: '🥊 The "Samsung Killer" (R32)',
        category: 'Sales',
        subject: '12kW Heat Pump for under £2k?',
        body: `Hi {{contact}},

Quick question.

If you are currently installing Samsung or LG R32 units, you are likely paying around £3,000 a pop.

We have a **12kW R32 Monobloc** (The iHEAT Pro) landing next week.
**Trade price: £1,950.**

* Same Refrigerant (R32).
* Same Power (12kW).
* **£1,000+ Cheaper.**

It matches the big brands spec-for-spec, but without the "brand tax."

Do you want to reserve one for your next project to test the difference?

Cheers,

Stuart`
    },

    cooling_upsell: {
        name: '❄️ The "Free Air Con" Pivot',
        category: 'Upsell',
        subject: 'How to sell Air Con (without the hassle)',
        body: `Hi {{contact}},

Most heating guys lose work in the summer. Here is a trick to stay busy.

Our heat pumps can cool, not just heat.

Instead of radiators in the bedrooms, fit our **iZONE Fan Coils**.
* Cost to you: ~£150.
* Value to customer: Full Air Conditioning.

You can sell a "Whole House Climate System" for the same price your competitor charges for a standard boiler swap.

You win the job. The customer gets cool bedrooms.

Want to see the bundle pricing?

Cheers,

Stuart`
    },

    logistics_trust: {
        name: '🛡️ The "Safe Hands" (Logistics)',
        category: 'Trust',
        subject: 'Direct supply, but safe (Our QC Process)',
        body: `Hi {{contact}},

Buying direct can be scary. Will it arrive? Is the quality consistent?

We don't ship "blind" from the factory. We route our stock through our own export hub in the **Philippines**.

**Our QC Process:**
1.  Manufacture (Tier 1 Factory).
2.  **Staging & Testing (Philippines Hub).**
3.  Ship to UK.

Our team physically checks the units before they get on the boat to you. You get the factory price, but with proper oversight and English-speaking support.

Safe. Simple. Cheap.

Cheers,

Stuart`
    }
};

const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('spec_sheet_smackdown');
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
                            <TrendingUp className="text-green-400" /> Rapid Fire Emails
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
                            <FileText size={14} /> Choose Your Angle
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

                    {/* Trust Note */}
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-3">
                        <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-blue-800">
                            <strong>Strategy:</strong> These templates use the "Sabri Suby" style: short sentences, high contrast (Option A vs Option B), and low friction. Don't sound corporate. Sound like a guy offering a deal.
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
