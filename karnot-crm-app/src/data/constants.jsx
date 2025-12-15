import React from 'react';
import { Loader2 } from 'lucide-react';

// --- CENTRAL CURRENCY RATES ---
export const FX_RATES = {
    USD: { rate: 1.00, symbol: '$', locale: 'en-US', name: 'US Dollar' },
    CAD: { rate: 1.37, symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar' },
    GBP: { rate: 0.79, symbol: '£', locale: 'en-GB', name: 'British Pound' },
    MYR: { rate: 4.70, symbol: 'RM', locale: 'ms-MY', name: 'Malaysian Ringgit' },
    PHP: { rate: 58.75, symbol: '₱', locale: 'en-PH', name: 'Philippine Peso' } 
};

// --- ASSETS & DEFAULTS ---
export const KARNOT_LOGO_BASE_64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiNlYTU4MGMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiPktBUk5PVDwvdGV4dD48L3N2Zz4=";

export const QUOTE_STATUSES = {
    DRAFT: { text: "Draft", color: "bg-gray-500" },
    SENT: { text: "Sent", color: "bg-blue-500" },
    APPROVED: { text: "Approved", color: "bg-green-500" },
    WON: { text: "Won", color: "bg-green-600" },
    LOST: { text: "Lost", color: "bg-red-600" },
    DECLINED: { text: "Declined", color: "bg-red-500" }
};

export const BOI_TARGETS_USD = {
    2026: 1988802,
    2027: 3650988,
    2028: 5109436,
};

// --- PRICING TIERS ---
export const PRICING_TIERS = {
    STANDARD: { label: 'Standard / End User', discount: 0, color: 'gray' },
    VIP:      { label: 'VIP Customer',        discount: 5, color: 'blue' },
    PARTNER:  { label: 'Investor / Partner',  discount: 15, color: 'teal' }, // <--- NEW PARTNER TIER
    DEALER:   { label: 'Authorized Dealer',   discount: 15, color: 'purple' },
    DISTRIB:  { label: 'Master Distributor',  discount: 25, color: 'orange' },
    EXPORT:   { label: 'Export Partner',      discount: 30, color: 'green' }
};

// --- UI COMPONENTS ---
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    };
    return <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled} {...props}>
        {disabled && <Loader2 className="animate-spin mr-2" size={16} />}
        {children}
    </button>;
};

export const Input = ({ label, id, ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
        <input 
            id={id} 
            spellCheck={true}
            lang="en"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" 
            {...props} 
        />
    </div>
);

export const Textarea = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <textarea 
            id={id} 
            spellCheck={true}
            lang="en"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" 
            {...props} 
        />
    </div>
);

export const Checkbox = ({ label, id, ...props }) => (
    <div className="flex items-center">
        <input id={id} type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" {...props} />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);

export const Section = ({ title, children }) => (
    <div className="mt-8">
        <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);
