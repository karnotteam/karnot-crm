// src/pages/AdminPage.jsx
import React from 'react';
import DataImporter from '../components/DataImporter';
import { Card } from '../data/constants';

export default function AdminPage({ user }) {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
            <p className="text-gray-600">Use this page to bulk upload data into your CRM.</p>

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
        </div>
    );
}
