import React from 'react';
import DataImporter from '../components/DataImporter';
import ProductManager from '../components/ProductManager'; 
import { Card } from '../data/constants';

export default function AdminPage({ user }) {
    return (
        <div className="space-y-8 pb-20">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">System Administration</h1>
            
            {/* --- SECTION 1: PRODUCT MANAGER --- */}
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

            {/* --- SECTION 2: BULK IMPORTERS --- */}
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
