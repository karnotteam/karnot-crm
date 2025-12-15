import React, { useState } from 'react';
import { db } from '../../firebase'; 
import { writeBatch, doc } from 'firebase/firestore';
import { ALL_PRODUCTS } from '../../data/constants'; 

const MigrateProducts = () => {
  const [status, setStatus] = useState('Ready to Migrate');
  const [progress, setProgress] = useState(0);

  const handleMigration = async () => {
    setStatus('Preparing data...');
    const batch = writeBatch(db);
    let count = 0;

    ALL_PRODUCTS.forEach((product) => {
        // Use ID from file or generate one from name
        const docId = product.id || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const docRef = doc(db, "products", docId);

        // Smart Parsing: Extract kW
        const kwMatch = product.name.match(/(\d+(\.\d+)?)\s?kW/i);
        let heatingKw = kwMatch ? parseFloat(kwMatch[1]) : 0;

        const productData = {
            name: product.name,
            category: product.category,
            // Handle potentially missing cost price in old data
            costPriceUSD: product.costPriceUSD || (product.priceUSD ? product.priceUSD * 0.5 : 0), 
            priceUSD: product.salesPriceUSD || product.priceUSD || 0,
            specs: { heating_kw: heatingKw },
            active: true,
            updatedAt: new Date()
        };

        batch.set(docRef, productData);
        count++;
    });

    setStatus(`Uploading ${count} products...`);

    try {
        await batch.commit();
        setProgress(100);
        setStatus('SUCCESS! All products are now live in Firestore.');
    } catch (error) {
        console.error(error);
        setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 mt-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Database Migration Tool</h2>
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-6">
            <p className="text-sm text-blue-700">
                <strong>Source:</strong> {ALL_PRODUCTS.length} items from code.<br/>
                <strong>Destination:</strong> Firestore Database.
            </p>
        </div>
        <button 
            onClick={handleMigration}
            disabled={progress === 100}
            className={`w-full py-3 rounded font-bold text-white transition-colors ${progress === 100 ? 'bg-green-600' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
            {progress === 100 ? 'Migration Complete' : 'Start Migration'}
        </button>
        <p className="text-center mt-4 font-mono text-sm text-gray-500">{status}</p>
    </div>
  );
};

export default MigrateProducts;
