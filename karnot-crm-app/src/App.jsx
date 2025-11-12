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
import CompaniesPage from './pages/CompaniesPage.jsx'; 
import ContactsPage from './pages/ContactsPage.jsx';

// --- Import Constants & Header ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { BarChart2, FileText, List, HardHat, LogOut, Building, Users } from 'lucide-react'; 

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
                <Button onClick={() => setActiveView('companies')} variant={activeView === 'companies' ? 'primary' : 'secondary'}><Building className="mr-2" size={16} /> Companies</Button>
                <Button onClick={() => setActiveView('contacts')} variant={activeView === 'contacts' ? 'primary' : 'secondary'}><Users className="mr-2" size={16} /> Contacts</Button>
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
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    // AUTH HOOK
    useEffect(() => {
        setLoadingAuth(true); 
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user); 
            } else {
                setUser(null); 
            }
            setLoadingAuth(false); 
        });
        return () => unsubscribe(); 
    }, []);

    // DATA SYNC HOOK
    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            
            let quotesLoaded = false;
            let oppsLoaded = false;
            let companiesLoaded = false;
            let contactsLoaded = false;
            
            const checkAllDataLoaded = () => {
                if (quotesLoaded && oppsLoaded && companiesLoaded && contactsLoaded) {
                    setLoadingData(false); 
                }
            };
            
            // 1. Sync Quotes
            const quotesQuery = query(collection(db, "users", user.uid, "quotes"));
            const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
                const liveQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuotes(liveQuotes);
                quotesLoaded = true;
                checkAllDataLoaded();
            }, (error) => { console.error("Error syncing quotes: ", error); });

            // 2. Sync Opportunities
            const oppsQuery = query(collection(db, "users", user.uid, "opportunities"));
            const unsubOpps = onSnapshot(oppsQuery, (snapshot) => {
                const liveOpps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOpportunities(liveOpps);
                oppsLoaded = true;
                checkAllDataLoaded();
            }, (error) => { console.error("Error syncing opportunities: ", error); });
            
            // 3. Sync Companies
            const companiesQuery = query(collection(db, "users", user.uid, "companies"));
            const unsubCompanies = onSnapshot(companiesQuery, (snapshot) => {
                const liveCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCompanies(liveCompanies);
                companiesLoaded = true;
                checkAllDataLoaded();
            }, (error) => { console.error("Error syncing companies: ", error); });
            
            // 4. Sync Contacts
            const contactsQuery = query(collection(db, "users", user.uid, "contacts"));
            const unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
                const liveContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setContacts(liveContacts);
                contactsLoaded = true;
                checkAllDataLoaded();
            }, (error) => { console.error("Error syncing contacts: ", error); });

            return () => {
                unsubQuotes();
                unsubOpps();
                unsubCompanies(); 
                unsubContacts();
            };
        } else {
            setQuotes([]);
            setOpportunities([]);
            setCompanies([]);
            setContacts([]);
            setLoadingData(false);
        }
    }, [user]); 

    // --- (All handle... functions remain unchanged) ---
    const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => alert("Login Failed: " + error.message));
    };
    const handleLogout = () => {
        signOut(auth);
    };
    const handleSaveQuote = async (quoteData) => {
        if (!user) {
            alert("Error: You are not logged in. Please refresh and log in again.");
            return;
        }
        let currentOpportunityId = quoteData.opportunityId;
        if (!currentOpportunityId) {
            try {
                const newOppData = {
                    customerName: quoteData.customer.name, 
                    project: `Quote ${quoteData.id} Project`,
                    estimatedValue: quoteData.finalSalesPrice || 0,
                    stage: 'Proposal Sent', 
                    probability: 75,
                    contactName: quoteData.customer.name || 'Unknown', 
                    contactEmail: 'N/A',
                    createdAt: serverTimestamp(),
                    lastModified: serverTimestamp()
                };
                const oppsCollectionRef = collection(db, "users", user.uid, "opportunities");
                const oppDocRef = await addDoc(oppsCollectionRef, newOppData); 
                currentOpportunityId = oppDocRef.id; 
            } catch (error) {
                console.error("Error creating new opportunity automatically: ", error);
                alert("Quote saved, but failed to create linked funnel entry. See console.");
            }
        }
        const quoteRef = doc(db, "users", user.uid, "quotes", quoteData.id);
        try {
            await setDoc(quoteRef, {
                ...quoteData,
                opportunityId: currentOpportunityId, 
                createdAt: quoteData.createdAt || serverTimestamp(), 
                lastModified: serverTimestamp()
            }, { merge: true }); 
            alert(`Quote ${quoteData.id} has been saved and linked to the Funnel!`);
            setActiveView('funnel'); 
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
    // --- (End of handle... functions) ---

    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes
            .map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10))
            .filter(num => !isNaN(num))
            .reduce((max, num) => Math.max(max, num), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    // --- RENDER ---
    if (loadingAuth) {
        return <div className="text-center p-10 font-semibold">Authenticating...</div>;
    }
    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }
    if (loadingData) {
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
                
                {activeView === 'companies' && (
                    <CompaniesPage 
                        companies={companies}
                        user={user}
                    />
                )}
                
                {activeView === 'contacts' && (
                    <ContactsPage 
                        contacts={contacts}
                        companies={companies}
                        user={user}
                    />
                )}
                
                {activeView === 'opportunityDetail' && (
                    <OpportunityDetailPage
                        opportunity={selectedOpportunity}
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
                        companies={companies}
                        contacts={contacts} // --- 1. PASS CONTACTS TO FUNNEL ---
                    />
                )}
                
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} />}
                
                {activeView === 'calculator' && (
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote} 
                        nextQuoteNumber={nextQuoteNumber}
                        key={quoteToEdit ? quoteToEdit.id : 'new'} 
                        initialData={quoteToEdit} 
                        companies={companies}
                        contacts={contacts} // --- 2. PASS CONTACTS TO CALCULATOR ---
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
