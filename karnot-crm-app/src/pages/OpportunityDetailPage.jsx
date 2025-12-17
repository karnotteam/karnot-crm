const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, onUpdateProb, onUpdateNotes, quotes = [], contacts = [], companies = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Internal state for the Lead Summary to ensure it's editable instantly
    const [localNotes, setLocalNotes] = useState(opp.notes || '');

    const company = (companies || []).find(c => c.id === opp.companyId || c.companyName === opp.customerName);
    const interactions = company?.interactions || [];

    // RELAXED MATCHING: This ensures "Malay Resources Inc." matches even with small differences
    const relevantQuotes = useMemo(() => {
        const targetName = (opp?.customerName || "").toLowerCase().trim();
        return (quotes || []).filter(q => {
            const quoteName = (q.customer?.name || "").toLowerCase().trim();
            // Match if names are similar OR if there is a direct ID link
            return quoteName.includes(targetName) || targetName.includes(quoteName) || q.leadId === opp.id;
        });
    }, [quotes, opp]);

    const handleAddLog = () => {
        if (!logOutcome || !company) return alert("Log data missing.");
        onSaveInteraction(company.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    // Auto-save notes when you stop typing
    const handleNotesBlur = () => {
        onUpdateNotes(opp.id, localNotes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white p-0">
                <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">{opp.customerName}</h3>
                        <button onClick={onClose}><X /></button>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 font-bold text-gray-800">{opp.project}</div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deal Value</p>
                            <p className="text-xl font-black text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border relative">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Win Probability</p>
                            <div className="flex items-center gap-1">
                                <input 
                                    type="number" 
                                    value={opp.probability} 
                                    onChange={(e) => onUpdateProb(opp.id, e.target.value)}
                                    className="text-xl font-black text-orange-600 bg-transparent border-none w-16 focus:ring-0 p-0"
                                />
                                <span className="text-xl font-black text-orange-600">%</span>
                            </div>
                            <Target size={14} className="absolute top-3 right-3 text-gray-200" />
                        </div>
                    </div>

                    {/* FIXED SUMMARY BOX: Now uses local state and is fully editable */}
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lead Summary</label>
                        <textarea 
                            rows="8" 
                            value={localNotes} 
                            onChange={(e) => setLocalNotes(e.target.value)}
                            onBlur={handleNotesBlur}
                            className="w-full p-4 bg-white text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            placeholder="Type deal notes here... (Saves on click-away)"
                        />
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden font-sans">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Quotes ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="text-xs border rounded-xl p-1 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2 border rounded-xl" />
                                        <Button onClick={handleAddLog} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h5 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4">Associated Quotes</h5>
                                {relevantQuotes.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-white/50">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Quotes Linked</p>
                                    </div>
                                ) : (
                                    relevantQuotes.map(q => (
                                        <div 
                                            key={q.id} 
                                            onClick={() => {
                                                console.log("Opening Quote:", q.id);
                                                onOpenQuote(q);
                                            }} 
                                            className="flex justify-between items-center p-5 mb-3 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-orange-500 hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-gray-800 uppercase tracking-widest font-black text-xs group-hover:text-orange-600 transition-colors">{q.id}</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">View Full Proposal →</span>
                                            </div>
                                            <span className="text-orange-600 font-black text-lg">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end">
                        <Button onClick={onClose} variant="secondary" className="font-black uppercase text-[10px] tracking-widest">Close</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
