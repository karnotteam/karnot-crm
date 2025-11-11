// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; // Import your new firebase config
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"; // For login/logout
import { collection, onSnapshot, query, doc, addDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"; // For the database

// --- Import Pages & Components (FIX: Added .jsx to all imports) ---
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import QuoteCalculator from './components/QuoteCalculator.jsx';

// --- Import Constants & Header (FIX: Added .jsx to all imports) ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { BarChart2, FileText, List, HardHat, LogOut } from 'lucide-react'; 

// --- Header Component ---
// This is your new navigation bar
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote }) => ( // FIX: Added onNewQuote
    <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                <h1 className="text-2xl font-bold text-orange-600">Funnel CRM</h1>
            </div>
            <nav className="flex flex-wrap gap-2 justify-end">
                <Button onClick={() => setActiveView('funnel')} variant={activeView === 'funnel' ? 'primary' : 'secondary'}><HardHat className="mr-2" size={16} /> Funnel</Button>
                <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'}><BarChart2 className="mr-2" size={16} /> Dashboard</Button>
                {/* FIX: This button now calls onNewQuote to clear old data */}
                <Button onClick={onNewQuote} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Quotes ({quoteCount})</Button>
                <Button onClick={onLogout} variant="secondary"><LogOut className="mr-2" size={16} />Logout</Button>
            </nav>
        </div>
    </header>
);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null); // This tracks the logged-in user
    const [activeView, setActiveView] = useState('funnel');
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    
    // --- State from Firebase ---
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // This hook checks if you are logged in
    useEffect(() => {
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user); // User is logged in
            } else {
                setUser(null); // User is logged out
                setLoading(false);
            }
        });
        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    // This hook syncs all your data from Firebase *after* you log in
    useEffect(() => {
        if (user) {
            setLoading(true);
            
            // 1. Sync Quotes
            const quotesQuery = query(collection(db, "users", user.uid, "quotes"));
            const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
                const liveQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuotes(liveQuotes);
                setLoading(false); // We have quotes, so stop loading
            }, (error) => {
                console.error("Error syncing quotes: ", error);
                setLoading(false);
            });

            // 2. Sync Opportunities
            const oppsQuery = query(collection(db, "users", user.uid, "opportunities"));
            const unsubOpps = onSnapshot(oppsQuery, (snapshot) => {
                const liveOpps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOpportunities(liveOpps);
            }, (error) => {
                console.error("Error syncing opportunities: ", error);
            });
            
            // This stops listening when you log out
            return () => {
                unsubQuotes();
                unsubOpps();
            };
        }
    }, [user]); // Re-run this effect when the user object changes

    // --- Firebase Login/Logout ---
    const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => alert("Login Failed: " + error.message));
    };

    const handleLogout = () => {
        signOut(auth);
    };

    // --- Firebase Database Functions (Replaces your old localStorage) ---
    const handleSaveQuote = async (quoteData) => {
        if (!user) {
            alert("Error: You are not logged in. Please refresh and log in again.");
            return;
        }
        
        const quoteRef = doc(db, "users", user.uid, "quotes", quoteData.id);
        try {
            await setDoc(quoteRef, {
                ...quoteData,
                // Use serverTimestamp for accuracy
                createdAt: quoteData.createdAt || serverTimestamp(), 
                lastModified: serverTimestamp()
            }, { merge: true }); // 'merge: true' creates new or updates existing
            
            alert(`Quote ${quoteData.id} has been saved to the cloud!`);
            setActiveView('list');
            setQuoteToEdit(null);
        } catch (error) {
            console.error("Error saving quote: ", error);
            alert("Error saving quote. See console.");
        }
    };
    
    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        const quoteRef = doc(db, "users", user.uid, "quotes", quoteId);
        try {
            await setDoc(quoteRef, { status: newStatus }, { merge: true });
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
    const handleEditQuote = (quote) => {
        setQuoteToEdit(quote);
        setActiveView('calculator');
    };

    // This function is now passed to the Header
    const handleNewQuote = () => {
        setQuoteToEdit(null); // Clear any quote being edited
        setActiveView('calculator');
    };

    // --- Logic from your old app, now powered by Firebase state ---
    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes
           .map(q => parseInt(q.id.split('/')[0].replace('QN', ''), 10))
           .filter(num => !isNaN(num))
           .reduce((max, num) => Math.max(max, num), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); // Recalculates when 'quotes' from Firebase changes

    // --- RENDER ---

    // 1. If not logged in, show Login Page
    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }

    // 2. If logged in but data is loading, show loading screen
    if (loading) {
        return <div className="text-center p-10 font-semibold">Loading Karnot CRM...</div>;
    }

    // 3. If logged in and loaded, show the main app
    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header 
                activeView={activeView} 
                setActiveView={setActiveView} 
                quoteCount={quotes.length} 
                onLogout={handleLogout}
                onNewQuote={handleNewQuote} // <-- Pass the function to the header
            />
            
            <main className="container mx-auto p-4 md:p-8">
                
                {activeView === 'funnel' && (
                    <FunnelPage 
                        opportunities={opportunities} 
                        user={user} // <-- Pass the user to the funnel
                    />
                )}
                
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} />}
                
                {activeView === 'calculator' && (
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote} 
                        nextQuoteNumber={nextQuoteNumber}
                        key={quoteToEdit ? quoteToEdit.id : 'new'} // This trick forces component to reset for a new quote
                        initialData={quoteToEdit} 
                    />
                )}
                
                {activeView === 'list' && (
                    <QuotesListPage 
                        quotes={quotes} 
                        onUpdateQuoteStatus={handleUpdateQuoteStatus} 
                        onDeleteQuote={handleDeleteQuote} 
                        onEditQuote={handleEditQuote} 
                    />
                )}

            </main>
        </div>
    );
}
