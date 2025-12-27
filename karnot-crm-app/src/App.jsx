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
// --- Core CRM ---
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
import TerritoryLeadGenerator from './pages/TerritoryLeadGenerator.jsx';
import BOIProjectLeads from './pages/BOIProjectLeads.jsx';
import PEZAZones from './pages/PEZAZones.jsx';

// --- Export Operations ---
import ASEANExportPage from './pages/ASEANExportPage.jsx';
import UKExportPage from './pages/UKExportPage.jsx';
import ExportCompaniesPage from './pages/ExportCompaniesPage.jsx';
import ExportContactsPage from './pages/ExportContactsPage.jsx';
import ESCOImportEnrichmentTool from './pages/ESCOImportEnrichmentTool.jsx';

// --- Service & Operations Modules ---
import InstallEstimator from './pages/InstallEstimator.jsx';
import ServiceInvoice from './pages/ServiceInvoice.jsx';
import ServiceContractsPage from './pages/ServiceContractsPage.jsx';
import MaintenanceCalendar from './pages/MaintenanceCalendar.jsx';
import TechnicianMobileView from './pages/TechnicianMobileView.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import BusinessTasksCalendar from './pages/BusinessTasksCalendar.jsx';

// --- Finance & Banking Modules ---
import BankReconciliation from './pages/BankReconciliation.jsx'; 
import ManagementAccounts from './pages/ManagementAccounts.jsx';
import PayrollManager from './pages/PayrollManager.jsx'; 

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
    Users, Settings, Calculator, Plus, Landmark, ChevronDown,
    MapPin, Wrench, Briefcase, FileText, Target, Package, 
    UserCheck, Calendar as CalendarIcon, CheckCircle, Globe, Upload
} from 'lucide-react'; 

// ==========================================
// 5. DROPDOWN MENU COMPONENT
// ==========================================
const DropdownMenu = ({ label, icon: Icon, items, activeView, setActiveView, variant = 'secondary' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = items.some(item => item.view === activeView);

    return (
        <div className="relative" onMouseLeave={() => setIsOpen(false)}>
            <Button 
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsOpen(true)}
                variant={isActive ? 'primary' : variant}
                className={`font-bold uppercase text-[10px] tracking-widest h-9 ${variant === 'orange' ? 'border-orange-200 text-orange-700 bg-orange-50' : ''}`}
            >
                <Icon className="mr-1.5" size={14} /> {label} <ChevronDown size={12} className="ml-1"/>
            </Button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-xl min-w-[200px] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setActiveView(item.view);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2 ${
                                activeView === item.view 
                                    ? 'bg-orange-50 text-orange-700 border-l-4 border-orange-500' 
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {item.icon && <item.icon size={14} />}
                            {item.label}
                            {item.badge && (
                                <span className="ml-auto bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// 6. MAIN NAVIGATION HEADER
// ==========================================
const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote, userRole }) => {
    // Sales & CRM Menu
    const salesMenu = [
        { view: 'funnel', label: 'Sales Funnel', icon: HardHat },
        { view: 'list', label: 'Quotes List', icon: List, badge: quoteCount },
        { view: 'companies', label: 'Companies', icon: Building },
        { view: 'contacts', label: 'Contacts', icon: Users },
        { view: 'suppliers', label: 'Suppliers', icon: Briefcase }
    ];

    // Field Operations Menu
    const fieldOpsMenu = [
        { view: 'territories', label: 'Territories', icon: MapPin },
        { view: 'agents', label: 'Agents', icon: Users },
        { view: 'appointments', label: 'Call Centre', icon: FileText },
        { view: 'leadGenerator', label: 'Lead Generator', icon: Target },
        { view: 'boiLeads', label: 'BOI Projects', icon: Building, badge: 'NEW' },
        { view: 'pezaZones', label: 'PEZA Zones', icon: HardHat, badge: 'NEW' }
    ];

    // Export Operations Menu
    const exportOpsMenu = [
        { view: 'aseanExport', label: 'ASEAN Markets', icon: Globe, badge: 'BOI' },
        { view: 'ukExport', label: 'UK Operations', icon: Globe },
        { view: 'exportCompanies', label: 'Companies', icon: Building },
        { view: 'exportContacts', label: 'Contacts', icon: Users },
        { view: 'escoImport', label: 'Import ESCOs', icon: Upload, badge: 'NEW' }
    ];

    // Operations Menu (Recurring Revenue)
    const operationsMenu = [
        { view: 'assets', label: 'Asset Registry', icon: Package, badge: 'NEW' },
        { view: 'serviceContracts', label: 'Service Contracts', icon: FileText },
        { view: 'maintenanceCalendar', label: 'Ops Calendar', icon: CalendarIcon },
        { view: 'businessTasks', label: 'Business Tasks', icon: CheckCircle, badge: 'NEW' },
        { view: 'technicianView', label: 'Technician App', icon: Wrench, badge: 'MOBILE' },
        { view: 'installEstimator', label: 'Install & QC', icon: Wrench },
        { view: 'serviceInvoice', label: 'Service Invoice', icon: FileText }
    ];

    // Calculators Menu
    const calculatorsMenu = [
        { view: 'calculatorsHub', label: 'Calculator Hub', icon: Calculator },
        { view: 'heatPumpCalc', label: 'Heat Pump ROI', icon: Calculator },
        { view: 'warmRoomCalc', label: 'Warm Room', icon: Calculator }
    ];

    return (
        <header className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-orange-500">
            <div className="container mx-auto px-4 py-3">
                
                {/* TOP ROW: BRANDING + PRIMARY ACTIONS */}
                <div className="flex justify-between items-center gap-4 mb-3">
                    {/* BRANDING */}
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveView('dashboard')}>
                        <img src={KARNOT_LOGO_BASE_64} alt="Karnot Logo" style={{height: '40px'}}/>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                                Karnot <span className="text-orange-600">CRM</span>
                            </h1>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                Pro Enterprise Edition
                            </p>
                        </div>
                    </div>

                    {/* PRIMARY ACTIONS */}
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={onNewQuote} 
                            variant="primary" 
                            className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 bg-orange-600 hover:bg-orange-700 h-9 px-6"
                        >
                            <Plus className="mr-1.5" size={14} /> New Quote
                        </Button>
                        
                        <Button 
                            onClick={() => setActiveView('admin')} 
                            variant={activeView === 'admin' ? 'primary' : 'secondary'} 
                            className="!p-2 h-9 w-9"
                        >
                            <Settings size={16} />
                        </Button>
                        
                        <Button 
                            onClick={onLogout} 
                            variant="secondary" 
                            className="!p-2 text-red-500 hover:bg-red-50 border-red-100 h-9 w-9"
                        >
                            <LogOut size={16} />
                        </Button>
                    </div>
                </div>

                {/* BOTTOM ROW: NAVIGATION MENU */}
                <nav className="flex flex-wrap gap-2 items-center border-t border-gray-100 pt-3">
                    
                    {/* Dashboard */}
                    <Button 
                        onClick={() => setActiveView('dashboard')} 
                        variant={activeView === 'dashboard' ? 'primary' : 'secondary'} 
                        className="font-bold uppercase text-[10px] tracking-widest h-9"
                    >
                        <BarChart2 className="mr-1.5" size={14} /> Dashboard
                    </Button>

                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    {/* MENUS */}
                    <DropdownMenu label="Sales & CRM" icon={Building} items={salesMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu label="Field Ops" icon={MapPin} items={fieldOpsMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu 
                        label="Export Ops" 
                        icon={Globe} 
                        items={exportOpsMenu} 
                        activeView={activeView} 
                        setActiveView={setActiveView}
                        variant="orange"
                    />
                    <DropdownMenu label="Operations" icon={Wrench} items={operationsMenu} activeView={activeView} setActiveView={setActiveView} />
                    <DropdownMenu label="Calculators" icon={Calculator} items={calculatorsMenu} activeView={activeView} setActiveView={setActiveView} />

                    {/* Accounts (Admin Only) */}
                    {userRole === 'ADMIN' && (
                        <>
                            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                            <Button 
                                onClick={() => setActiveView('accounts')} 
                                variant={activeView === 'accounts' ? 'primary' : 'secondary'}
                                className="font-bold uppercase text-[10px] tracking-widest border-orange-200 text-orange-700 bg-orange-50 h-9"
                            >
                                <Landmark className="mr-1.5" size={14} /> Accounts
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

// ==========================================
// 7. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
    // --- Application State ---
    const [user, setUser] = useState(null); 
    const [userRole, setUserRole] = useState(null); 
    const [activeView, setActiveView] = useState('dashboard');
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
    const [serviceInvoices, setServiceInvoices] = useState([]);
    const [serviceContracts, setServiceContracts] = useState([]);
    
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
    // REAL-TIME DATA STREAM (ROBUST + SORTED)
    // ------------------------------------------
    useEffect(() => {
        if (user) {
            setLoadingData(true); 
            console.log("🚀 Starting Data Synchronization...");
            
            // Safety Timer: Stops spinning after 4s even if DB hangs
            const safetyTimer = setTimeout(() => {
                console.log("⚠️ Safety Timer Triggered: Forcing App Load");
                setLoadingData(false);
            }, 4000);

            // 1. QUOTES (Desc)
            const unsubQuotes = onSnapshot(
                query(collection(db, "users", user.uid, "quotes"), orderBy("lastModified", "desc")), 
                (snap) => setQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Quotes Error:", err)
            );
            
            // 2. OPPORTUNITIES (Desc)
            const unsubOpps = onSnapshot(
                query(collection(db, "users", user.uid, "opportunities"), orderBy("createdAt", "desc")), 
                (snap) => setOpportunities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Opps Error:", err)
            );
            
            // 3. COMPANIES (Ascending A-Z)
            const unsubCompanies = onSnapshot(
                query(collection(db, "users", user.uid, "companies"), orderBy("companyName", "asc")), 
                (snap) => setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Companies Error:", err)
            );
            
            // 4. CONTACTS (Ascending A-Z)
            const unsubContacts = onSnapshot(
                query(collection(db, "users", user.uid, "contacts"), orderBy("lastName", "asc")), 
                (snap) => setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Contacts Error:", err)
            );
            
            // 5. LEDGER (Desc)
            const unsubLedger = onSnapshot(
                query(collection(db, "users", user.uid, "ledger"), orderBy("date", "desc")), 
                (snap) => setLedgerEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Ledger Error:", err)
            );
            
            // 6. MANPOWER (Desc)
            const unsubManpower = onSnapshot(
                query(collection(db, "users", user.uid, "manpower_logs"), orderBy("date", "desc")), 
                (snap) => setManpowerLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Manpower Error:", err)
            );
            
            // 7. SERVICE INVOICES (Desc)
            const unsubServices = onSnapshot(
                query(collection(db, "users", user.uid, "service_invoices"), orderBy("createdAt", "desc")), 
                (snap) => setServiceInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => {
                    console.warn("Service Invoices Error:", err.code);
                    setServiceInvoices([]);
                }
            );

            // 8. SERVICE CONTRACTS (Desc)
            const unsubContracts = onSnapshot(
                query(collection(db, "users", user.uid, "service_contracts"), orderBy("createdAt", "desc")),
                (snap) => setServiceContracts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => {
                    console.warn("Contracts Error:", err.code);
                    setServiceContracts([]);
                }
            );
            
            // 9. TERRITORIES (Ascending A-Z)
            const unsubTerritories = onSnapshot(
                query(collection(db, "users", user.uid, "territories"), orderBy("name", "asc")), 
                (snap) => setTerritories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Territories Error:", err)
            );
            
            // 10. AGENTS (Ascending A-Z)
            const unsubAgents = onSnapshot(
                query(collection(db, "users", user.uid, "agents"), orderBy("name", "asc")), 
                (snap) => setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
                (err) => console.warn("Agents Error:", err)
            );
            
            // 11. APPOINTMENTS (Ascending Date) - STOPS LOADING
            const unsubAppointments = onSnapshot(
                query(collection(db, "users", user.uid, "appointments"), orderBy("appointmentDate", "asc")), 
                (snap) => {
                    setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoadingData(false); 
                    clearTimeout(safetyTimer);
                },
                (err) => {
                    console.warn("Appointments Error:", err);
                    setAppointments([]);
                    setLoadingData(false);
                    clearTimeout(safetyTimer);
                }
            );
            
            return () => { 
                clearTimeout(safetyTimer);
                unsubQuotes(); unsubOpps(); unsubCompanies(); unsubContacts(); 
                unsubLedger(); unsubManpower(); unsubServices(); unsubContracts();
                unsubTerritories(); unsubAgents(); unsubAppointments();
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
                <p className="text-[10px] text-gray-400 mt-2">Syncing Databases...</p>
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
                
                {/* 1. DASHBOARD */}
                {activeView === 'dashboard' && (
                    <DashboardPage 
                        quotes={quotes} 
                        user={user}
                        ledgerEntries={ledgerEntries}
                        serviceInvoices={serviceInvoices}
                        appointments={appointments}
                        agents={agents}
                        serviceContracts={serviceContracts}
                        companies={companies}
                    />
                )}
                
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

                {/* 4. OPERATIONS MODULES */}
                {activeView === 'installEstimator' && (
                    <InstallEstimator quotes={quotes} user={user} />
                )}
                
                {activeView === 'serviceInvoice' && (
                    <ServiceInvoice companies={companies} user={user} />
                )}
                
                {activeView === 'assets' && (
                    <AssetsPage companies={companies} user={user} />
                )}
                
                {activeView === 'serviceContracts' && (
                    <ServiceContractsPage companies={companies} user={user} />
                )}
                
                {activeView === 'maintenanceCalendar' && (
                    <MaintenanceCalendar companies={companies} user={user} />
                )}
                
                {activeView === 'technicianView' && (
                    <TechnicianMobileView companies={companies} user={user} />
                )}

                {/* BUSINESS TASKS CALENDAR */}
                {activeView === 'businessTasks' && (
                    <BusinessTasksCalendar user={user} />
                )}
                
                {/* 5. DATA MANAGEMENT - PHILIPPINES */}
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
                    <ContactsPage contacts={contacts} companies={companies} user={user} />
                )}
                
                {activeView === 'suppliers' && <SupplierManager user={user} />}
                
                {/* 6. FIELD & TERRITORY */}
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
                    <AgentManagement agents={agents} territories={territories} user={user} quotes={quotes} />
                )}
                
                {activeView === 'appointments' && (
                    <AppointmentScheduler appointments={appointments} companies={companies} agents={agents} user={user} />
                )}
                
                {activeView === 'leadGenerator' && <TerritoryLeadGenerator territories={territories} user={user} />}
                
                {activeView === 'boiLeads' && <BOIProjectLeads territories={territories} user={user} />}
                
                {activeView === 'pezaZones' && <PEZAZones territories={territories} user={user} />}

                {/* 6B. EXPORT OPERATIONS */}
                {activeView === 'aseanExport' && (
                    <ASEANExportPage user={user} />
                )}

                {activeView === 'ukExport' && (
                    <UKExportPage user={user} />
                )}

                {activeView === 'exportCompanies' && (
                    <ExportCompaniesPage 
                        companies={companies}
                        contacts={contacts}
                        quotes={quotes}
                        user={user}
                        onOpenQuote={handleEditQuote}
                        appointments={appointments}
                    />
                )}

                {activeView === 'exportContacts' && (
                    <ExportContactsPage 
                        contacts={contacts}
                        companies={companies}
                        user={user}
                    />
                )}

                {activeView === 'escoImport' && (
                    <ESCOImportEnrichmentTool user={user} />
                )}
                
                {/* 7. QUOTING */}
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

                {/* 8. CALCULATORS */}
                {activeView === 'calculatorsHub' && <CalculatorsPage setActiveView={setActiveView} />}
                
                {activeView === 'heatPumpCalc' && (
                    <div className="max-w-5xl mx-auto">
                        <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="mb-4">← Back</Button>
                        <HeatPumpCalculator />
                    </div>
                )}
                
                {activeView === 'warmRoomCalc' && <WarmRoomCalc setActiveView={setActiveView} user={user} />}
                
                {activeView === 'admin' && <AdminPage user={user} />}
                
                {/* ======================= */}
                {/* 9. ACCOUNTS HUB (ADMIN) */}
                {/* ======================= */}
                {activeView === 'accounts' && (
                    <div className="space-y-6 pb-20">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase leading-none mb-1">Accounts Hub</h1>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">FYE: Dec 31 | BOI-SIPP Registered Enterprise</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setSubView('ledger')} variant={subView === 'ledger' ? 'primary' : 'secondary'}>
                                    <Landmark size={14} className="mr-1" /> Disbursements
                                </Button>
                                <Button onClick={() => setSubView('payroll')} variant={subView === 'payroll' ? 'primary' : 'secondary'} className="border-purple-200 text-purple-700 bg-purple-50">
                                    <UserCheck size={14} className="mr-1" /> Payroll & Tax
                                </Button>
                                <Button onClick={() => setSubView('manpower')} variant={subView === 'manpower' ? 'primary' : 'secondary'}>
                                    <Wrench size={14} className="mr-1" /> Manpower (Project)
                                </Button>
                                <Button onClick={() => setSubView('services')} variant={subView === 'services' ? 'primary' : 'secondary'} className="border-orange-200 text-orange-700 bg-orange-50">
                                    <Wrench size={14} className="mr-1" /> Service Invoices
                                </Button>
                                <Button onClick={() => setSubView('projectOps')} variant={subView === 'projectOps' ? 'primary' : 'secondary'}>
                                    <Briefcase size={14} className="mr-1" /> Project ROI
                                </Button>
                                <Button onClick={() => setSubView('birBooks')} variant={subView === 'birBooks' ? 'primary' : 'secondary'} className="border-orange-500 text-orange-700">
                                    <FileText size={14} className="mr-1" /> BIR Books
                                </Button>
                                <Button onClick={() => setSubView('bankRecon')} variant={subView === 'bankRecon' ? 'primary' : 'secondary'} className="border-purple-200 text-purple-700">
                                    <Landmark size={14} className="mr-1" /> Bank Recon
                                </Button>
                                <Button onClick={() => setSubView('management')} variant={subView === 'management' ? 'primary' : 'secondary'} className="border-indigo-200 text-indigo-700 bg-indigo-50">
                                    <BarChart2 size={14} className="mr-1" /> Mgmt. Accounts
                                </Button>
                            </div>
                        </div>

                        {subView === 'ledger' && (
                            <FinancialEntryLogger 
                                companies={companies} 
                                quotes={quotes} 
                                opportunities={opportunities}
                            />
                        )}
                        
                        {subView === 'payroll' && (
                            <PayrollManager user={user} />
                        )}
                        
                        {subView === 'manpower' && (
                            <ManpowerLogger quotes={quotes} />
                        )}
                        
                        {subView === 'services' && (
                            <ServiceInvoice companies={companies} user={user} />
                        )}
                        
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

                        {subView === 'management' && (
                            <ManagementAccounts 
                                user={user}
                                quotes={quotes}
                                ledgerEntries={ledgerEntries}
                                opportunities={opportunities}
                                serviceInvoices={serviceInvoices}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
