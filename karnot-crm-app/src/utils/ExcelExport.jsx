import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '../data/constants.jsx';

// ==========================================
// UNIVERSAL EXCEL EXPORT UTILITY
// ==========================================
// Works with any data array - quotes, companies, contacts, tasks, etc.

/**
 * Convert array of objects to CSV format
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Optional: Specify which columns to export and their labels
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data, columns = null) => {
    if (!data || data.length === 0) return '';

    // If columns not specified, use all keys from first object
    const headers = columns || Object.keys(data[0]).map(key => ({
        key: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
    }));

    // Create header row
    const headerRow = headers.map(col => {
        const label = typeof col === 'string' ? col : col.label;
        return `"${label}"`;
    }).join(',');

    // Create data rows
    const dataRows = data.map(row => {
        return headers.map(col => {
            const key = typeof col === 'string' ? col : col.key;
            let value = row[key];

            // Handle special data types
            if (value === null || value === undefined) {
                return '""';
            }

            // Handle dates
            if (value?.toDate) {
                value = value.toDate().toLocaleDateString();
            } else if (value instanceof Date) {
                value = value.toLocaleDateString();
            }

            // Handle objects/arrays
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }

            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        }).join(',');
    }).join('\n');

    return `${headerRow}\n${dataRows}`;
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Name for the downloaded file
 */
export const downloadCSV = (csvContent, filename = 'export.csv') => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Export data to Excel (CSV format)
 * @param {Array} data - Data to export
 * @param {string} filename - Filename for export
 * @param {Array} columns - Optional column configuration
 */
export const exportToExcel = (data, filename = 'export.csv', columns = null) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const csv = convertToCSV(data, columns);
    downloadCSV(csv, filename);
};

// ==========================================
// EXPORT BUTTON COMPONENT
// ==========================================
// Drop-in button component for any table/list

export const ExportButton = ({ 
    data = [], 
    filename = 'export.csv', 
    columns = null,
    label = 'Export to Excel',
    variant = 'secondary',
    disabled = false,
    className = ''
}) => {
    const handleExport = () => {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }
        exportToExcel(data, filename, columns);
    };

    return (
        <Button
            onClick={handleExport}
            variant={variant}
            disabled={disabled || data.length === 0}
            className={className}
        >
            <FileSpreadsheet size={16} className="mr-1" />
            {label} ({data.length})
        </Button>
    );
};

// ==========================================
// PRE-CONFIGURED EXPORT FUNCTIONS
// ==========================================
// Ready-to-use export functions for common data types

export const exportQuotes = (quotes) => {
    const columns = [
        { key: 'id', label: 'Quote Number' },
        { key: 'customer', label: 'Customer', transform: (val) => val?.name || '' },
        { key: 'finalSalesPrice', label: 'Amount (USD)' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Date Created' },
        { key: 'validUntil', label: 'Valid Until' }
    ];

    // Transform data for export
    const exportData = quotes.map(quote => ({
        id: quote.id,
        customer: quote.customer?.name || '',
        finalSalesPrice: quote.finalSalesPrice || 0,
        status: quote.status,
        createdAt: quote.createdAt?.toDate ? quote.createdAt.toDate().toLocaleDateString() : '',
        validUntil: quote.validUntil || ''
    }));

    const filename = `Karnot_Quotes_${new Date().toISOString().split('T')[0]}.csv`;
    exportToExcel(exportData, filename, columns);
};

export const exportCompanies = (companies) => {
    const columns = [
        { key: 'companyName', label: 'Company Name' },
        { key: 'industry', label: 'Industry' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
        { key: 'isCustomer', label: 'Customer' },
        { key: 'isTarget', label: 'Target' },
        { key: 'createdAt', label: 'Date Added' }
    ];

    const exportData = companies.map(company => ({
        ...company,
        isCustomer: company.isCustomer ? 'Yes' : 'No',
        isTarget: company.isTarget ? 'Yes' : 'No',
        createdAt: company.createdAt?.toDate ? company.createdAt.toDate().toLocaleDateString() : ''
    }));

    const filename = `Karnot_Companies_${new Date().toISOString().split('T')[0]}.csv`;
    exportToExcel(exportData, filename, columns);
};

export const exportBusinessTasks = (tasks) => {
    const columns = [
        { key: 'title', label: 'Task' },
        { key: 'category', label: 'Category' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'recurring', label: 'Recurring' },
        { key: 'description', label: 'Description' }
    ];

    const filename = `Karnot_Business_Tasks_${new Date().toISOString().split('T')[0]}.csv`;
    exportToExcel(tasks, filename, columns);
};

export const exportAppointments = (appointments) => {
    const columns = [
        { key: 'companyName', label: 'Company' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'appointmentDate', label: 'Date' },
        { key: 'appointmentTime', label: 'Time' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'status', label: 'Status' },
        { key: 'agentName', label: 'Assigned Agent' }
    ];

    const filename = `Karnot_Appointments_${new Date().toISOString().split('T')[0]}.csv`;
    exportToExcel(appointments, filename, columns);
};

export const exportLedger = (entries) => {
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amountPHP', label: 'Amount (PHP)' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'reference', label: 'Reference' }
    ];

    const filename = `Karnot_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    exportToExcel(entries, filename, columns);
};

// ==========================================
// USAGE EXAMPLES
// ==========================================

/*
// EXAMPLE 1: Simple export button in any component
import { ExportButton } from '../utils/ExcelExport.jsx';

<ExportButton 
    data={quotes} 
    filename="my_quotes.csv"
    label="Export Quotes"
/>


// EXAMPLE 2: Custom export with specific columns
import { exportToExcel } from '../utils/ExcelExport.jsx';

const handleExport = () => {
    const columns = [
        { key: 'name', label: 'Customer Name' },
        { key: 'amount', label: 'Quote Amount' }
    ];
    exportToExcel(myData, 'custom_export.csv', columns);
};


// EXAMPLE 3: Use pre-configured export functions
import { exportQuotes, exportCompanies } from '../utils/ExcelExport.jsx';

<Button onClick={() => exportQuotes(quotes)}>
    Export Quotes
</Button>

<Button onClick={() => exportCompanies(companies)}>
    Export Companies
</Button>


// EXAMPLE 4: Export filtered data
const filteredQuotes = quotes.filter(q => q.status === 'WON');
<ExportButton 
    data={filteredQuotes} 
    filename="won_quotes.csv"
    label="Export Won Quotes"
/>
*/

export default ExportButton;
