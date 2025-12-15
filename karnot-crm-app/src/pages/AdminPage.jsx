import React from 'react';
import DataImporter from '../components/DataImporter';
import ProductManager from '../components/ProductManager'; // <--- Import the new tool
import { Card } from '../data/constants';

export default function AdminPage({ user }) {
    return (
        <div className="space-y-8 pb-20">
            <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
            
            {/* 1. PRODUCT MANAGER (The new manual tool) */}
            <section>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Product Management</h2>
                <p className="text-gray-600 mb-4">Add, edit, or delete individual products here. Changes appear in the Quote Calculator immediately.</p>
                <ProductManager user={user} />
            </section>

            <hr className="border-gray-300 my-8"/>

            {/* 2. BULK IMPORTERS (The CSV tools) */}
            <section>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Bulk Data Import</h2>
                <p className="text-gray-600 mb-4">Use these tools to upload large lists from Excel/CSV.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Product Importer */}
                    <Card>
                        <DataImporter user={user} type="products" />
                    </Card>

                    {/* Contact Importer */}
                    <Card>
                        <DataImporter user={user} type="contacts" />
                    </Card>
                </div>
            </section>
        </div>
    );
}
