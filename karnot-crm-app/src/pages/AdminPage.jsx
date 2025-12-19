import React from 'react';
import DataImporter from '../components/DataImporter';
import ProductManager from '../components/ProductManager'; 
import FinancialEntryLogger from '../components/FinancialEntryLogger';
import { Card } from '../data/constants';

export default function AdminPage({ user, companies }) {
    return (
        <div className="space-y-8 pb-20">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">System Administration</h1>
            
            {/* --- SECTION 1: FINANCIAL MANAGEMENT (The New Ledger Tool) --- */}
            {/* This section enables logging of Hotels, Meals, Van Hire etc. mapped to your P&L */}
            <section className="bg-orange-50 p-6 rounded-2xl border border-orange-200 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-orange-700 flex items-center gap-2">
                        💰 Financial Ledger & BIR Prep
                    </h2>
                    <p className="text-sm text-orange-800/80 mt-1">
                        Use this tool to log project-specific costs. These entries populate your "Cost of Sales" 
                        and provide the data for your physical BIR Manual Books.
                    </p>
                </div>
                <FinancialEntryLogger companies={companies} />
            </section>

            <hr className="border-gray-300 my-8"/>

            {/* --- SECTION 2: PRODUCT MANAGER (Your Existing Tool) --- */}
            <section>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Product Management</h2>
                    <p className="text-gray-600">
                        Add, edit, or delete individual products here. Changes appear in the Quote Calculator immediately.
                    </p>
                </div>
                <ProductManager user={user} />
            </section>

            <hr className="border-gray-300 my-8"/>

            {/* --- SECTION 3: BULK IMPORTERS (Your Existing CSV Tools) --- */}
            <section>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Bulk Data Import</h2>
                    <p className="text-gray-600">Use these tools to upload large lists from your Excel/CSV masters.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Product Importer */}
                    <Card className="border border-gray-100">
                        <div className="mb-4 border-b pb-2">
                            <h3 className="font-bold text-gray-800">Master Product Import</h3>
                        </div>
                        <DataImporter user={user} type="products" />
                    </Card>

                    {/* Contact Importer */}
                    <Card className="border border-gray-100">
                        <div className="mb-4 border-b pb-2">
                            <h3 className="font-bold text-gray-800">Master Contact Import</h3>
                        </div>
                        <DataImporter user={user} type="contacts" />
                    </Card>
                </div>
            </section>
        </div>
    );
}
