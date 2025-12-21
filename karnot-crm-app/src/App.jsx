import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, query, doc, getDoc, setDoc, deleteDoc, serverTimestamp, addDoc, updateDoc, orderBy } from "firebase/firestore"; 

// --- 1. Import Pages (Verified Paths: ./pages/) ---
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx'; 
import ContactsPage from './pages/ContactsPage.jsx';
import CommissioningPage from './pages/CommissioningPage.jsx'; 
import AdminPage from './pages/AdminPage.jsx';
import CalculatorsPage from './pages/CalculatorsPage.jsx'; 
import SupplierManager from './pages/SupplierManager.jsx';
import TerritoryManagement from './pages/TerritoryManagement.jsx';
import AgentManagement from './pages/AgentManagement.jsx';
import AppointmentScheduler from './pages/AppointmentScheduler.jsx';

// --- 2. Import Components (Verified Paths: ./components/) ---
import QuoteCalculator from './components/QuoteCalculator.jsx';
import HeatPumpCalculator from './components/HeatPumpCalculator.jsx';
import WarmRoomCalc from './components/WarmRoomCalc.jsx';

// --- 3. Import Data & Financial (Verified Paths: ./data/) ---
import FinancialEntryLogger from './data/FinancialEntryLogger.jsx';
import ManpowerLogger from './data/ManpowerLogger.jsx';
import ProjectOperations from './data/ProjectOperations.jsx'; 
import BIRBookPrep from './data/BIRBookPrep.jsx'; 

// --- 4. Import Constants & Styling ---
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { 
    BarChart2, List, HardHat, LogOut, Building, 
    Users, Settings, Calculator, Plus, Landmark, Clock, BookOpen, Briefcase, Truck, Activity,
    MapPin, Calendar, UserCheck
} from 'lucide-react'; 

// --- 5. Header Component (Territory Management Navigation Added) ---
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote, userRole }) => ( 
    <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-orange-500">
        <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('funnel')}>
                <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Karnot <span className="text-orange-600">CRM</span></h1>
            </div>
            <nav className="flex flex-wrap gap-2 justify-center lg:justify-end">
                <Button onClick={() => setActiveView('funnel')} variant={activeView === 'funnel' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><HardHat className="mr-1" size={14} /> Funnel</Button>
                <Button onClick={() => setActiveView('companies')} variant={activeView === 'companies' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><Building className="mr-1" size={14} /> Companies</Button>
                
                {/* CONTACTS BUTTON */}
                <Button onClick={() => setActiveView('contacts')} variant={activeView === 'contacts' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><Users className="mr-1" size={14} /> Contacts</Button>
                
                {/* TERRITORY MANAGEMENT SECTION */}
                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                <Button onClick={() => setActiveView('territories')} variant={activeView === 'territories' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"><MapPin className="mr-1" size={14} /> Territories</Button>
                <Button onClick={() => setActiveView('agents')} variant={activeView === 'agents' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"><UserCheck className="mr-1" size={14} /> Agents</Button>
                <Button onClick={() => setActiveView('appointments')} variant={activeView === 'appointments' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"><Calendar className="mr-1" size={14} /> Call Centre</Button>
                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                
                <Button onClick={() => setActiveView('suppliers')} variant={activeView === 'suppliers' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest"><Truck className="mr-1" size={14} /> Suppliers</Button>
                
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
    
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]); 
    const [manpowerLogs, setManpowerLogs] = useState([]);
    
    // TERRITORY MANAGEMENT STATE
    const [territories, setTerritories] = useState([]);
    const [agents, setAgents] = useState([]);
    const [appointments, setAppointments] = useState([]);
    
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    // --- Auth Listener ---
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

    // --- Data Stream (ENHANCED WITH TERRITORY COLLECTIONS) ---
    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            
            // EXISTING COLLECTIONS
            const unsubQuotes = onSnapshot(
                query(collection(db, "users", user.uid, "quotes"), orderBy("lastModified", "desc")), 
                (snap) => setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubOpps = onSnapshot(
                query(collection(db, "users", user.uid, "opportunities"), orderBy("createdAt", "desc")), 
                (snap) => setOpportunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubCompanies = onSnapshot(
                query(collection(db, "users", user.uid, "companies"), orderBy("companyName", "asc")), 
                (snap) => setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubContacts = onSnapshot(
                query(collection(db, "users", user.uid, "contacts"), orderBy("lastName", "asc")), 
                (snap) => setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubLedger = onSnapshot(
                query(collection(db, "users", user.uid, "ledger"), orderBy("date", "desc")), 
                (snap) => setLedgerEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubManpower = onSnapshot(
                query(collection(db, "users", user.uid, "manpower_logs")), 
                (snap) => setManpowerLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // NEW TERRITORY MANAGEMENT COLLECTIONS
            const unsubTerritories = onSnapshot(
                query(collection(db, "users", user.uid, "territories"), orderBy("name", "asc")), 
                (snap) => setTerritories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubAgents = onSnapshot(
                query(collection(db, "users", user.uid, "agents"), orderBy("name", "asc")), 
                (snap) => setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            const unsubAppointments = onSnapshot(
                query(collection(db, "users", user.uid, "appointments"), orderBy("appointmentDate", "asc")), 
                (snap) => {
                    setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoadingData(false);
                }
            );
            
            return () => { 
                unsubQuotes(); 
                unsubOpps(); 
                unsubCompanies(); 
                unsubContacts(); 
                unsubLedger(); 
                unsubManpower();
                unsubTerritories();
                unsubAgents();
                unsubAppointments();
            };
        } else {
            setLoadingData(false);
        }
    }, [user]); 

    // --- Global Handlers ---
    const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password).catch((e) => alert(e.message));
    const handleLogout = () => signOut(auth);
    
    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid, "quotes", quoteId), { 
            status: newStatus, 
            lastModified: serverTimestamp() 
        });
    };

    const handleSaveQuote = async (quoteData) => {
        if (!user) return;
        await setDoc(doc(db, "users", user.uid, "quotes", quoteData.id), { ...quoteData, lastModified: serverTimestamp() }, { merge: true });
        setActiveView('list'); 
    };
    
    const handleDeleteQuote = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "users", user.uid, "quotes", id)); };
    const handleEditQuote = (quote) => { setQuoteToEdit(quote); setActiveView('calculator'); };
    const handleNewQuote = () => { setQuoteToEdit(null); setActiveView('calculator'); };

    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes.map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10)).filter(n => !isNaN(n)).reduce((m, n) => Math.max(m, n), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    if (loadingAuth) return <div className="text-center p-20 font-black uppercase text-orange-600 animate-pulse bg-white min-h-screen">Security Handshake...</div>;
    if (!user) return <LoginPage onLogin={handleLogin} />;
    if (loadingData) return <div className="text-center p-20 font-black uppercase text-orange-600 animate-pulse bg-white min-h-screen">Loading Karnot Systems...</div>;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <Header 
                activeView={activeView} 
                setActiveView={setActiveView} 
                quoteCount={quotes.length} 
                onLogout={handleLogout} 
                onNewQuote={handleNewQuote} 
                userRole={userRole} 
            />
            <main className="container mx-auto p-4 md:p-8">
                {/* EXISTING VIEWS */}
                {activeView === 'funnel' && (
                    <FunnelPage 
                        opportunities={opportunities} 
                        user={user} 
                        quotes={quotes} 
                        onOpenQuote={handleEditQuote} 
                        onOpen={(opp) => { setSelectedOpportunity(opp); setActiveView('opportunityDetail'); }} 
                        companies={companies} 
                        contacts={contacts}
                        appointments={appointments}
                    />
                )}
                
                {activeView === 'opportunityDetail' && (
                    <OpportunityDetailPage 
                        opportunity={selectedOpportunity} 
                        quotes={quotes} 
                        onBack={() => setActiveView('funnel')} 
                        onOpenQuote={handleEditQuote} 
                        user={user} 
                        companies={companies} 
                        onAddQuote={() => { 
                            setQuoteToEdit({ customer: { name: selectedOpportunity.customerName }, opportunityId: selectedOpportunity.id }); 
                            setActiveView('calculator'); 
                        }} 
                    />
                )}
                
                {activeView === 'companies' && (
                    <CompaniesPage 
                        companies={companies} 
                        contacts={contacts} 
                        quotes={quotes} 
                        user={user} 
                        onOpenQuote={handleEditQuote}
                        appointments={appointments}
                    />
                )}
                
                {activeView === 'contacts' && (
                    <ContactsPage 
                        contacts={contacts} 
                        companies={companies} 
                        user={user} 
                    />
                )}
                
                {activeView === 'suppliers' && <SupplierManager user={user} />}
                
                {/* TERRITORY MANAGEMENT VIEWS */}
                {activeView === 'territories' && (
                    <TerritoryManagement 
                        territories={territories} 
                        agents={agents} 
                        companies={companies} 
                        user={user}
                        appointments={appointments}
                    />
                )}
                
                {activeView === 'agents' && (
                    <AgentManagement 
                        agents={agents} 
                        territories={territories} 
                        user={user} 
                        quotes={quotes} 
                    />
                )}
                
                {activeView === 'appointments' && (
                    <AppointmentScheduler 
                        appointments={appointments} 
                        companies={companies} 
                        agents={agents} 
                        user={user} 
                    />
                )}
                
                {/* CALCULATOR VIEWS */}
                {activeView === 'calculator' && (
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote} 
                        nextQuoteNumber={nextQuoteNumber} 
                        key={quoteToEdit ? quoteToEdit.id : 'new'} 
                        initialData={quoteToEdit} 
                        companies={companies} 
                        contacts={contacts} 
                        opportunities={opportunities} 
                    />
                )}
                
                {activeView === 'list' && (
                    <QuotesListPage 
                        quotes={quotes} 
                        onDeleteQuote={handleDeleteQuote} 
                        onEditQuote={handleEditQuote} 
                        onUpdateQuoteStatus={handleUpdateQuoteStatus}
                        opportunities={opportunities}
                    />
                )}

                {activeView === 'dashboard' && <DashboardPage quotes={quotes} user={user} />}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                {activeView === 'heatPumpCalc' && (
                    <div className="max-w-5xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">← Back</Button>
                        <HeatPumpCalculator />
                    </div>
                )}
                {activeView === 'warmRoomCalc' && <WarmRoomCalc setActiveView={setActiveView} user={user} />}
                {activeView === 'admin' && <AdminPage user={user} />}
                
                {/* ACCOUNTS HUB */}
                {activeView === 'accounts' && (
                    <div className="space-y-6 pb-20">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase leading-none mb-1">Accounts Hub</h1>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">FYE: Dec 31 | PEZA Export Enterprise Status</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setSubView('ledger')} variant={subView === 'ledger' ? 'primary' : 'secondary'}><Landmark size={14} className="mr-1" /> Disbursements</Button>
                                <Button onClick={() => setSubView('manpower')} variant={subView === 'manpower' ? 'primary' : 'secondary'}><Clock size={14} className="mr-1" /> Manpower</Button>
                                <Button onClick={() => setSubView('projectOps')} variant={subView === 'projectOps' ? 'primary' : 'secondary'}><Briefcase size={14} className="mr-1" /> Project ROI</Button>
                                <Button onClick={() => setSubView('birBooks')} variant={subView === 'birBooks' ? 'primary' : 'secondary'} className="border-orange-500 text-orange-700"><BookOpen size={14} className="mr-1" /> BIR Books</Button>
                                <Button onClick={() => setSubView('commissioning')} variant={subView === 'commissioning' ? 'primary' : 'secondary'}><Activity size={14} className="mr-1" /> Install & QC</Button>
                            </div>
                        </div>

                        {subView === 'ledger' && <FinancialEntryLogger companies={companies} />}
                        {subView === 'manpower' && <ManpowerLogger companies={companies} />}
                        {subView === 'projectOps' && <ProjectOperations quotes={quotes} manpowerLogs={manpowerLogs} ledgerEntries={ledgerEntries} />}
                        {subView === 'birBooks' && <BIRBookPrep quotes={quotes} ledgerEntries={ledgerEntries} />}
                        {subView === 'commissioning' && <CommissioningPage quotes={quotes} />}
                    </div>
                )}
            </main>
        </div>
    );
}
