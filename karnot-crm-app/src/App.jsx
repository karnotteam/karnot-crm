const Header = ({ activeView, setActiveView, quoteCount, onLogout, onNewQuote }) => ( 
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
                
                {/* --- CALCULATORS HUB BUTTON --- */}
                <Button onClick={() => setActiveView('calculatorsHub')} variant={['calculatorsHub', 'heatPumpCalc'].includes(activeView) ? 'primary' : 'secondary'} className="font-bold uppercase text-[10px] tracking-widest">
                    <Calculator className="mr-1" size={14} /> Calculators
                </Button>

                <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                {/* --- NEW QUOTE BUTTON (Goes to Quote Calculator) --- */}
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
