import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
    CheckCircle, Clock, AlertTriangle, Plus, Edit, Trash2, Calendar,
    FileText, Building, Landmark, Users, Filter, X, ChevronDown, ChevronUp, Copy, Trash,
    Upload, FileJson, FileSpreadsheet, Search, XCircle // Added Search & XCircle here
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// --- TASK CATEGORIES WITH ICONS & COLORS ---
const TASK_CATEGORIES = {
    'REGULATION': { 
        label: 'Gov & Regulation (DOE/PELP)', 
        icon: Landmark, 
        color: 'text-red-700', 
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200' 
    },
    'STRATEGY': { 
        label: 'Strategy & Networking', 
        icon: Users, 
        color: 'text-purple-700', 
        bgColor: 'bg-purple-50', 
        borderColor: 'border-purple-200' 
    },
    'BIR': { 
        label: 'BIR Filing', 
        icon: FileText, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200' 
    },
    'DTI': { 
        label: 'DTI Compliance', 
        icon: Building, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50', 
        borderColor: 'border-blue-200' 
    },
    'BOI': { 
        label: 'BOI Reporting', 
        icon: Landmark, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50', 
        borderColor: 'border-orange-200' 
    },
    'SEC': { 
        label: 'SEC Compliance', 
        icon: Building, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50', 
        borderColor: 'border-purple-200' 
    },
    'SSS': { 
        label: 'SSS/PhilHealth/Pag-IBIG', 
        icon: Users, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        borderColor: 'border-green-200' 
    },
    'AUDIT': { 
        label: 'Audit & Review', 
        icon: FileText, 
        color: 'text-indigo-600', 
        bgColor: 'bg-indigo-50', 
        borderColor: 'border-indigo-200' 
    },
    'LEGAL': { 
        label: 'Legal & Contracts', 
        icon: FileText, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-50', 
        borderColor: 'border-gray-200' 
    },
    'OTHER': { 
        label: 'Other Business Tasks', 
        icon: Clock, 
        color: 'text-cyan-600', 
        bgColor: 'bg-cyan-50', 
        borderColor: 'border-cyan-200' 
    }
};

// --- RECURRING PATTERNS ---
const RECURRING_PATTERNS = [
    { value: 'none', label: 'One-time Task' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
];

// --- STRATEGY IMPORT MODAL ---
const StrategyImportModal = ({ onClose, user }) => {
    const [importMode, setImportMode] = useState('JSON');
    const [inputText, setInputText] = useState('');
    const [previewTasks, setPreviewTasks] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!inputText) {
            setPreviewTasks([]);
            return;
        }
        try {
            if (importMode === 'JSON') {
                const parsed = JSON.parse(inputText);
                if (Array.isArray(parsed)) {
                    setPreviewTasks(parsed);
                }
            } else {
                const rows = inputText.split('\n').filter(r => r.trim());
                const tasks = rows.map(row => {
                    const [title, dueDate, category, description] = row.split(',').map(s => s.trim());
                    return { title, dueDate, category: category || 'OTHER', description: description || '' };
                });
                setPreviewTasks(tasks);
            }
        } catch (e) {
            console.error("Parse error", e);
        }
    }, [inputText, importMode]);

    const handleImport = async () => {
        setIsProcessing(true);
        const batch = writeBatch(db);
        
        previewTasks.forEach(task => {
            const docRef = doc(collection(db, "users", user.uid, "business_tasks"));
            const safeCategory = (task.category && TASK_CATEGORIES[task.category]) ? task.category : 'STRATEGY';

            batch.set(docRef, {
                title: task.title || 'Untitled Strategy Task',
                description: task.description || 'Imported via Strategy Tool',
                category: safeCategory,
                dueDate: task.dueDate || new Date().toISOString().split('T')[0],
                priority: task.priority || 'MEDIUM',
                recurring: 'none',
                status: 'PENDING',
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        setIsProcessing(false);
        onClose();
        alert(`✅ Successfully imported ${previewTasks.length} strategic tasks!`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b bg-purple-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-purple-900 uppercase flex items-center gap-2">
                            <Upload size={24} /> Strategy & Compliance Import
                        </h2>
                        <p className="text-sm text-purple-700 mt-1">Paste AI suggestions or CSV data.</p>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-purple-400" /></button>
                </div>
                <div className="p-4 bg-gray-50 flex gap-2 border-b">
                    <button onClick={() => setImportMode('JSON')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${importMode === 'JSON' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}>
                        <FileJson size={16} /> Paste AI JSON
                    </button>
                    <button onClick={() => setImportMode('CSV')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${importMode === 'CSV' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border'}`}>
                        <FileSpreadsheet size={16} /> Paste CSV
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col h-full">
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2">{importMode === 'JSON' ? 'Paste JSON' : 'Paste CSV'}</label>
                        <textarea className="flex-1 w-full p-4 border rounded-xl font-mono text-xs bg-slate-900 text-green-400" placeholder={importMode === 'JSON' ? '[ { "title": "Check PELP", ... } ]' : 'Title, Date, Category'} value={inputText} onChange={(e) => setInputText(e.target.value)} />
                    </div>
                    <div className="bg-gray-100 rounded-xl p-4 overflow-y-auto h-64 md:h-auto border">
                        <h3 className="font-bold text-gray-700 mb-3 flex justify-between"><span>Preview ({previewTasks.length})</span></h3>
                        <div className="space-y-2">
                            {previewTasks.map((t, i) => (
                                <div key={i} className="bg-white p-2 rounded border shadow-sm text-xs">
                                    <div className="font-bold text-gray-800">{t.title}</div>
                                    <div className="flex gap-2 text-gray-500 mt-1"><span className="bg-gray-100 px-1 rounded">{t.dueDate}</span><span className="bg-purple-100 text-purple-700 px-1 rounded">{t.category}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleImport} variant="primary" className="bg-purple-600 hover:bg-purple-700" disabled={previewTasks.length === 0 || isProcessing}>{isProcessing ? 'Importing...' : `Import ${previewTasks.length} Tasks`}</Button>
                </div>
            </Card>
        </div>
    );
};

// --- DUPLICATE DETECTOR MODAL ---
const DuplicateDetectorModal = ({ tasks, onClose, onDeleteDuplicates, user }) => {
    const [selectedDuplicates, setSelectedDuplicates] = useState([]);
    const duplicateGroups = useMemo(() => {
        const groups = {};
        tasks.forEach(task => {
            const key = `${task.title.toLowerCase().trim()}_${task.dueDate}_${task.category}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return Object.entries(groups).filter(([_, g]) => g.length > 1).map(([key, g]) => ({ key, tasks: g }));
    }, [tasks]);

    const handleDeleteSelected = async () => {
        const batch = writeBatch(db);
        duplicateGroups.filter(g => selectedDuplicates.includes(g.key)).forEach(group => {
            group.tasks.slice(1).forEach(task => batch.delete(doc(db, "users", user.uid, "business_tasks", task.id)));
        });
        await batch.commit();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-orange-50">
                    <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-2"><Copy size={24} className="text-orange-600" /> Duplicate Detector</h2>
                    <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {duplicateGroups.length === 0 ? <div className="text-center py-12"><CheckCircle className="mx-auto text-green-500 mb-4" size={64} /><h3 className="text-xl font-bold text-gray-700">No Duplicates Found!</h3></div> : (
                        <div className="space-y-4">
                            {duplicateGroups.map(group => (
                                <Card key={group.key} className="border-l-4 border-orange-500 p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={selectedDuplicates.includes(group.key)} onChange={(e) => e.target.checked ? setSelectedDuplicates([...selectedDuplicates, group.key]) : setSelectedDuplicates(selectedDuplicates.filter(k => k !== group.key))} className="mt-1" />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 mb-2">{group.tasks[0].title} ({group.tasks.length} copies)</h4>
                                            <div className="space-y-2 ml-4">
                                                {group.tasks.map((task, idx) => (
                                                    <div key={task.id} className={`text-sm p-2 rounded border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                        <div className="flex justify-between"><span className="font-bold">{idx === 0 ? '✓ KEEP' : '✗ DELETE'}</span><span>{task.createdAt?.toDate ? task.createdAt.toDate().toLocaleDateString() : ''}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </label>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
                {duplicateGroups.length > 0 && <div className="p-6 border-t bg-gray-50 flex gap-3"><Button onClick={handleDeleteSelected} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete Selected</Button><Button onClick={onClose} variant="secondary">Close</Button></div>}
            </Card>
        </div>
    );
};

// --- TASK STATUS BADGE ---
const StatusBadge = ({ status, dueDate }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (status === 'COMPLETED') return <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">✓ Completed</span>;
    if (daysUntilDue < 0) return <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-700 animate-pulse">⚠ Overdue</span>;
    if (daysUntilDue <= 7) return <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-orange-100 text-orange-700">⏰ Due Soon</span>;
    return <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700">📅 Upcoming</span>;
};

// --- TASK MODAL ---
const TaskModal = ({ task, onClose, onSave, user }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [category, setCategory] = useState(task?.category || 'OTHER');
    const [dueDate, setDueDate] = useState(task?.dueDate || '');
    const [priority, setPriority] = useState(task?.priority || 'MEDIUM');
    const [recurring, setRecurring] = useState(task?.recurring || 'none');
    const [status, setStatus] = useState(task?.status || 'PENDING');

    const handleSave = async () => {
        if (!title || !dueDate) return alert('Title and date required');
        const taskData = { title, description, category, dueDate, priority, recurring, status, updatedAt: serverTimestamp() };
        if (task) await updateDoc(doc(db, "users", user.uid, "business_tasks", task.id), taskData);
        else await addDoc(collection(db, "users", user.uid, "business_tasks"), { ...taskData, createdAt: serverTimestamp() });
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-black text-gray-800 uppercase">{task ? 'Edit Task' : 'New Business Task'}</h2><button onClick={onClose}><X size={24} className="text-gray-400" /></button></div>
                    <Input placeholder="Task Title *" value={title} onChange={e => setTitle(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm">{Object.entries(TASK_CATEGORIES).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}</select>
                        <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold" />
                        <select value={recurring} onChange={e => setRecurring(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm">{RECURRING_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                    </div>
                    {task && <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select>}
                    <Textarea placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                    <div className="flex gap-2 pt-4 border-t"><Button onClick={handleSave} variant="primary" className="flex-1">{task ? 'Update' : 'Create'}</Button><Button onClick={onClose} variant="secondary">Cancel</Button></div>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN COMPONENT ---
const BusinessTasksCalendar = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    
    // --- STATE MANAGEMENT ---
    const [showModal, setShowModal] = useState(false);
    const [showDuplicateDetector, setShowDuplicateDetector] = useState(false);
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    
    // --- ENHANCED FILTER STATE ---
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ACTIVE');
    const [searchQuery, setSearchQuery] = useState(''); // NEW: Search State
    const [expandedCategory, setExpandedCategory] = useState(null);

    // Load tasks from Firebase
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, "users", user.uid, "business_tasks"), orderBy("dueDate", "asc")), 
            (snap) => setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            (error) => { console.warn("Collection not initialized", error); setTasks([]); }
        );
        return () => unsubscribe();
    }, [user]);

    // --- ENHANCED FILTER LOGIC ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // 1. Category Filter
            if (filterCategory !== 'ALL' && task.category !== filterCategory) return false;
            
            // 2. Status Filter
            if (filterStatus === 'ACTIVE' && task.status === 'COMPLETED') return false;
            if (filterStatus === 'COMPLETED' && task.status !== 'COMPLETED') return false;

            // 3. Search Filter (Title or Description)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const titleMatch = task.title?.toLowerCase().includes(query);
                const descMatch = task.description?.toLowerCase().includes(query);
                if (!titleMatch && !descMatch) return false;
            }
            return true;
        });
    }, [tasks, filterCategory, filterStatus, searchQuery]);

    // Group tasks by category
    const tasksByCategory = useMemo(() => {
        const grouped = {};
        filteredTasks.forEach(task => {
            const safeCategory = TASK_CATEGORIES[task.category] ? task.category : 'OTHER';
            if (!grouped[safeCategory]) grouped[safeCategory] = [];
            grouped[safeCategory].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    // Quick stats
    const stats = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = tasks.filter(t => t.status !== 'COMPLETED' && new Date(t.dueDate) < today).length;
        const dueSoon = tasks.filter(t => {
            if (t.status === 'COMPLETED') return false;
            const due = new Date(t.dueDate);
            const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7;
        }).length;
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const pending = tasks.filter(t => t.status !== 'COMPLETED').length;
        return { overdue, dueSoon, completed, pending };
    }, [tasks]);

    const handleDelete = async (taskId) => {
        if (window.confirm('Delete this task?')) await deleteDoc(doc(db, "users", user.uid, "business_tasks", taskId));
    };

    const handleToggleComplete = async (task) => {
        const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        await updateDoc(doc(db, "users", user.uid, "business_tasks", task.id), {
            status: newStatus,
            completedAt: newStatus === 'COMPLETED' ? serverTimestamp() : null
        });
        if (newStatus === 'COMPLETED' && task.recurring !== 'none') {
            const date = new Date(task.dueDate);
            if(task.recurring === 'monthly') date.setMonth(date.getMonth() + 1);
            else if(task.recurring === 'quarterly') date.setMonth(date.getMonth() + 3);
            else if(task.recurring === 'annually') date.setFullYear(date.getFullYear() + 1);
            
            await addDoc(collection(db, "users", user.uid, "business_tasks"), {
                ...task, dueDate: date.toISOString().split('T')[0], status: 'PENDING', createdAt: serverTimestamp(), completedAt: null
            });
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">Business Tasks & Compliance Calendar</h2>
                    <p className="text-sm text-gray-500 mt-1">Track BIR, DTI, BOI, SEC, and Strategy deadlines</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowStrategyModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white"><Upload size={16} className="mr-1" /> Import Strategy / AI</Button>
                    <Button onClick={() => setShowDuplicateDetector(true)} variant="secondary" className="border-orange-200 text-orange-700 bg-orange-50"><Copy size={16} className="mr-1" /> Find Duplicates</Button>
                    <Button onClick={() => { setEditingTask(null); setShowModal(true); }} variant="primary" className="bg-orange-600 hover:bg-orange-700"><Plus size={16} className="mr-1" /> New Task</Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-red-500"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><p className="text-2xl font-black text-gray-800">{stats.overdue}</p><p className="text-xs text-gray-500 uppercase font-bold">Overdue</p></div></div></Card>
                <Card className="p-4 border-l-4 border-orange-500"><div className="flex items-center gap-3"><Clock className="text-orange-500" size={24} /><div><p className="text-2xl font-black text-gray-800">{stats.dueSoon}</p><p className="text-xs text-gray-500 uppercase font-bold">Due This Week</p></div></div></Card>
                <Card className="p-4 border-l-4 border-blue-500"><div className="flex items-center gap-3"><Calendar className="text-blue-500" size={24} /><div><p className="text-2xl font-black text-gray-800">{stats.pending}</p><p className="text-xs text-gray-500 uppercase font-bold">Pending Tasks</p></div></div></Card>
                <Card className="p-4 border-l-4 border-green-500"><div className="flex items-center gap-3"><CheckCircle className="text-green-500" size={24} /><div><p className="text-2xl font-black text-gray-800">{stats.completed}</p><p className="text-xs text-gray-500 uppercase font-bold">Completed</p></div></div></Card>
            </div>

            {/* --- UPGRADED FILTER BAR --- */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-colors" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={14} /></button>}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        {['ALL', 'ACTIVE', 'COMPLETED'].map((status) => (
                            <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === status ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter + Count */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer">
                                <option value="ALL">All Categories</option>
                                {Object.entries(TASK_CATEGORIES).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-2 rounded-lg">{filteredTasks.length} Result{filteredTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </Card>

            {/* Tasks Grouped by Category */}
            <div className="space-y-4">
                {Object.entries(tasksByCategory).map(([categoryKey, categoryTasks]) => {
                    const catInfo = TASK_CATEGORIES[categoryKey] || TASK_CATEGORIES['OTHER'];
                    const CategoryIcon = catInfo.icon;
                    const isExpanded = expandedCategory === categoryKey;

                    return (
                        <Card key={categoryKey} className={`overflow-hidden ${catInfo.borderColor} border-l-4`}>
                            <div className={`p-4 ${catInfo.bgColor} cursor-pointer hover:opacity-80 transition-opacity`} onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3"><CategoryIcon className={catInfo.color} size={20} /><div><h3 className="font-black text-gray-800 uppercase text-sm">{catInfo.label}</h3><p className="text-xs text-gray-500">{categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''}</p></div></div>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="divide-y divide-gray-100">
                                    {categoryTasks.map(task => (
                                        <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <button onClick={() => handleToggleComplete(task)} className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'}`}>
                                                    {task.status === 'COMPLETED' && <CheckCircle size={14} className="text-white" />}
                                                </button>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h4 className={`font-bold text-gray-800 ${task.status === 'COMPLETED' ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                                                            {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                                                            <div className="flex flex-wrap gap-2 mt-2 items-center">
                                                                <StatusBadge status={task.status} dueDate={task.dueDate} />
                                                                <span className="text-xs text-gray-500">📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                                                {task.priority === 'HIGH' || task.priority === 'CRITICAL' ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${task.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{task.priority}</span> : null}
                                                                {task.recurring !== 'none' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">🔄 {task.recurring}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { setEditingTask(task); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                                            <button onClick={() => handleDelete(task.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="flex justify-center mb-4">{searchQuery ? <Search size={64} className="text-gray-200"/> : <Calendar size={64} className="text-gray-200"/>}</div>
                    <h3 className="text-xl font-bold text-gray-600 mb-2">{searchQuery ? `No matches for "${searchQuery}"` : "No Tasks Found"}</h3>
                    <p className="text-gray-500 mb-4">{searchQuery ? "Try adjusting your search terms or filters" : filterStatus === 'COMPLETED' ? "No completed tasks yet" : "Start by creating your first business task"}</p>
                    <Button onClick={() => { setEditingTask(null); setShowModal(true); }} variant="primary"><Plus size={16} className="mr-1" /> Create First Task</Button>
                </Card>
            )}

            {showModal && <TaskModal task={editingTask} onClose={() => { setShowModal(false); setEditingTask(null); }} onSave={() => { setShowModal(false); setEditingTask(null); }} user={user} />}
            {showDuplicateDetector && <DuplicateDetectorModal tasks={tasks} onClose={() => setShowDuplicateDetector(false)} user={user} />}
            {showStrategyModal && <StrategyImportModal onClose={() => setShowStrategyModal(false)} user={user} />}
        </div>
    );
};

export default BusinessTasksCalendar;
