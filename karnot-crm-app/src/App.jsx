import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp, addDoc } from "firebase/firestore"; 

// --- Import Pages & Components ---
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import QuoteCalculator from './components/QuoteCalculator.jsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx';
// --- 1. IMPORT THE NEW COMPANIES PAGE ---
import CompaniesPage from './pages/CompaniesPage.jsx'; 

// --- Import Constants & Header ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
// --- 2. IMPORT THE 'Building' ICON ---
import { BarChart2, FileText, List, HardHat, LogOut, Building } from 'lucide-react'; 

// --- Header Component ---
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote }) => ( 
    <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                <h1 className="text-2xl font-bold text-orange-600">Funnel CRM</h1>
            </div>
            <nav className="flex flex-wrap gap-2 justify-end">
                <Button onClick={() => setActiveView('funnel')} variant={activeView === 'funnel' ? 'primary' : 'secondary'}><HardHat className="mr-2" size={16} /> Funnel</Button>
                <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'}><BarChart2 className="mr-2" size={16} /> Dashboard</Button>
                
                {/* --- 3. ADD THE NEW "COMPANIES" BUTTON --- */}
                <Button onClick={() => setActiveView('companies')} variant={activeView === 'companies' ? 'primary' : 'secondary'}><Building className="mr-2" size={16} /> Companies</Button>

                <Button onClick={onNewQuote} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Quotes ({quoteCount})</Button>
                <Button onClick={onLogout} variant="secondary"><LogOut className="mr-2" size={16} />Logout</Button>
            </nav>
        </div>
    </header>
);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null); 
    const [activeView, setActiveView] = useState('funnel');
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 
    
    // --- State from Firebase ---
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    // --- 4. ADD NEW STATE FOR COMPANIES ---
    const [companies, setCompanies] = useState([]); 
    const [loading, setLoading] = useState(true);

    // AUTH HOOK (No changes here)
    useEffect(() => {
        // ... (your existing auth code)
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user); 
            } else {
                setUser(null); 
                setLoading(false);
            }
        });
        return () => unsubscribe(); 
    }, []);

    // DATA SYNC HOOK
    useEffect(() => {
        if (user) {
            setLoading(true);
            
            // 1. Sync Quotes
            const quotesQuery = query(collection(db, "users", user.uid, "quotes"));
            const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
                const liveQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuotes(liveQuotes);
                setLoading(false); // Set loading false after first sync
            }, (error) => { console.error("Error syncing quotes: ", error); setLoading(false); });

            // 2. Sync Opportunities
            const oppsQuery = query(collection(db, "users", user.uid, "opportunities"));
            const unsubOpps = onSnapshot(oppsQuery, (snapshot) => {
                const liveOpps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOpportunities(liveOpps);
            }, (error) => { console.error("Error syncing opportunities: ", error); });
            
            // --- 5. SYNC COMPANIES ---
            const companiesQuery = query(collection(db, "users", user.uid, "companies"));
            const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
                const liveCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCompanies(liveCompanies);
            }, (error) => { console.error("Error syncing companies: ", error); });
            
            return () => {
                unsubQuotes();
                unsubOpps();
                unsubCompanies(); // <-- Don't forget to cleanup!
            };
        }
    }, [user]); 

    // --- (All your handleLogin, handleLogout, handleSaveQuote, etc. functions) ---
    // ...
    // ...
    const handleNewQuote = () => {
        setQuoteToEdit(null); 
        setSelectedOpportunity(null); 
        setActiveView('calculator');
    };

    // --- ADD THIS WHOLE SECTION BACK IN ---

    // --- Navigation Functions for Opportunities ---
    
    // This is called from FunnelPage to open the details
    const handleOpenOpportunity = (opp) => {
        setSelectedOpportunity(opp);
        setActiveView('opportunityDetail'); 
    };

    // This is called from OpportunityDetailPage to go back
    const handleBackToFunnel = () => {
        setSelectedOpportunity(null);
        setActiveView('funnel');
    };

    // This is called from OpportunityDetailPage to create a new quote
    const handleNewQuoteFromOpp = () => {
        if (!selectedOpportunity) return;
        
        // Pre-fill the new quote with the opportunity's data
        const initialQuoteData = {
            customer: { 
                name: selectedOpportunity.customerName, 
                // A bit of guesswork for saleType, you can adjust this
                saleType: selectedOpportunity.customerName.includes('Canada') ? 'Export' : 'Domestic'
            },
            opportunityId: selectedOpportunity.id 
        };

        setQuoteToEdit(initialQuoteData); // Use 'quoteToEdit' to pass pre-filled data
        setActiveView('calculator');
    };
    // --- END OF NEW SECTION ---


    // --- Logic from your old app ---
    const next
