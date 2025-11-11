// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; // Import your new firebase config
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"; // For login/logout
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"; // For the database

// --- Import Pages & Components (All with .jsx extension) ---
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import QuoteCalculator from './components/QuoteCalculator.jsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx';

// --- Import Constants & Header ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { BarChart2, FileText, List, HardHat, LogOut } from 'lucide-react'; 

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
    const [loading, setLoading] = useState(true);

    // AUTH HOOK
    useEffect(() => {
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
                setLoading(false); 
            }, (error) => { console.error("Error syncing quotes: ", error); setLoading(false); });

            // 2. Sync Opportunities
            const oppsQuery = query(collection(db, "users", user.uid, "opportunities"));
            const unsubOpps = onSnapshot(oppsQuery, (snapshot) => {
                const liveOpps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOpportunities(liveOpps);
            }, (error) => { console.error("Error syncing opportunities: ", error); });
            
            return () => {
                unsubQuotes();
                unsubOpps();
            };
        }
    }, [user]); 

    // --- Firebase Login/Logout ---
    const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => alert("Login Failed: " + error.message));
    };

    const handleLogout = () => {
        signOut(auth);
    };

    // --- Firebase Database Functions (Quote CRUD) ---
    const handleSaveQuote = async (quoteData) => {
        if (!user) {
            alert("Error: You are not logged in. Please refresh and log in again.");
            return;
        }
        
        const quoteRef = doc(db, "users", user.uid, "quotes", quoteData.id);
        try {
            await setDoc(quoteRef, {
                ...quoteData,
                createdAt: quoteData.createdAt || serverTimestamp(), 
                lastModified: serverTimestamp()
            }, { merge: true }); 
            
            alert(`Quote ${quoteData.id} has been saved to the cloud!`);
            setActiveView('list');
            setQuoteToEdit(null);
            setSelectedOpportunity(null); 
        } catch (error) {
            console.error("Error saving quote: ", error);
            alert("Error saving quote. See console.");
        }
    };
    
    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        const quoteRef = doc(db, "users", user.uid, "quotes", quoteId);
        try {
            await setDoc(quoteRef, { status: newStatus, lastModified: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error("Error updating status: ", error);
        }
    };
    
    const handleDeleteQuote = async (quoteId) => {
        if (window.confirm("Are you sure you want to permanently delete this quote?")) {
            const quoteRef = doc(db, "users", user.uid, "quotes", quoteId);
            try {
                await deleteDoc(quoteRef);
            } catch (error) {
                console.error("Error deleting quote: ", error);
            }
        }
    };
    
    // --- Navigation Functions ---

    // FIX: This function now exists and handles the transition to the calculator
    const handleEditQuote = (quote) => {
        setQuoteToEdit(quote);
        setActiveView('calculator');
    };

    const handleOpenOpportunity = (opp) => {
        setSelectedOpportunity(opp);
        setActiveView('opportunityDetail'); 
    };

    const handleBackToFunnel = () => {
        setSelectedOpportunity(null);
        setActiveView('funnel');
    };

    const handleNewQuoteFromOpp = () => {
        if (!selectedOpportunity) return;
        
        const initialQuoteData = {
            customer: { 
                name: selectedOpportunity.customerName, 
                saleType: selectedOpportunity.customerName.includes('Canada') ? 'Export' : 'Domestic'
            },
            opportunityId: selectedOpportunity.id 
        };

        setQuoteToEdit(initialQuoteData);
        setActiveView('calculator');
    };

    const handleNewQuote = () => {
        setQuoteToEdit(null); 
        setSelectedOpportunity(null); 
        setActiveView('calculator');
    };

    // --- Logic from your old app ---
    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes
           .map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10))
           .filter(num => !isNaN(num))
           .reduce((max, num) => Math.max(max, num), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    // --- RENDER ---
    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }

    if (loading) {
        return <div className="text-center p-10 font-semibold">Loading Karnot CRM...</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header 
                activeView={activeView} 
                setActiveView={setActiveView} 
                quoteCount={quotes.length} 
                onLogout={handleLogout}
                onNewQuote={handleNewQuote} 
            />
            
            <main className="container mx-auto p-4 md:p-8">
                
                {activeView === 'opportunityDetail' && (
                    <OpportunityDetailPage
                        opportunity={selectedOpportunity}
                        // FIX: Filter quotes to only show related ones
                        quotes={quotes.filter(q => q.opportunityId === selectedOpportunity.id)} 
                        onBack={handleBackToFunnel}
                        onAddQuote={handleNewQuoteFromOpp} 
                        user={user} 
                    />
                )}
                
                {activeView === 'funnel' && (
                    <FunnelPage 
                        opportunities={opportunities} 
                        user={user}
                        onOpen={handleOpenOpportunity} 
                    />
                )}
                
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} />}
                
                {activeView === 'calculator' && (
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote} 
                        nextQuoteNumber={nextQuoteNumber}
                        key={quoteToEdit ? quoteToEdit.id : 'new'} 
                        initialData={quoteToEdit} 
                    />
                )}
                
                {activeView === 'list' && (
                    <QuotesListPage 
                        quotes={quotes} 
                        onUpdateQuoteStatus={handleUpdateQuoteStatus} 
                        onDeleteQuote={handleDeleteQuote} 
                        onEditQuote={handleEditQuote} // FIX: Now correctly passed
                    />
                )}

            </main>
        </div>
    );
}