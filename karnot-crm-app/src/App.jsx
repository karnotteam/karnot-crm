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
import CommissioningPage from './pages/CommissioningPage.jsx'; 
import AdminPage from './pages/AdminPage.jsx';
import CalculatorsPage from './pages/CalculatorsPage.jsx';     
import HeatPumpCalculator from './components/HeatPumpCalculator.jsx';

// --- Import Constants & Header ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { BarChart2, FileText, List, HardHat, LogOut, Building, Users, ClipboardCheck, Settings, Calculator } from 'lucide-react'; 

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
                <Button onClick={() => setActiveView('commissioning')} variant={activeView === 'commissioning' ? 'primary' : 'secondary'}>
                    <ClipboardCheck className="mr-2" size={16} /> Commissioning
                </Button>
                <Button onClick={() => setActiveView('calculatorsHub')} variant={['calculatorsHub', 'heatPumpCalc'].includes(activeView) ? 'primary' : 'secondary'}>
                    <Calculator className="mr-2" size={16} /> Calculators
                </Button>
                <Button onClick={onNewQuote} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Quotes ({quoteCount})</Button>
                <Button onClick={() => setActiveView('admin')} variant={activeView === 'admin' ? 'primary' : 'secondary'} title="Admin / Settings">
                    <Settings size={16} />
                </Button>
                <Button onClick={onLogout} variant="secondary"><LogOut className="mr-2" size={16} />Logout</Button>
            </nav>
        </div>
    </header>
);

export default function App() {
    const [user, setUser] = useState(null); 
    const [activeView, setActiveView] = useState('funnel');
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [reportToEdit, setReportToEdit] = useState(null); 
    const [contactToEdit, setContactToEdit] = useState(null); 
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    const [commissioningReports, setCommissioningReports] = useState([]); 
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        setLoadingAuth(true); 
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user || null);
            setLoadingAuth(false); 
        });
        return () => unsubscribe(); 
    }, []);

    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            const unsubQuotes = onSnapshot(query(collection(db, "users", user.uid, "quotes")), (snap) => {
                setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubOpps = onSnapshot(query(collection(db, "users", user.uid, "opportunities")), (snap) => {
                const liveOpps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOpportunities(liveOpps);
                if (selectedOpportunity) {
                    const updated = liveOpps.find(o => o.id === selectedOpportunity.id);
                    if (updated) setSelectedOpportunity(updated);
                }
            });
            const unsubCompanies = onSnapshot(query(collection(db, "users", user.uid, "companies")), (snap) => {
                setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubContacts = onSnapshot(query(collection(db, "users", user.uid, "contacts")), (snap) => {
                setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubComms = onSnapshot(query(collection(db, "users", user.uid, "commissioning_reports")), (snap) => {
                setCommissioningReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingData(false);
            });
            return () => { unsubQuotes(); unsubOpps(); unsubCompanies(); unsubContacts(); unsubComms(); };
        } else {
            setLoadingData(false);
        }
    }, [user, selectedOpportunity?.id]); 

    const handleLogin = (email, password) => {
        signInWithEmailAndPassword(auth, email, password).catch((e) => alert(e.message));
    };
    const handleLogout = () => signOut(auth);

    const handleSaveQuote = async (quoteData) => {
        if (!user) return;
        let currentOpportunityId = quoteData.opportunityId;
        if (!currentOpportunityId) {
            const oppDocRef = await addDoc(collection(db, "users", user.uid, "opportunities"), {
                customerName: quoteData.customer.name, 
                project: `Quote ${quoteData.id} Project`,
                estimatedValue: quoteData.finalSalesPrice || 0,
                stage: 'Proposal Sent', probability: 75,
                createdAt: serverTimestamp(), lastModified: serverTimestamp()
            });
            currentOpportunityId = oppDocRef.id; 
        }
        await setDoc(doc(db, "users", user.uid, "quotes", quoteData.id), {
            ...quoteData, opportunityId: currentOpportunityId, 
            createdAt: quoteData.createdAt || serverTimestamp(), lastModified: serverTimestamp()
        }, { merge: true });
        setActiveView('funnel'); 
    };

    const handleUpdateNotes = async (oppId, notes) => {
        if (!user) return;
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { notes, lastModified: serverTimestamp() }, { merge: true });
    };

    const handleEditQuote = (quote) => { setQuoteToEdit(quote); setActiveView('calculator'); };
    const handleOpenOpportunity = (opp) => { setSelectedOpportunity(opp); setActiveView('opportunityDetail'); };
    const handleBackToFunnel = () => { setSelectedOpportunity(null); setActiveView('funnel'); };
    const handleNewQuote = () => { setQuoteToEdit(null); setSelectedOpportunity(null); setActiveView('calculator'); };

    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes.map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10)).filter(n => !isNaN(n)).reduce((m, n) => Math.max(m, n), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    if (loadingAuth) return <div className="text-center p-10 font-semibold">Authenticating...</div>;
    if (!user) return <LoginPage onLogin={handleLogin} />;
    if (loadingData) return <div className="text-center p-10 font-semibold">Loading Karnot CRM...</div>;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header activeView={activeView} setActiveView={setActiveView} quoteCount={quotes.length} onLogout={handleLogout} onNewQuote={handleNewQuote} />
            <main className="container mx-auto p-4 md:p-8">
                {activeView === 'companies' && (
                    <CompaniesPage companies={companies} contacts={contacts} quotes={quotes} user={user} onOpenQuote={handleEditQuote} />
                )}
                {activeView === 'contacts' && (
                    <ContactsPage contacts={contacts} companies={companies} quotes={quotes} user={user} initialContactToEdit={contactToEdit} />
                )}
                {activeView === 'opportunityDetail' && (
                    <OpportunityDetailPage
                        opportunity={selectedOpportunity}
                        quotes={quotes} 
                        onBack={handleBackToFunnel}
                        onOpenQuote={handleEditQuote}
                        onAddQuote={() => { setQuoteToEdit({ customer: { name: selectedOpportunity.customerName }, opportunityId: selectedOpportunity.id }); setActiveView('calculator'); }}
                        user={user} 
                    />
                )}
                {activeView === 'funnel' && (
                    <FunnelPage 
                        opportunities={opportunities} 
                        user={user}
                        quotes={quotes}
                        onOpenQuote={handleEditQuote}
                        onOpen={handleOpenOpportunity} 
                        companies={companies}
                        contacts={contacts} 
                    />
                )}
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} user={user} />}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                {activeView === 'calculator' && <QuoteCalculator onSaveQuote={handleSaveQuote} nextQuoteNumber={nextQuoteNumber} key={quoteToEdit ? quoteToEdit.id : 'new'} initialData={quoteToEdit} companies={companies} contacts={contacts} />}
                {activeView === 'list' && <QuotesListPage quotes={quotes} onEditQuote={handleEditQuote} />}
                {activeView === 'admin' && <AdminPage user={user} />}
            </main>
        </div>
    );
}
