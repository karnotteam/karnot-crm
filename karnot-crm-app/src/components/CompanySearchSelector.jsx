import React, { useState, useMemo } from 'react';
import { Search, X, Copy, CheckCircle, Trash } from 'lucide-react';
import { Card, Button } from '../data/constants.jsx';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';

// ==========================================
// ENHANCED COMPANY SEARCH SELECTOR
// ==========================================
// Drop-in replacement for standard company dropdowns
// Features: Search, Deduplication, Clear selection

export const CompanySearchSelector = ({ 
    companies = [], 
    selectedCompanyId, 
    onSelect, 
    placeholder = "Search companies...",
    className = ""
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Deduplicate companies by name (case-insensitive)
    const uniqueCompanies = useMemo(() => {
        const seen = new Map();
        
        companies.forEach(company => {
            const normalizedName = company.companyName?.toLowerCase().trim();
            if (!normalizedName) return;
            
            // Keep the first occurrence, or the one with more data
            if (!seen.has(normalizedName)) {
                seen.set(normalizedName, company);
            } else {
                const existing = seen.get(normalizedName);
                const existingFieldCount = Object.keys(existing).length;
                const newFieldCount = Object.keys(company).length;
                
                // Replace if new one has more fields
                if (newFieldCount > existingFieldCount) {
                    seen.set(normalizedName, company);
                }
            }
        });
        
        return Array.from(seen.values()).sort((a, b) => 
            (a.companyName || '').localeCompare(b.companyName || '')
        );
    }, [companies]);

    // Filter companies based on search term
    const filteredCompanies = useMemo(() => {
        if (!searchTerm.trim()) return uniqueCompanies;
        
        const search = searchTerm.toLowerCase();
        return uniqueCompanies.filter(company => {
            const name = company.companyName?.toLowerCase() || '';
            const city = company.city?.toLowerCase() || '';
            const industry = company.industry?.toLowerCase() || '';
            const type = company.isCustomer ? 'customer' : company.isTarget ? 'target' : '';
            
            return name.includes(search) || 
                   city.includes(search) || 
                   industry.includes(search) ||
                   type.includes(search);
        });
    }, [uniqueCompanies, searchTerm]);

    const selectedCompany = uniqueCompanies.find(c => c.id === selectedCompanyId);
    const duplicateCount = companies.length - uniqueCompanies.length;

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : (selectedCompany?.companyName || '')}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white font-bold text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                
                {/* Clear Button */}
                {(searchTerm || selectedCompanyId) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm('');
                            onSelect(null);
                            setIsOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <>
                    {/* Backdrop to close dropdown */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                            setIsOpen(false);
                            setSearchTerm('');
                        }}
                    />
                    
                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Search Results */}
                        <div className="max-h-64 overflow-y-auto">
                            {filteredCompanies.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-500 text-sm">
                                        {searchTerm ? (
                                            <>
                                                No companies found for "<span className="font-bold">{searchTerm}</span>"
                                            </>
                                        ) : (
                                            'No companies available'
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {filteredCompanies.map(company => (
                                        <button
                                            key={company.id}
                                            onClick={() => {
                                                onSelect(company.id);
                                                setIsOpen(false);
                                                setSearchTerm('');
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-l-4 ${
                                                company.id === selectedCompanyId 
                                                    ? 'bg-orange-50 border-orange-500' 
                                                    : 'border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-gray-800">
                                                        {company.companyName}
                                                    </div>
                                                    {(company.city || company.industry) && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {[company.city, company.industry].filter(Boolean).join(' • ')}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Badges */}
                                                <div className="flex gap-1 ml-2">
                                                    {company.isCustomer && (
                                                        <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                            CUSTOMER
                                                        </span>
                                                    )}
                                                    {company.isTarget && (
                                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                            TARGET
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Info */}
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                    Showing {filteredCompanies.length} of {uniqueCompanies.length} companies
                                </span>
                                {duplicateCount > 0 && (
                                    <span className="text-orange-700 font-bold">
                                        {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} hidden
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ==========================================
// DUPLICATE COMPANY CLEANER MODAL
// ==========================================
// Standalone tool to permanently remove duplicate companies

export const DuplicateCompanyCleaner = ({ companies = [], user, onClose, onComplete }) => {
    const [processing, setProcessing] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState([]);
    
    // Find duplicate groups
    const duplicateGroups = useMemo(() => {
        const groups = {};
        
        companies.forEach(company => {
            const key = company.companyName?.toLowerCase().trim();
            if (!key) return;
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(company);
        });
        
        // Only keep groups with 2+ companies
        return Object.entries(groups)
            .filter(([_, comps]) => comps.length > 1)
            .map(([name, comps]) => ({
                name,
                companies: comps.sort((a, b) => {
                    // Sort by creation date (oldest first)
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateA - dateB;
                })
            }));
    }, [companies]);

    const totalDuplicatesToDelete = useMemo(() => {
        return selectedGroups.reduce((sum, groupName) => {
            const group = duplicateGroups.find(g => g.name === groupName);
            return sum + (group ? group.companies.length - 1 : 0);
        }, 0);
    }, [selectedGroups, duplicateGroups]);

    const handleToggleAll = () => {
        if (selectedGroups.length === duplicateGroups.length) {
            setSelectedGroups([]);
        } else {
            setSelectedGroups(duplicateGroups.map(g => g.name));
        }
    };

    const handleCleanDuplicates = async () => {
        if (totalDuplicatesToDelete === 0) {
            alert('No duplicates selected');
            return;
        }

        if (!window.confirm(
            `This will permanently delete ${totalDuplicatesToDelete} duplicate compan${totalDuplicatesToDelete !== 1 ? 'ies' : 'y'}.\n\n` +
            `The oldest entry for each company will be kept.\n\nContinue?`
        )) {
            return;
        }

        setProcessing(true);

        try {
            const batch = writeBatch(db);
            
            selectedGroups.forEach(groupName => {
                const group = duplicateGroups.find(g => g.name === groupName);
                if (!group) return;
                
                // Keep first (oldest), delete rest
                const toDelete = group.companies.slice(1);
                toDelete.forEach(company => {
                    const docRef = doc(db, "users", user.uid, "companies", company.id);
                    batch.delete(docRef);
                });
            });

            await batch.commit();
            
            alert(`✅ Successfully deleted ${totalDuplicatesToDelete} duplicate compan${totalDuplicatesToDelete !== 1 ? 'ies' : 'y'}!`);
            
            if (onComplete) onComplete();
            onClose();
        } catch (error) {
            console.error('Error cleaning duplicates:', error);
            alert('Error cleaning duplicates. Check console for details.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-orange-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-2">
                                <Copy className="text-orange-600" size={24} />
                                Company Duplicate Cleaner
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Found {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? 's' : ''} 
                                ({duplicateGroups.reduce((sum, g) => sum + g.companies.length - 1, 0)} total duplicates)
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {duplicateGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No Duplicates Found!</h3>
                            <p className="text-gray-500">Your companies database is clean.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Select All */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.length === duplicateGroups.length}
                                        onChange={handleToggleAll}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-bold text-sm">
                                        Select All ({duplicateGroups.length} groups)
                                    </span>
                                </label>
                                <span className="text-xs text-gray-500">
                                    Keeps oldest, deletes newer duplicates
                                </span>
                            </div>

                            {/* Duplicate Groups */}
                            {duplicateGroups.map((group, idx) => (
                                <Card key={idx} className="border-l-4 border-orange-500">
                                    <div className="p-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.includes(group.name)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedGroups([...selectedGroups, group.name]);
                                                    } else {
                                                        setSelectedGroups(selectedGroups.filter(n => n !== group.name));
                                                    }
                                                }}
                                                className="w-4 h-4 mt-1"
                                            />
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h4 className="font-bold text-gray-800">
                                                        {group.companies[0].companyName}
                                                    </h4>
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                                        {group.companies.length} copies
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2 ml-4">
                                                    {group.companies.map((company, cIdx) => (
                                                        <div 
                                                            key={company.id}
                                                            className={`text-sm p-3 rounded border ${
                                                                cIdx === 0 
                                                                    ? 'bg-green-50 border-green-200' 
                                                                    : 'bg-red-50 border-red-200'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className={`font-bold text-xs ${
                                                                    cIdx === 0 ? 'text-green-700' : 'text-red-700'
                                                                }`}>
                                                                    {cIdx === 0 ? '✓ WILL KEEP' : '✗ WILL DELETE'}
                                                                </span>
                                                                <div className="text-xs text-gray-600 text-right">
                                                                    <div>
                                                                        {company.city || 'No city'} • {company.industry || 'No industry'}
                                                                    </div>
                                                                    <div className="mt-1">
                                                                        Created: {company.createdAt?.toDate 
                                                                            ? company.createdAt.toDate().toLocaleDateString() 
                                                                            : 'Unknown date'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {duplicateGroups.length > 0 && (
                    <div className="p-6 border-t bg-gray-50 flex gap-3">
                        <Button
                            onClick={handleCleanDuplicates}
                            variant="primary"
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            disabled={processing || selectedGroups.length === 0}
                        >
                            <Trash size={16} className="mr-2" />
                            {processing 
                                ? 'Deleting...' 
                                : `Delete ${totalDuplicatesToDelete} Duplicate${totalDuplicatesToDelete !== 1 ? 's' : ''}`
                            }
                        </Button>
                        <Button onClick={onClose} variant="secondary" disabled={processing}>
                            {processing ? 'Please wait...' : 'Cancel'}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CompanySearchSelector;
