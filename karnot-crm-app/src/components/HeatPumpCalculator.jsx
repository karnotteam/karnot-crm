import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, RefreshCw, Printer, X } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [showModal, setShowModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const auth = getAuth();
        const querySnapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    };
    fetch();
  }, []);

  const applyFixtures = () => {
    const liters = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
    setInputs(p => ({ ...p, dailyLitersInput: liters }));
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded" value={inputs.userType} onChange={(e) => setInputs(p => ({...p, userType: e.target.value}))}>
                            <option value="home">Home</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="resort">Hotels & Resorts</option>
                            <option value="school">Schools</option>
                            <option value="office">Office</option>
                            <option value="spa">Spa</option>
                        </select>
                        {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e => setInputs(p => ({...p, occupants: +e.target.value}))} />}
                        {['school','office','spa'].includes(inputs.userType) && (
                            <div>
                                <Input label="Daily Liters" type="number" value={inputs.dailyLitersInput} onChange={e => setInputs(p => ({...p, dailyLitersInput: +e.target.value}))} />
                                <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline mt-1">Estimate via Fixtures</button>
                            </div>
                        )}
                        {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e => setInputs(p => ({...p, mealsPerDay: +e.target.value}))} />}
                    </div>
                </Section>
                {/* Section 2 (Costs) & 3 (Conditions) remain same as previous version... */}
            </div>
            <div className="mt-8 flex justify-center">
                <Button onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} className="px-12 py-4 bg-orange-600 text-white rounded-lg">Calculate Savings</Button>
            </div>
        </Card>

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
                <div className="bg-white p-6 rounded-lg max-w-sm w-full relative">
                    <button onClick={() => setShowModal(false)} className="absolute top-2 right-2"><X size={20}/></button>
                    <h3 className="font-bold mb-4">Fixture Estimator</h3>
                    <div className="space-y-3">
                        <Input label="Showers" type="number" value={fixtures.showers} onChange={e => setFixtures(p => ({...p, showers: +e.target.value}))} />
                        <Input label="Kitchen Sinks" type="number" value={fixtures.sinks} onChange={e => setFixtures(p => ({...p, sinks: +e.target.value}))} />
                        <Button onClick={applyFixtures} className="w-full bg-orange-600 text-white">Apply Liters</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
