import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, query, doc, getDoc, setDoc, deleteDoc, serverTimestamp, addDoc, updateDoc } from "firebase/firestore"; 

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
import WarmRoomCalc from './components/WarmRoomCalc.jsx';

// --- Import New Financial Components ---
import FinancialEntryLogger from './data/FinancialEntryLogger.jsx';
import ManpowerLogger from './data/ManpowerLogger.jsx';
import ProjectOperations from './data/ProjectOperations.jsx'; // <--- Added
import BIRBookPrep from './data/BIRBookPrep.jsx';           // <--- Added

// --- Import Constants & Header ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { 
    BarChart2, FileText, List, HardHat, LogOut, Building, 
    Users, ClipboardCheck, Settings, Calculator, Plus, Landmark, Clock, BookOpen, Briefcase
} from 'lucide-react'; 

// --- Header Component ---
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote, userRole }) => ( 
    <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-orange-500">
        <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('funnel')}>
                <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Karnot <span className="text-orange-600">CRM</span></h1>
            </div>
            <nav className="flex flex-wrap gap-2 justify-center lg:justify-end">
                <Button onClick={() => setActiveView('funnel')} variant={activeView === 'funnel' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><HardHat className="mr-1" size={14} /> Funnel</Button>
                <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><BarChart2 className="mr-1" size={14} /> Dashboard</Button>
                <Button onClick={() => setActiveView('companies')} variant={activeView === 'companies' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><Building className="mr-1" size={14} /> Companies</Button>
                <Button onClick={() => setActiveView('contacts')} variant={activeView === 'contacts' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><Users className="mr-1" size={14} /> Contacts</Button>
                
                <Button onClick={() => setActiveView('calculatorsHub')} variant={['calculatorsHub', 'heatPumpCalc', 'warmRoomCalc'].includes(activeView) ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest">
                    <Calculator className="mr-1" size={14} /> Calculators
                </Button>

                {userRole === 'ADMIN' && (
                    <Button onClick={() => setActiveView('accounts')} variant={activeView === 'accounts' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest border-orange-200 text-orange-700">
                        <Landmark className="mr-1" size={14} /> Accounts
                    </Button>
                )}

                <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                <Button onClick={onNewQuote} variant="primary" className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 bg-orange-600">
                    <Plus className="mr-1" size={14} /> New Quote
                </Button>
                
                <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><List className="mr-1" size={14} /> Quotes ({quoteCount})</Button>
                
                <Button onClick={() => setActiveView('admin')} variant={activeView === 'admin' ? 'primary' : 'secondary'} className="!p-2"><Settings size={16} /></Button>
                <Button onClick={onLogout} variant="secondary" className="!p-2 text-red-500 hover:bg-red-50 border-red-100"><LogOut size={16} /></Button>
            </nav>
        </div>
    </header>
);

export default function App() {
    const [user, setUser] = useState(null); 
    const [userRole, setUserRole] = useState(null); 
    const [activeView, setActiveView] = useState('funnel');
    const [subView, setSubView] = useState('ledger'); 
    
    // Data States
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]); // <--- Added for ROI calc
    const [manpowerLogs, setManpowerLogs] = useState([]);   // <--- Added for ROI calc
    
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    // --- 1. AUTH & ROLE CHECK ---
    useEffect(() => {
        setLoadingAuth(true); 
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);
                try {
                    const userRef = doc(db, "users", authUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setUserRole(userSnap.data().role);
                    }
                } catch (err) { console.error(err); }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoadingAuth(false); 
        });
        return () => unsubscribe(); 
    }, []);

    // --- 2. DATA SNAPSHOTS ---
    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            const unsubQuotes = onSnapshot(query(collection(db, "users", user.uid, "quotes")), (snap) => {
                setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubOpps = onSnapshot(query(collection(db, "users", user.uid, "opportunities")), (snap) => {
                setOpportunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubCompanies = onSnapshot(query(collection(db, "users", user.uid, "companies")), (snap) => {
                setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubContacts = onSnapshot(query(collection(db, "users", user.uid, "contacts")), (snap) => {
                setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubLedger = onSnapshot(query(collection(db, "users", user.uid, "ledger")), (snap) => {
                setLedgerEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            const unsubManpower = onSnapshot(query(collection(db, "users", user.uid, "manpower_logs")), (snap) => {
                setManpowerLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingData(false);
            });

            return () => { unsubQuotes(); unsubOpps(); unsubCompanies(); unsubContacts(); unsubLedger(); unsubManpower(); };
        } else {
            setLoadingData(false);
        }
    }, [user]); 

    // --- 3. HANDLERS (Same as before) ---
    const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password).catch((e) => alert(e.message));
    const handleLogout = () => signOut(auth);
    const handleSaveQuote = async (quoteData) => {
        if (!user) return;
        await setDoc(doc(db, "users", user.uid, "quotes", quoteData.id), { ...quoteData, lastModified: serverTimestamp() }, { merge: true });
        setActiveView('funnel'); 
    };
    const handleDeleteQuote = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "users", user.uid, "quotes", id)); };
    const handleEditQuote = (quote) => { setQuoteToEdit(quote); setActiveView('calculator'); };
    const handleNewQuote = () => { setQuoteToEdit(null); setActiveView('calculator'); };

    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes.map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10)).filter(n => !isNaN(n)).reduce((m, n) => Math.max(m, n), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    if (loadingAuth) return <div className="text-center p-10 font-black uppercase tracking-widest text-orange-600">Authenticating...</div>;
    if (!user) return <LoginPage onLogin={handleLogin} />;
    if (loadingData) return <div className="text-center p-10 font-black uppercase tracking-widest text-orange-600">Loading Karnot Systems...</div>;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header activeView={activeView} setActiveView={setActiveView} quoteCount={quotes.length} onLogout={handleLogout} onNewQuote={handleNewQuote} userRole={userRole} />
            <main className="container mx-auto p-4 md:p-8">
                {activeView === 'funnel' && <FunnelPage opportunities={opportunities} user={user} quotes={quotes} onOpenQuote={handleEditQuote} onOpen={(opp) => { setSelectedOpportunity(opp); setActiveView('opportunityDetail'); }} companies={companies} contacts={contacts} />}
                {activeView === 'opportunityDetail' && <OpportunityDetailPage opportunity={selectedOpportunity} quotes={quotes} onBack={() => setActiveView('funnel')} onOpenQuote={handleEditQuote} user={user} onAddQuote={() => { setQuoteToEdit({ customer: { name: selectedOpportunity.customerName }, opportunityId: selectedOpportunity.id }); setActiveView('calculator'); }} />}
                {activeView === 'companies' && <CompaniesPage companies={companies} contacts={contacts} quotes={quotes} user={user} onOpenQuote={handleEditQuote} onRestoreCompany={(id) => updateDoc(doc(db, "users", user.uid, "companies", id), { isDeleted: false })} />}
                {activeView === 'contacts' && <ContactsPage contacts={contacts} companies={companies} user={user} />}
                {activeView === 'calculator' && <QuoteCalculator onSaveQuote={handleSaveQuote} nextQuoteNumber={nextQuoteNumber} key={quoteToEdit ? quoteToEdit.id : 'new'} initialData={quoteToEdit} companies={companies} contacts={contacts} />}
                {activeView === 'list' && <QuotesListPage quotes={quotes} onDeleteQuote={handleDeleteQuote} onEditQuote={handleEditQuote} onUpdateQuoteStatus={(id, s) => setDoc(doc(db, "users", user.uid, "quotes", id), { status: s }, { merge: true })} />}
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} user={user} />}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                {activeView === 'heatPumpCalc' && <div className="max-w-5xl mx-auto"><Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">← Back</Button><HeatPumpCalculator /></div>}
                {activeView === 'warmRoomCalc' && <WarmRoomCalc setActiveView={setActiveView} user={user} />}
                {activeView === 'admin' && <AdminPage user={user} />}
                
                {/* --- DEDICATED ACCOUNTS & BIR BOOKS SECTION --- */}
                {activeView === 'accounts' && (
                    <div className="space-y-6 pb-20">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Financial Accounts</h1>
                                <p className="text-gray-500 text-sm">BIR Compliance & Project Engineering Costing</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setSubView('ledger')} variant={subView === 'ledger' ? 'primary' : 'secondary'}>
                                    <Landmark size={14} className="mr-1" /> Disbursements
                                </Button>
                                <Button onClick={() => setSubView('manpower')} variant={subView === 'manpower' ? 'primary' : 'secondary'}>
                                    <Clock size={14} className="mr-1" /> Manpower
                                </Button>
                                <Button onClick={() => setSubView('projectOps')} variant={subView === 'projectOps' ? 'primary' : 'secondary'}>
                                    <Briefcase size={14} className="mr-1" /> Project ROI
                                </Button>
                                <Button onClick={() => setSubView('birBooks')} variant={subView === 'birBooks' ? 'primary' : 'secondary'} className="border-orange-500 text-orange-700">
                                    <BookOpen size={14} className="mr-1" /> BIR Books
                                </Button>
                            </div>
                        </div>

                        {/* Sub-view Content */}
                        {subView === 'ledger' && <FinancialEntryLogger companies={companies} />}
                        {subView === 'manpower' && <ManpowerLogger companies={companies} />}
                        {subView === 'projectOps' && <ProjectOperations quotes={quotes} manpowerLogs={manpowerLogs} ledgerEntries={ledgerEntries} />}
                        {subView === 'birBooks' && <BIRBookPrep quotes={quotes} ledgerEntries={ledgerEntries} />}
                    </div>
                )}
            </main>
        </div>
    );
}
