import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calculator, LayoutGrid, BarChart3, Settings, 
  LogOut, Briefcase, Truck, FileText, Landmark, Globe,
  Activity, PenTool, UserCircle, Plus, List, HardHat, Clock, BookOpen
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
    collection, onSnapshot, query, orderBy, addDoc, 
    serverTimestamp, doc, getDoc, updateDoc, deleteDoc, setDoc 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';

// --- Page & Component Imports (Preserving your existing tools) ---
import LoginPage from './pages/LoginPage.jsx';
import CompaniesPage from './components/CompaniesPage';
import ContactsPage from './components/ContactsPage';
import QuoteCalculator from './components/QuoteCalculator';
import QuoteList from './components/QuoteList'; // Your QuotesListPage.jsx
import FunnelPage from './components/FunnelPage';
import SupplierManager from './components/SupplierManager';
import PurchaseOrderManager from './components/PurchaseOrderManager';
import ProjectOperations from './components/ProjectOperations';
import CommissioningPage from './components/CommissioningPage';
import ProjectROI from './components/ProjectROI'; // Your ProjectOperations.jsx
import FinancialEntryLogger from './components/FinancialEntryLogger';
import BIRBookPrep from './components/BIRBookPrep';
import AdminPage from './components/AdminPage';

// --- Engineering Calculators (Preserved from your existing file) ---
import HeatPumpCalculator from './components/HeatPumpCalculator.jsx';
import WarmRoomCalc from './components/WarmRoomCalc.jsx';

const App = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('FUNNEL'); // Defaulting to Funnel per your style

  // --- Global Data State ---
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // --- AUTH OBSERVER (Restored from your file) ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            setUserRole(userSnap.data().role);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // --- REAL-TIME DATA SYNC (Sub-collection logic preserved) ---
  useEffect(() => {
    if (!user) return;

    const unsubC = onSnapshot(query(collection(db, "users", user.uid, "companies"), orderBy("createdAt", "desc")), (s) => setCompanies(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCon = onSnapshot(query(collection(db, "users", user.uid, "contacts"), orderBy("lastName", "asc")), (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubQ = onSnapshot(query(collection(db, "users", user.uid, "quotes"), orderBy("createdAt", "desc")), (s) => setQuotes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubO = onSnapshot(query(collection(db, "users", user.uid, "opportunities"), orderBy("createdAt", "desc")), (s) => setOpportunities(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubL = onSnapshot(query(collection(db, "users", user.uid, "ledger"), orderBy("date", "desc")), (s) => setLedgerEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(query(collection(db, "users", user.uid, "suppliers"), orderBy("name", "asc")), (s) => setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(query(collection(db, "users", user.uid, "purchaseOrders"), orderBy("createdAt", "desc")), (s) => setPurchaseOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubC(); unsubCon(); unsubQ(); unsubO(); unsubL(); unsubS(); unsubP(); };
  }, [user]);

  // --- Quote Logic (Preserved nextQuoteNumber logic) ---
  const nextQuoteNumber = useMemo(() => {
      if (quotes.length === 0) return 2501;
      const lastQuoteNum = quotes.map(q => parseInt(q.id.split('-')[0].replace('QN', ''), 10)).filter(n => !isNaN(n)).reduce((m, n) => Math.max(m, n), 0);
      return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
  }, [quotes]);

  const handleSaveQuote = async (quoteData) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "quotes", quoteData.id), { ...quoteData, lastModified: serverTimestamp() }, { merge: true });
    setActiveTab('QUOTES');
  };

  const logout = () => signOut(auth);

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-orange-500 animate-pulse bg-slate-900">Initializing Karnot CRM...</div>;
  if (!user) return <LoginPage onLogin={(email, pass) => signInWithEmailAndPassword(auth, email, pass)} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col p-6 shadow-2xl z-20">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-orange-500">KARNOT <span className="text-white">CRM</span></h1>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">SEC Registered Export Ent.</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          <p className="text-[9px] font-black text-slate-600 uppercase mb-2 ml-2">Sales</p>
          <NavItem icon={Users} label="Directory" active={activeTab === 'COMPANIES'} onClick={() => setActiveTab('COMPANIES')} />
          <NavItem icon={UserCircle} label="Contacts" active={activeTab === 'CONTACTS'} onClick={() => setActiveTab('CONTACTS')} />
          <NavItem icon={Calculator} label="Quote Calc" active={activeTab === 'CALC'} onClick={() => setActiveTab('CALC')} />
          <NavItem icon={FileText} label="Proposals" active={activeTab === 'QUOTES'} onClick={() => setActiveTab('QUOTES')} />
          <NavItem icon={LayoutGrid} label="Funnel" active={activeTab === 'FUNNEL'} onClick={() => setActiveTab('FUNNEL')} />
          
          <p className="text-[9px] font-black text-slate-600 uppercase mt-6 mb-2 ml-2">Engineering</p>
          <NavItem icon={HardHat} label="HP Calculator" active={activeTab === 'HPCALC'} onClick={() => setActiveTab('HPCALC')} />
          <NavItem icon={PenTool} label="Install & QC" active={activeTab === 'INSTALL'} onClick={() => setActiveTab('INSTALL')} />
          <NavItem icon={Activity} label="Live Ops" active={activeTab === 'OPS'} onClick={() => setActiveTab('OPS')} />

          <p className="text-[9px] font-black text-slate-600 uppercase mt-6 mb-2 ml-2">Finance</p>
          {userRole === 'ADMIN' && <NavItem icon={Landmark} label="BIR Book Prep" active={activeTab === 'BIR'} onClick={() => setActiveTab('BIR')} />}
          <NavItem icon={Globe} label="Ledger" active={activeTab === 'LEDGER'} onClick={() => setActiveTab('LEDGER')} />
          <NavItem icon={BarChart3} label="Project ROI" active={activeTab === 'ROI'} onClick={() => setActiveTab('ROI')} />
          
          <p className="text-[9px] font-black text-slate-600 uppercase mt-6 mb-2 ml-2">Supply Chain</p>
          <NavItem icon={Truck} label="Suppliers" active={activeTab === 'SUPPLIERS'} onClick={() => setActiveTab('SUPPLIERS')} />
        </nav>

        <button onClick={logout} className="mt-6 flex items-center gap-3 p-4 text-slate-400 hover:text-red-400 font-black text-xs uppercase tracking-widest">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* --- CONTENT --- */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'COMPANIES' && <CompaniesPage companies={companies} user={user} quotes={quotes} contacts={contacts} />}
          {activeTab === 'CONTACTS' && <ContactsPage contacts={contacts} companies={companies} user={user} />}
          {activeTab === 'CALC' && <QuoteCalculator onSaveQuote={handleSaveQuote} nextQuoteNumber={nextQuoteNumber} companies={companies} contacts={contacts} opportunities={opportunities} />}
          {activeTab === 'QUOTES' && <QuoteList quotes={quotes} user={user} opportunities={opportunities} />}
          {activeTab === 'FUNNEL' && <FunnelPage opportunities={opportunities} companies={companies} quotes={quotes} user={user} />}
          {activeTab === 'HPCALC' && <HeatPumpCalculator />}
          {activeTab === 'INSTALL' && <CommissioningPage quotes={quotes} />}
          {activeTab === 'OPS' && <ProjectOperations quotes={quotes} />}
          {activeTab === 'SUPPLIERS' && <SupplierManager user={user} />}
          {activeTab === 'LEDGER' && <FinancialEntryLogger companies={companies} user={user} />}
          {activeTab === 'BIR' && <BIRBookPrep quotes={quotes} ledgerEntries={ledgerEntries} />}
          {activeTab === 'ROI' && <ProjectROI quotes={quotes} ledgerEntries={ledgerEntries} />}
          {activeTab === 'ADMIN' && <AdminPage user={user} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${active ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
    <Icon size={18} /> {label}
  </button>
);

export default App;
