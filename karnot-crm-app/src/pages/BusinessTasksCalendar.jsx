import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
    CheckCircle, Clock, AlertTriangle, Plus, Edit, Trash2, Calendar,
    FileText, Building, Landmark, Users, Filter, X, ChevronDown, ChevronUp, Copy,
    Upload, FileJson, FileSpreadsheet, Search, SortAsc, SortDesc, List, Grid,
    CheckSquare, Square, MoreVertical, Download, Eye, EyeOff
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';

// --- TASK CATEGORIES WITH ICONS & COLORS ---
const TASK_CATEGORIES = {
    'FUNDRAISING': { 
        label: 'Fundraising & Investment', 
        icon: Landmark, 
        color: 'text-green-700', 
        bgColor: 'bg-green-50', 
        borderColor: 'border-green-200' 
    },
    'STRATEGY': { 
        label: 'Strategy & Networking', 
        icon: Users, 
        color: 'text-purple-700', 
        bgColor: 'bg-purple-50', 
        borderColor: 'border-purple-200' 
    },
    'REGULATION': { 
        label: 'Gov & Regulation (DOE/PELP)', 
        icon: Landmark, 
        color: 'text-red-700', 
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200' 
    },
    'LEGAL': { 
        label: 'Legal & Contracts', 
        icon: FileText, 
        color: 'text-gray-700', 
        bgColor: 'bg-gray-50', 
        borderColor: 'border-gray-200' 
    },
    'OPERATIONS': { 
        label: 'Operations & Systems', 
        icon: Building, 
        color: 'text-blue-700', 
        bgColor: 'bg-blue-50', 
        borderColor: 'border-blue-200' 
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
    'OTHER': { 
        label: 'Other Business Tasks', 
        icon: Clock, 
        color: 'text-cyan-600', 
        bgColor: 'bg-cyan-50', 
        borderColor: 'border-cyan-200' 
    }
};

const RECURRING_PATTERNS = [
    { value: 'none', label: 'One-time Task' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
];

const PRIORITY_LEVELS = [
    { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' }
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
                status: task.status || 'PENDING',
                owner: task.owner || '',
                notes: task.notes || '',
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
                        <p className="text-sm text-purple-700 mt-1">
                            Paste AI suggestions or CSV data to bulk-create tasks.
                        </p>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-purple-400" /></button>
                </div>

                <div className="p-4 bg-gray-50 flex gap-2 border-b">
                    <button 
                        onClick={() => setImportMode('JSON')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${importMode === 'JSON' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'}`}
                    >
                        <FileJson size={16} /> Paste AI JSON
                    </button>
                    <button 
                        onClick={() => setImportMode('CSV')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${importMode === 'CSV' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border'}`}
                    >
                        <FileSpreadsheet size={16} /> Paste CSV
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col h-full">
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2">
                            {importMode === 'JSON' ? 'Paste JSON Array' : 'Paste CSV (Title, Date, Category, Desc)'}
                        </label>
                        <textarea
                            className="flex-1 w-full p-4 border rounded-xl font-mono text-xs bg-slate-900 text-green-400"
                            placeholder={importMode === 'JSON' ? '[ { "title": "Check PELP", ... } ]' : 'Task Title, 2025-01-01, STRATEGY, Details...'}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>

                    <div className="bg-gray-100 rounded-xl p-4 overflow-y-auto h-64 md:h-auto border">
                        <h3 className="font-bold text-gray-700 mb-3 flex justify-between">
                            <span>Preview ({previewTasks.length} Tasks)</span>
                            {previewTasks.length > 0 && <span className="text-green-600 text-xs">Ready to import</span>}
                        </h3>
                        <div className="space-y-2">
                            {previewTasks.map((t, i) => (
                                <div key={i} className="bg-white p-2 rounded border shadow-sm text-xs">
                                    <div className="font-bold text-gray-800">{t.title}</div>
                                    <div className="flex gap-2 text-gray-500 mt-1">
                                        <span className="bg-gray-100 px-1 rounded">{t.dueDate}</span>
                                        <span className="bg-purple-100 text-purple-700 px-1 rounded">{t.category}</span>
                                    </div>
                                </div>
                            ))}
                            {previewTasks.length === 0 && (
                                <div className="text-gray-400 text-center mt-10 italic">
                                    Waiting for data...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button 
                        onClick={handleImport} 
                        variant="primary" 
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={previewTasks.length === 0 || isProcessing}
                    >
                        {isProcessing ? 'Importing...' : `Import ${previewTasks.length} Tasks`}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- DUPLICATE DETECTOR MODAL ---
const DuplicateDetectorModal = ({ tasks, onClose, user }) => {
    const [selectedDuplicates, setSelectedDuplicates] = useState([]);

    const duplicateGroups = useMemo(() => {
        const groups = {};
        
        tasks.forEach(task => {
            const key = `${task.title.toLowerCase().trim()}_${task.dueDate}_${task.category}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(task);
        });

        const duplicates = Object.entries(groups)
            .filter(([_, taskGroup]) => taskGroup.length > 1)
            .map(([key, taskGroup]) => ({
                key,
                tasks: taskGroup.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return dateA - dateB;
                })
            }));

        return duplicates;
    }, [tasks]);

    const handleToggleAll = () => {
        if (selectedDuplicates.length === duplicateGroups.length) {
            setSelectedDuplicates([]);
        } else {
            setSelectedDuplicates(duplicateGroups.map(g => g.key));
        }
    };

    const handleDeleteSelected = async () => {
        const selectedGroups = duplicateGroups.filter(g => selectedDuplicates.includes(g.key));
        const tasksToDelete = [];

        selectedGroups.forEach(group => {
            const duplicatesToDelete = group.tasks.slice(1);
            tasksToDelete.push(...duplicatesToDelete);
        });

        if (tasksToDelete.length === 0) {
            alert('No duplicates selected');
            return;
        }

        if (!window.confirm(`Delete ${tasksToDelete.length} duplicate task${tasksToDelete.length !== 1 ? 's' : ''}?`)) {
            return;
        }

        const batch = writeBatch(db);
        tasksToDelete.forEach(task => {
            const taskRef = doc(db, "users", user.uid, "business_tasks", task.id);
            batch.delete(taskRef);
        });

        await batch.commit();
        alert(`✅ Deleted ${tasksToDelete.length} duplicate task${tasksToDelete.length !== 1 ? 's' : ''}!`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-orange-50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <Copy size={24} className="text-orange-600" />
                            Duplicate Task Detector
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Found {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {duplicateGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No Duplicates Found!</h3>
                            <p className="text-gray-500">Your task list is clean.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedDuplicates.length === duplicateGroups.length}
                                        onChange={handleToggleAll}
                                        className="w-4 h-4"
                                    />
                                    <span className="font-bold text-sm">
                                        Select All ({duplicateGroups.length} groups)
                                    </span>
                                </label>
                                <span className="text-xs text-gray-500">
                                    Keeps oldest, deletes newer duplicates
                                </span>
                            </div>

                            {duplicateGroups.map(group => (
                                <Card key={group.key} className="border-l-4 border-orange-500">
                                    <div className="p-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedDuplicates.includes(group.key)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedDuplicates([...selectedDuplicates, group.key]);
                                                    } else {
                                                        setSelectedDuplicates(selectedDuplicates.filter(k => k !== group.key));
                                                    }
                                                }}
                                                className="w-4 h-4 mt-1"
                                            />
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-bold text-gray-800">{group.tasks[0].title}</h4>
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                                        {group.tasks.length} duplicates
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2 ml-4">
                                                    {group.tasks.map((task, idx) => (
                                                        <div 
                                                            key={task.id}
                                                            className={`text-sm p-2 rounded border ${
                                                                idx === 0 
                                                                    ? 'bg-green-50 border-green-200' 
                                                                    : 'bg-red-50 border-red-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className={`font-bold ${
                                                                    idx === 0 ? 'text-green-700' : 'text-red-700'
                                                                }`}>
                                                                    {idx === 0 ? '✓ KEEP' : '✗ DELETE'}
                                                                </span>
                                                                <div className="text-xs text-gray-600">
                                                                    <span className="mr-3">📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                                                    <span>
                                                                        Created: {task.createdAt?.toDate 
                                                                            ? task.createdAt.toDate().toLocaleDateString() 
                                                                            : 'Unknown'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {duplicateGroups.length > 0 && (
                    <div className="p-6 border-t bg-gray-50 flex gap-3">
                        <Button
                            onClick={handleDeleteSelected}
                            variant="primary"
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            disabled={selectedDuplicates.length === 0}
                        >
                            Delete {selectedDuplicates.reduce((sum, key) => {
                                const group = duplicateGroups.find(g => g.key === key);
                                return sum + (group ? group.tasks.length - 1 : 0);
                            }, 0)} Duplicate{selectedDuplicates.reduce((sum, key) => {
                                const group = duplicateGroups.find(g => g.key === key);
                                return sum + (group ? group.tasks.length - 1 : 0);
                            }, 0) !== 1 ? 's' : ''}
                        </Button>
                        <Button onClick={onClose} variant="secondary">
                            Close
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

// --- TASK STATUS BADGE ---
const StatusBadge = ({ status, dueDate }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (status === 'COMPLETED') {
        return (
            <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">
                ✓ Completed
            </span>
        );
    }

    if (daysUntilDue < 0) {
        return (
            <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-700 animate-pulse">
                ⚠ Overdue
            </span>
        );
    }

    if (daysUntilDue <= 7) {
        return (
            <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-orange-100 text-orange-700">
                ⏰ Due Soon
            </span>
        );
    }

    return (
        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700">
            📅 Upcoming
        </span>
    );
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
    const [owner, setOwner] = useState(task?.owner || '');
    const [notes, setNotes] = useState(task?.notes || '');

    const handleSave = async () => {
        if (!title || !dueDate) {
            alert('Please fill in title and due date');
            return;
        }

        const taskData = {
            title,
            description,
            category,
            dueDate,
            priority,
            recurring,
            status,
            owner,
            notes,
            updatedAt: serverTimestamp()
        };

        if (task) {
            await updateDoc(doc(db, "users", user.uid, "business_tasks", task.id), taskData);
        } else {
            await addDoc(collection(db, "users", user.uid, "business_tasks"), {
                ...taskData,
                createdAt: serverTimestamp()
            });
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                            {task ? 'Edit Task' : 'New Business Task'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Task Title *
                        </label>
                        <Input
                            placeholder="e.g., Submit Q4 BIR 2550M"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                            >
                                {Object.entries(TASK_CATEGORIES).map(([key, cat]) => (
                                    <option key={key} value={key}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                            >
                                {PRIORITY_LEVELS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Due Date *
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Owner
                            </label>
                            <Input
                                placeholder="Stuart Cox, Lenilia Cox, etc."
                                value={owner}
                                onChange={e => setOwner(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Recurring
                        </label>
                        <select
                            value={recurring}
                            onChange={e => setRecurring(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {RECURRING_PATTERNS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {task && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Description / Notes
                        </label>
                        <Textarea
                            placeholder="Additional details, requirements, documents needed..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {recurring !== 'none' && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 font-bold">
                                ℹ️ This task will recur {recurring}. After completion, a new instance will be created automatically.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={handleSave} variant="primary" className="flex-1">
                            {task ? 'Update Task' : 'Create Task'}
                        </Button>
                        <Button onClick={onClose} variant="secondary">
                            Cancel
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN COMPONENT ---
const BusinessTasksCalendar = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDuplicateDetector, setShowDuplicateDetector] = useState(false);
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    
    // --- ENHANCED FILTERS ---
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ACTIVE');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterOwner, setFilterOwner] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [sortDirection, setSortDirection] = useState('asc');
    const [viewMode, setViewMode] = useState('list'); // list or grouped
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);

    // Load tasks
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onSnapshot(
            query(collection(db, "users", user.uid, "business_tasks"), orderBy("createdAt", "desc")),
            (snap) => {
                setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            },
            (error) => {
                console.warn("Business tasks collection not initialized:", error.code);
                setTasks([]);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Get unique owners for filter
    const uniqueOwners = useMemo(() => {
        const owners = new Set();
        tasks.forEach(task => {
            if (task.owner) owners.add(task.owner);
        });
        return Array.from(owners);
    }, [tasks]);

    // Advanced filtering and sorting
    const filteredAndSortedTasks = useMemo(() => {
        let filtered = tasks.filter(task => {
            // Category filter
            if (filterCategory !== 'ALL' && task.category !== filterCategory) return false;
            
            // Status filter
            if (filterStatus === 'ACTIVE' && task.status === 'COMPLETED') return false;
            if (filterStatus === 'COMPLETED' && task.status !== 'COMPLETED') return false;
            
            // Priority filter
            if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;
            
            // Owner filter
            if (filterOwner !== 'ALL' && task.owner !== filterOwner) return false;
            
            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    task.title.toLowerCase().includes(search) ||
                    (task.description && task.description.toLowerCase().includes(search)) ||
                    (task.owner && task.owner.toLowerCase().includes(search)) ||
                    (task.notes && task.notes.toLowerCase().includes(search))
                );
            }
            
            // Hide completed toggle
            if (!showCompletedTasks && task.status === 'COMPLETED') return false;
            
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            let compareA, compareB;

            switch (sortBy) {
                case 'dueDate':
                    compareA = new Date(a.dueDate);
                    compareB = new Date(b.dueDate);
                    break;
                case 'priority':
                    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                    compareA = priorityOrder[a.priority] || 0;
                    compareB = priorityOrder[b.priority] || 0;
                    break;
                case 'title':
                    compareA = a.title.toLowerCase();
                    compareB = b.title.toLowerCase();
                    break;
                case 'category':
                    compareA = a.category;
                    compareB = b.category;
                    break;
                case 'status':
                    compareA = a.status;
                    compareB = b.status;
                    break;
                default:
                    return 0;
            }

            if (sortDirection === 'asc') {
                return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
            } else {
                return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
            }
        });

        return filtered;
    }, [tasks, filterCategory, filterStatus, filterPriority, filterOwner, searchTerm, sortBy, sortDirection, showCompletedTasks]);

    // Group tasks by category for grouped view
    const tasksByCategory = useMemo(() => {
        const grouped = {};
        filteredAndSortedTasks.forEach(task => {
            const safeCategory = TASK_CATEGORIES[task.category] ? task.category : 'OTHER';
            if (!grouped[safeCategory]) {
                grouped[safeCategory] = [];
            }
            grouped[safeCategory].push(task);
        });
        return grouped;
    }, [filteredAndSortedTasks]);

    // Statistics
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue = tasks.filter(t => 
            t.status !== 'COMPLETED' && new Date(t.dueDate) < today
        ).length;

        const dueSoon = tasks.filter(t => {
            if (t.status === 'COMPLETED') return false;
            const due = new Date(t.dueDate);
            const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7;
        }).length;

        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const pending = tasks.filter(t => t.status !== 'COMPLETED').length;

        const criticalPending = tasks.filter(t => 
            t.status !== 'COMPLETED' && t.priority === 'CRITICAL'
        ).length;

        return { overdue, dueSoon, completed, pending, criticalPending, total: tasks.length };
    }, [tasks]);

    // Bulk actions
    const handleBulkDelete = async () => {
        if (selectedTasks.length === 0) {
            alert('No tasks selected');
            return;
        }

        if (!window.confirm(`Delete ${selectedTasks.length} selected task${selectedTasks.length !== 1 ? 's' : ''}?`)) {
            return;
        }

        const batch = writeBatch(db);
        selectedTasks.forEach(taskId => {
            const taskRef = doc(db, "users", user.uid, "business_tasks", taskId);
            batch.delete(taskRef);
        });

        await batch.commit();
        setSelectedTasks([]);
        alert(`✅ Deleted ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}!`);
    };

    const handleBulkComplete = async () => {
        if (selectedTasks.length === 0) {
            alert('No tasks selected');
            return;
        }

        const batch = writeBatch(db);
        selectedTasks.forEach(taskId => {
            const taskRef = doc(db, "users", user.uid, "business_tasks", taskId);
            batch.update(taskRef, {
                status: 'COMPLETED',
                completedAt: serverTimestamp()
            });
        });

        await batch.commit();
        setSelectedTasks([]);
        alert(`✅ Marked ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} as completed!`);
    };

    const handleSelectAll = () => {
        if (selectedTasks.length === filteredAndSortedTasks.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(filteredAndSortedTasks.map(t => t.id));
        }
    };

    const handleDelete = async (taskId) => {
        if (window.confirm('Delete this task?')) {
            await deleteDoc(doc(db, "users", user.uid, "business_tasks", taskId));
        }
    };

    const handleToggleComplete = async (task) => {
        const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        await updateDoc(doc(db, "users", user.uid, "business_tasks", task.id), {
            status: newStatus,
            completedAt: newStatus === 'COMPLETED' ? serverTimestamp() : null
        });

        if (newStatus === 'COMPLETED' && task.recurring !== 'none') {
            const nextDueDate = calculateNextDueDate(task.dueDate, task.recurring);
            await addDoc(collection(db, "users", user.uid, "business_tasks"), {
                title: task.title,
                description: task.description,
                category: task.category,
                dueDate: nextDueDate,
                priority: task.priority,
                recurring: task.recurring,
                status: 'PENDING',
                owner: task.owner,
                notes: task.notes,
                createdAt: serverTimestamp()
            });
        }
    };

    const calculateNextDueDate = (currentDue, pattern) => {
        const date = new Date(currentDue);
        
        switch (pattern) {
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'annually':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }

        return date.toISOString().split('T')[0];
    };

    const handleExportCSV = () => {
        const csv = [
            ['Title', 'Category', 'Priority', 'Status', 'Due Date', 'Owner', 'Description', 'Notes'].join(','),
            ...filteredAndSortedTasks.map(task => [
                `"${task.title}"`,
                task.category,
                task.priority,
                task.status,
                task.dueDate,
                task.owner || '',
                `"${task.description || ''}"`,
                `"${task.notes || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karnot-tasks-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                        Business Tasks & Strategy
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {stats.total} total tasks · {stats.pending} active · {stats.completed} completed
                    </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={handleExportCSV}
                        variant="secondary"
                        className="text-sm"
                    >
                        <Download size={16} className="mr-1" /> Export CSV
                    </Button>
                    <Button
                        onClick={() => setShowStrategyModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                    >
                        <Upload size={16} className="mr-1" /> Import AI/JSON
                    </Button>
                    <Button
                        onClick={() => setShowDuplicateDetector(true)}
                        variant="secondary"
                        className="border-orange-200 text-orange-700 bg-orange-50 text-sm"
                    >
                        <Copy size={16} className="mr-1" /> Find Duplicates
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingTask(null);
                            setShowModal(true);
                        }}
                        variant="primary"
                        className="bg-orange-600 hover:bg-orange-700 text-sm"
                    >
                        <Plus size={16} className="mr-1" /> New Task
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <div>
                            <p className="text-xl font-black text-gray-800">{stats.overdue}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Overdue</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-orange-500">
                    <div className="flex items-center gap-3">
                        <Clock className="text-orange-500" size={20} />
                        <div>
                            <p className="text-xl font-black text-gray-800">{stats.dueSoon}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Due This Week</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-purple-500">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-purple-500" size={20} />
                        <div>
                            <p className="text-xl font-black text-gray-800">{stats.criticalPending}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Critical</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-blue-500">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-blue-500" size={20} />
                        <div>
                            <p className="text-xl font-black text-gray-800">{stats.pending}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Pending</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={20} />
                        <div>
                            <p className="text-xl font-black text-gray-800">{stats.completed}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Completed</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Advanced Filters & Search */}
            <Card className="p-4">
                <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search tasks by title, description, owner, or notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl font-medium"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase">Filters:</span>

                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                        >
                            <option value="ALL">All Categories</option>
                            {Object.entries(TASK_CATEGORIES).map(([key, cat]) => (
                                <option key={key} value={key}>{cat.label}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                        >
                            <option value="ACTIVE">Active Tasks</option>
                            <option value="COMPLETED">Completed Tasks</option>
                            <option value="ALL">All Tasks</option>
                        </select>

                        <select
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                        >
                            <option value="ALL">All Priorities</option>
                            {PRIORITY_LEVELS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>

                        {uniqueOwners.length > 0 && (
                            <select
                                value={filterOwner}
                                onChange={e => setFilterOwner(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                            >
                                <option value="ALL">All Owners</option>
                                {uniqueOwners.map(owner => (
                                    <option key={owner} value={owner}>{owner}</option>
                                ))}
                            </select>
                        )}

                        <div className="ml-auto flex gap-2 items-center">
                            <button
                                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    showCompletedTasks 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {showCompletedTasks ? <Eye size={14} /> : <EyeOff size={14} />}
                                {showCompletedTasks ? 'Hide' : 'Show'} Completed
                            </button>

                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                            >
                                <option value="dueDate">Sort: Due Date</option>
                                <option value="priority">Sort: Priority</option>
                                <option value="title">Sort: Title</option>
                                <option value="category">Sort: Category</option>
                                <option value="status">Sort: Status</option>
                            </select>

                            <button
                                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                {sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                            </button>

                            <button
                                onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                {viewMode === 'list' ? <Grid size={16} /> : <List size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Active Filters Badge */}
                    {(filterCategory !== 'ALL' || filterStatus !== 'ACTIVE' || filterPriority !== 'ALL' || filterOwner !== 'ALL' || searchTerm) && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Active filters:</span>
                            {filterCategory !== 'ALL' && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-bold">
                                    {TASK_CATEGORIES[filterCategory].label}
                                </span>
                            )}
                            {filterPriority !== 'ALL' && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-bold">
                                    {filterPriority} Priority
                                </span>
                            )}
                            {filterOwner !== 'ALL' && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                                    Owner: {filterOwner}
                                </span>
                            )}
                            {searchTerm && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                    Search: "{searchTerm}"
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setFilterCategory('ALL');
                                    setFilterStatus('ACTIVE');
                                    setFilterPriority('ALL');
                                    setFilterOwner('ALL');
                                    setSearchTerm('');
                                }}
                                className="text-red-600 hover:underline font-bold"
                            >
                                Clear All
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-gray-500">
                            Showing {filteredAndSortedTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                        </span>
                        
                        {selectedTasks.length > 0 && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleBulkComplete}
                                    variant="secondary"
                                    className="text-xs bg-green-50 text-green-700 border-green-200"
                                >
                                    <CheckCircle size={14} className="mr-1" />
                                    Complete {selectedTasks.length}
                                </Button>
                                <Button
                                    onClick={handleBulkDelete}
                                    variant="secondary"
                                    className="text-xs bg-red-50 text-red-700 border-red-200"
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete {selectedTasks.length}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Bulk Select Bar */}
            {filteredAndSortedTasks.length > 0 && (
                <Card className="p-3 bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedTasks.length === filteredAndSortedTasks.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-bold text-gray-700">
                            Select All ({filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''})
                        </span>
                        {selectedTasks.length > 0 && (
                            <span className="ml-auto text-xs text-gray-500">
                                {selectedTasks.length} selected
                            </span>
                        )}
                    </label>
                </Card>
            )}

            {/* Tasks Display - List View */}
            {viewMode === 'list' && (
                <div className="space-y-2">
                    {filteredAndSortedTasks.map(task => {
                        const catInfo = TASK_CATEGORIES[task.category] || TASK_CATEGORIES['OTHER'];
                        const CategoryIcon = catInfo.icon;
                        const isSelected = selectedTasks.includes(task.id);

                        return (
                            <Card key={task.id} className={`p-4 hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTasks([...selectedTasks, task.id]);
                                            } else {
                                                setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                            }
                                        }}
                                        className="w-4 h-4 mt-1"
                                    />

                                    <button
                                        onClick={() => handleToggleComplete(task)}
                                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            task.status === 'COMPLETED'
                                                ? 'bg-green-500 border-green-500'
                                                : 'border-gray-300 hover:border-green-500'
                                        }`}
                                    >
                                        {task.status === 'COMPLETED' && (
                                            <CheckCircle size={14} className="text-white" />
                                        )}
                                    </button>

                                    <CategoryIcon className={`${catInfo.color} mt-1 flex-shrink-0`} size={18} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                                <h4 className={`font-bold text-gray-800 ${
                                                    task.status === 'COMPLETED' ? 'line-through opacity-50' : ''
                                                }`}>
                                                    {task.title}
                                                </h4>
                                                {task.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                            <StatusBadge status={task.status} dueDate={task.dueDate} />
                                            
                                            <span className="text-xs text-gray-500">
                                                📅 {new Date(task.dueDate).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric' 
                                                })}
                                            </span>

                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                PRIORITY_LEVELS.find(p => p.value === task.priority)?.color || 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {task.priority}
                                            </span>

                                            <span className={`text-xs px-2 py-0.5 rounded-full ${catInfo.bgColor} ${catInfo.color} font-bold`}>
                                                {catInfo.label}
                                            </span>

                                            {task.owner && (
                                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                    👤 {task.owner}
                                                </span>
                                            )}

                                            {task.recurring !== 'none' && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                                    🔄 {task.recurring}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Tasks Display - Grouped View */}
            {viewMode === 'grouped' && (
                <div className="space-y-4">
                    {Object.entries(tasksByCategory).map(([categoryKey, categoryTasks]) => {
                        const catInfo = TASK_CATEGORIES[categoryKey] || TASK_CATEGORIES['OTHER'];
                        const CategoryIcon = catInfo.icon;
                        const isExpanded = expandedCategory === categoryKey || expandedCategory === null;

                        return (
                            <Card key={categoryKey} className={`overflow-hidden ${catInfo.borderColor} border-l-4`}>
                                <div
                                    className={`p-4 ${catInfo.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                                    onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <CategoryIcon className={catInfo.color} size={20} />
                                            <div>
                                                <h3 className="font-black text-gray-800 uppercase text-sm">
                                                    {catInfo.label}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="divide-y divide-gray-100">
                                        {categoryTasks.map(task => {
                                            const isSelected = selectedTasks.includes(task.id);
                                            
                                            return (
                                                <div key={task.id} className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedTasks([...selectedTasks, task.id]);
                                                                } else {
                                                                    setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 mt-1"
                                                        />

                                                        <button
                                                            onClick={() => handleToggleComplete(task)}
                                                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                                task.status === 'COMPLETED'
                                                                    ? 'bg-green-500 border-green-500'
                                                                    : 'border-gray-300 hover:border-green-500'
                                                            }`}
                                                        >
                                                            {task.status === 'COMPLETED' && (
                                                                <CheckCircle size={14} className="text-white" />
                                                            )}
                                                        </button>

                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <h4 className={`font-bold text-gray-800 ${
                                                                        task.status === 'COMPLETED' ? 'line-through opacity-50' : ''
                                                                    }`}>
                                                                        {task.title}
                                                                    </h4>
                                                                    {task.description && (
                                                                        <p className="text-sm text-gray-600 mt-1">
                                                                            {task.description}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                                                        <StatusBadge status={task.status} dueDate={task.dueDate} />
                                                                        <span className="text-xs text-gray-500">
                                                                            📅 Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                                                                                month: 'short', 
                                                                                day: 'numeric', 
                                                                                year: 'numeric' 
                                                                            })}
                                                                        </span>
                                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                            PRIORITY_LEVELS.find(p => p.value === task.priority)?.color || 'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                            {task.priority}
                                                                        </span>
                                                                        {task.owner && (
                                                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                                                👤 {task.owner}
                                                                            </span>
                                                                        )}
                                                                        {task.recurring !== 'none' && (
                                                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                                                                🔄 {task.recurring}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingTask(task);
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(task.id)}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {filteredAndSortedTasks.length === 0 && (
                <Card className="p-12 text-center">
                    <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-600 mb-2">
                        {searchTerm || filterCategory !== 'ALL' || filterPriority !== 'ALL' || filterOwner !== 'ALL'
                            ? 'No Tasks Match Your Filters'
                            : 'No Tasks Found'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {searchTerm || filterCategory !== 'ALL' || filterPriority !== 'ALL' || filterOwner !== 'ALL'
                            ? 'Try adjusting your filters or search term'
                            : 'Start by creating your first business task'}
                    </p>
                    {(searchTerm || filterCategory !== 'ALL' || filterPriority !== 'ALL' || filterOwner !== 'ALL') && (
                        <Button
                            onClick={() => {
                                setFilterCategory('ALL');
                                setFilterStatus('ACTIVE');
                                setFilterPriority('ALL');
                                setFilterOwner('ALL');
                                setSearchTerm('');
                            }}
                            variant="secondary"
                            className="mb-2"
                        >
                            Clear All Filters
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            setEditingTask(null);
                            setShowModal(true);
                        }}
                        variant="primary"
                    >
                        <Plus size={16} className="mr-1" /> Create First Task
                    </Button>
                </Card>
            )}

            {/* Modals */}
            {showModal && (
                <TaskModal
                    task={editingTask}
                    onClose={() => {
                        setShowModal(false);
                        setEditingTask(null);
                    }}
                    onSave={() => {
                        setShowModal(false);
                        setEditingTask(null);
                    }}
                    user={user}
                />
            )}

            {showDuplicateDetector && (
                <DuplicateDetectorModal
                    tasks={tasks}
                    onClose={() => setShowDuplicateDetector(false)}
                    user={user}
                />
            )}

            {showStrategyModal && (
                <StrategyImportModal
                    onClose={() => setShowStrategyModal(false)}
                    user={user}
                />
            )}
        </div>
    );
};

export default BusinessTasksCalendar;
