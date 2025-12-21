import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
    collection, 
    onSnapshot, 
    query, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    serverTimestamp, 
    addDoc, 
    updateDoc, 
    orderBy 
} from "firebase/firestore"; 

// ==========================================
// 1. PAGE IMPORTS
// ==========================================
import LoginPage from './pages/LoginPage.jsx';
import FunnelPage from './pages/FunnelPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuotesListPage from './pages/QuotesListPage.jsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx'; 
import ContactsPage from './pages/ContactsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CalculatorsPage from './pages/CalculatorsPage.jsx'; 
import SupplierManager from './pages/SupplierManager.jsx';

// --- Territory & Field Sales Modules ---
import TerritoryManagement from './pages/TerritoryManagement.jsx';
import AgentManagement from './pages/AgentManagement.jsx';
import AppointmentScheduler from './pages/AppointmentScheduler.jsx';

// --- Service & Operations Modules ---
import InstallEstimator from './pages/InstallEstimator.jsx'; // The new Estimator/Commissioning Tool

// --- Finance & Banking Modules ---
import BankReconciliation from './pages/BankReconciliation.jsx'; 

// ==========================================
// 2. COMPONENT IMPORTS
// ==========================================
import QuoteCalculator from './components/QuoteCalculator.jsx';
import HeatPumpCalculator from './components/HeatPumpCalculator.jsx';
import WarmRoomCalc from './components/WarmRoomCalc.jsx';

// ==========================================
// 3. DATA & ACCOUNTING MODULES
// ==========================================
import FinancialEntryLogger from './data/FinancialEntryLogger.jsx';
import ManpowerLogger from './data/ManpowerLogger.jsx';
import ProjectOperations from './data/ProjectOperations.jsx'; 
import BIRBookPrep from './data/BIRBookPrep.jsx'; 

// ==========================================
// 4. CONSTANTS & STYLING
// ==========================================
import { KARNOT_LOGO_BASE_64, Button } from './data/constants.jsx'; 
import { 
    BarChart2, List, HardHat, LogOut, Building, 
    Users, Settings, Calculator, Plus, Landmark, Clock, BookOpen, Briefcase, Truck, Activity,
    MapPin, Calendar, UserCheck, Wrench, FileCheck
} from 'lucide-react'; 

// ==========================================
// 5. MAIN NAVIGATION HEADER
// ==========================================
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote, userRole }) => ( 
    <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-orange-500">
        <div className="container mx-auto px-4 py-3 flex flex-col lg:flex-row justify-between items-center gap-4">
            
            {/* BRANDING */}
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveView('dashboard')}>
                <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '45px'}}/>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Karnot <span className="text-orange-600">CRM</span></h1>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Pro Enterprise Edition</p>
                </div>
            </div>

            {/* NAVIGATION BAR */}
            <nav className="flex flex-wrap gap-2 justify-center lg:justify-end items-center">
                
                {/* --- GROUP A: CORE BUSINESS --- */}
                <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <BarChart2 className="mr-1.5" size={14} /> Dashboard
                </Button>
                
                <Button onClick={() => setActiveView('funnel')} variant={activeView === 'funnel' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <HardHat className="mr-1.5" size={14} /> Funnel
                </Button>
                
                <Button onClick={() => setActiveView('installEstimator')} variant={activeView === 'installEstimator' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100 h-9">
                    <Wrench className="mr-1.5" size={14} /> Install & QC
                </Button>
                
                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>

                {/* --- GROUP B: CRM & DIRECTORY --- */}
                <Button onClick={() => setActiveView('companies')} variant={activeView === 'companies' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <Building className="mr-1.5" size={14} /> Companies
                </Button>
                <Button onClick={() => setActiveView('contacts')} variant={activeView === 'contacts' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <Users className="mr-1.5" size={14} /> Contacts
                </Button>
                <Button onClick={() => setActiveView('suppliers')} variant={activeView === 'suppliers' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <Truck className="mr-1.5" size={14} /> Suppliers
                </Button>
                
                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>

                {/* --- GROUP C: FIELD OPERATIONS --- */}
                <Button onClick={() => setActiveView('territories')} variant={activeView === 'territories' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 h-9">
                    <MapPin className="mr-1.5" size={14} /> Territories
                </Button>
                <Button onClick={() => setActiveView('agents')} variant={activeView === 'agents' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 h-9">
                    <UserCheck className="mr-1.5" size={14} /> Agents
                </Button>
                <Button onClick={() => setActiveView('appointments')} variant={activeView === 'appointments' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 h-9">
                    <Calendar className="mr-1.5" size={14} /> Call Centre
                </Button>
                
                <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>
                
                {/* --- GROUP D: TOOLS & FINANCE --- */}
                <Button onClick={() => setActiveView('calculatorsHub')} variant={['calculatorsHub', 'heatPumpCalc', 'warmRoomCalc'].includes(activeView) ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <Calculator className="mr-1.5" size={14} /> Calculators
                </Button>

                {userRole === 'ADMIN' && (
                    <Button onClick={() => setActiveView('accounts')} variant={activeView === 'accounts' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest border-orange-200 text-orange-700 h-9">
                        <Landmark className="mr-1.5" size={14} /> Accounts
                    </Button>
                )}

                <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                {/* --- GROUP E: ACTIONS --- */}
                <Button onClick={onNewQuote} variant="primary" className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 bg-orange-600 hover:bg-orange-700 h-9">
                    <Plus className="mr-1.5" size={14} /> New Quote
                </Button>
                
                <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest h-9">
                    <List className="mr-1.5" size={14} /> Quotes ({quoteCount})
                </Button>
                
                <Button onClick={() => setActiveView('admin')} variant={activeView === 'admin' ? 'primary' : 'secondary'} className="!p-2 h-9 w-9"><Settings size={16} /></Button>
                <Button onClick={onLogout} variant="secondary" className="!p-2 text-red-500 hover:bg-red-50 border-red-100 h-9 w-9"><LogOut size={16} /></Button>
            </nav>
        </div>
    </header>
);

// ==========================================
// 6. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
    // --- Application State ---
    const [user, setUser] = useState(null); 
    const [userRole, setUserRole] = useState(null); 
    const [activeView, setActiveView] = useState('dashboard'); // Start at Dashboard
    const [subView, setSubView] = useState('ledger'); 
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);

    // --- Core Data Collections ---
    const [opportunities, setOpportunities] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [contacts, setContacts] = useState([]);
    
    // --- Finance Data ---
    const [ledgerEntries, setLedgerEntries] = useState([]); 
    const [manpowerLogs, setManpowerLogs] = useState([]);
    
    // --- Territory Management Data ---
    const [territories, setTerritories] = useState([]);
    const [agents, setAgents] = useState([]);
    const [appointments, setAppointments] = useState([]);
    
    // --- Interaction State ---
    const [quoteToEdit, setQuoteToEdit] = useState(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null); 

    // ------------------------------------------
    // AUTHENTICATION LISTENER
    // ------------------------------------------
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
                } catch (err) { console.error("Role Fetch Error:", err); }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoadingAuth(false); 
        });
        return () => unsubscribe(); 
    }, []);

    // ------------------------------------------
    // REAL-TIME DATA STREAM
    // ------------------------------------------
    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            
            // 1. QUOTES
            const unsubQuotes = onSnapshot(
                query(collection(db, "users", user.uid, "quotes"), orderBy("lastModified", "desc")), 
                (snap) => setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 2. OPPORTUNITIES
            const unsubOpps = onSnapshot(
                query(collection(db, "users", user.uid, "opportunities"), orderBy("createdAt", "desc")), 
                (snap) => setOpportunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 3. COMPANIES
            const unsubCompanies = onSnapshot(
                query(collection(db, "users", user.uid, "companies"), orderBy("companyName", "asc")), 
                (snap) => setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 4. CONTACTS
            const unsubContacts = onSnapshot(
                query(collection(db, "users", user.uid, "contacts"), orderBy("lastName", "asc")), 
                (snap) => setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 5. LEDGER
            const unsubLedger = onSnapshot(
                query(collection(db, "users", user.uid, "ledger"), orderBy("date", "desc")), 
                (snap) => setLedgerEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 6. MANPOWER
            const unsubManpower = onSnapshot(
                query(collection(db, "users", user.uid, "manpower_logs")), 
                (snap) => setManpowerLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 7. TERRITORIES
            const unsubTerritories = onSnapshot(
                query(collection(db, "users", user.uid, "territories"), orderBy("name", "asc")), 
                (snap) => setTerritories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 8. AGENTS
            const unsubAgents = onSnapshot(
                query(collection(db, "users", user.uid, "agents"), orderBy("name", "asc")), 
                (snap) => setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            );
            
            // 9. APPOINTMENTS
            const unsubAppointments = onSnapshot(
                query(collection(db, "users", user.uid, "appointments"), orderBy("appointmentDate", "asc")), 
                (snap) => {
                    setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoadingData(false); // Data load complete after final query
                }
            );
            
            return () => { 
                unsubQuotes(); unsubOpps(); unsubCompanies(); unsubContacts(); 
                unsubLedger(); unsubManpower(); unsubTerritories(); 
                unsubAgents(); unsubAppointments();
            };
        } else {
            setLoadingData(false);
        }
    }, [user]); 

    // ------------------------------------------
    // GLOBAL HANDLERS
    // ------------------------------------------
    const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password).catch((e) => alert(e.message));
    const handleLogout = () => signOut(auth);
    
    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "quotes", quoteId), { 
                status: newStatus, 
                lastModified: serverTimestamp() 
            });
        } catch (e) {
            console.error("Status Update Failed", e);
        }
    };

    const handleSaveQuote = async (quoteData) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "quotes", quoteData.id), { 
                ...quoteData, 
                lastModified: serverTimestamp() 
            }, { merge: true });
            setActiveView('list'); 
        } catch (e) {
            console.error("Save Quote Failed", e);
            alert("Error saving quote.");
        }
    };
    
    const handleDeleteQuote = async (id) => { 
        if(window.confirm("Are you sure you want to delete this quote?")) {
            await deleteDoc(doc(db, "users", user.uid, "quotes", id)); 
        }
    };

    const handleEditQuote = (quote) => { 
        setQuoteToEdit(quote); 
        setActiveView('calculator'); 
    };

    const handleNewQuote = () => { 
        setQuoteToEdit(null); 
        setActiveView('calculator'); 
    };

    // Calculate next ID intelligently
    const nextQuoteNumber = useMemo(() => {
        if (quotes.length === 0) return 2501;
        const lastQuoteNum = quotes
            .map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10))
            .filter(n => !isNaN(n))
            .reduce((m, n) => Math.max(m, n), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [quotes]); 

    // ------------------------------------------
    // LOADING & AUTH STATES
    // ------------------------------------------
    if (loadingAuth) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
                <img src={KARNOT_LOGO_BASE_64} className="h-12 mx-auto mb-4 animate-bounce" alt="Loading"/>
                <p className="font-black uppercase text-orange-600 animate-pulse tracking-[0.2em]">Security Handshake...</p>
            </div>
        </div>
    );

    if (!user) return <LoginPage onLogin={handleLogin} />;

    if (loadingData) return (
        <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
                <img src={KARNOT_LOGO_BASE_64} className="h-12 mx-auto mb-4 animate-spin" alt="Loading"/>
                <p className="font-black uppercase text-orange-600 animate-pulse tracking-[0.2em]">Loading Karnot Systems...</p>
            </div>
        </div>
    );

    // ------------------------------------------
    // MAIN RENDER
    // ------------------------------------------
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
                
                {/* 1. DASHBOARD (HOME) */}
                {activeView === 'dashboard' && <DashboardPage quotes={quotes} user={user} />}
                
                {/* 2. SALES FUNNEL */}
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
                
                {/* 3. OPPORTUNITY DETAIL */}
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

                {/* 4. INSTALLATION & QC ESTIMATOR */}
                {activeView === 'installEstimator' && (
                    <InstallEstimator 
                        quotes={quotes} 
                        user={user} 
                    />
                )}
                
                {/* 5. DIRECTORY: COMPANIES */}
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
                
                {/* 6. DIRECTORY: CONTACTS */}
                {activeView === 'contacts' && (
                    <ContactsPage 
                        contacts={contacts} 
                        companies={companies} 
                        user={user} 
                    />
                )}
                
                {/* 7. DIRECTORY: SUPPLIERS */}
                {activeView === 'suppliers' && <SupplierManager user={user} />}
                
                {/* 8. TERRITORY MANAGEMENT */}
                {activeView === 'territories' && (
                    <TerritoryManagement 
                        territories={territories} 
                        agents={agents} 
                        companies={companies} 
                        user={user}
                        appointments={appointments}
                    />
                )}
                
                {/* 9. AGENT MANAGEMENT */}
                {activeView === 'agents' && (
                    <AgentManagement 
                        agents={agents} 
                        territories={territories} 
                        user={user} 
                        quotes={quotes} 
                    />
                )}
                
                {/* 10. CALL CENTRE / APPOINTMENTS */}
                {activeView === 'appointments' && (
                    <AppointmentScheduler 
                        appointments={appointments} 
                        companies={companies} 
                        agents={agents} 
                        user={user} 
                    />
                )}
                
                {/* 11. QUOTE CALCULATOR */}
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
                
                {/* 12. QUOTES LIST */}
                {activeView === 'list' && (
                    <QuotesListPage 
                        quotes={quotes} 
                        onDeleteQuote={handleDeleteQuote} 
                        onEditQuote={handleEditQuote} 
                        onUpdateQuoteStatus={handleUpdateQuoteStatus}
                        opportunities={opportunities}
                    />
                )}

                {/* 13. TECHNICAL CALCULATORS */}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                
                {activeView === 'heatPumpCalc' && (
                    <div className="max-w-5xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">← Back</Button>
                        <HeatPumpCalculator />
                    </div>
                )}
                
                {activeView === 'warmRoomCalc' && <WarmRoomCalc setActiveView={setActiveView} user={user} />}
                
                {/* 14. ADMIN SETTINGS */}
                {activeView === 'admin' && <AdminPage user={user} />}
                
                {/* 15. ACCOUNTS HUB (FINANCE) */}
                {activeView === 'accounts' && (
                    <div className="space-y-6 pb-20">
                        {/* Finance Sub-Navigation */}
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
                                <Button onClick={() => setSubView('bankRecon')} variant={subView === 'bankRecon' ? 'primary' : 'secondary'} className="border-purple-200 text-purple-700">
                                    <Landmark size={14} className="mr-1" /> Bank Recon
                                </Button>
                            </div>
                        </div>

                        {/* Finance Views */}
                        {subView === 'ledger' && (
                            <FinancialEntryLogger 
                                companies={companies} 
                                quotes={quotes} 
                                opportunities={opportunities}
                            />
                        )}
                        
                        {subView === 'manpower' && <ManpowerLogger companies={companies} />}
                        
                        {subView === 'projectOps' && (
                            <ProjectOperations 
                                quotes={quotes} 
                                manpowerLogs={manpowerLogs} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}
                        
                        {subView === 'birBooks' && (
                            <BIRBookPrep 
                                quotes={quotes} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}
                        
                        {subView === 'bankRecon' && (
                            <BankReconciliation 
                                user={user} 
                                quotes={quotes} 
                                ledgerEntries={ledgerEntries} 
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
