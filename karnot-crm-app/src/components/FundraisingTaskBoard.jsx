import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, 
    onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { 
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Plus, Trash2, GripVertical, CheckCircle, 
    Briefcase, Sparkles, ArrowRight 
} from 'lucide-react';
import { Button } from '../data/constants.jsx'; 

// --- CAMBRIDGE COURSE STAGES ---
const STAGES = [
    { id: 'PREP', title: '1. Prep & Validation', color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
    { id: 'OUTREACH', title: '2. Investor Outreach', color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    { id: 'NEGOTIATION', title: '3. Terms & Diligence', color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    { id: 'CLOSING', title: '4. Closing & Funds', color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' }
];

// --- CAMBRIDGE TASKS TEMPLATE ---
const CAMBRIDGE_TEMPLATE = [
    // Stage 1: Prep
    { title: "Build 18-Month Cash Flow Forecast", stage: "PREP", priority: "High" },
    { title: "Clean up Cap Table (Pre-Note)", stage: "PREP", priority: "Critical" },
    { title: "Decide Valuation Cap & Discount (e.g. 20%)", stage: "PREP", priority: "Critical" },
    { title: "Draft 'Founder-Market Fit' Statement", stage: "PREP", priority: "Medium" },
    
    // Stage 2: Outreach
    { title: "Draft Investor One-Pager (Teaser)", stage: "OUTREACH", priority: "High" },
    { title: "Build Target List (30 Warm Intros)", stage: "OUTREACH", priority: "High" },
    { title: "Send Pitch Deck (Tracked Links)", stage: "OUTREACH", priority: "Medium" },
    
    // Stage 3: Negotiation
    { title: "Draft Convertible Loan Agreement (CLA)", stage: "NEGOTIATION", priority: "Critical" },
    { title: "Populate Data Room (IP, Contracts)", stage: "NEGOTIATION", priority: "High" },
    { title: "Legal Review: Qualifying Triggers", stage: "NEGOTIATION", priority: "Medium" },

    // Stage 4: Closing
    { title: "Gather Digital Signatures", stage: "CLOSING", priority: "High" },
    { title: "Verify Wire Transfers", stage: "CLOSING", priority: "Critical" },
    { title: "Issue Note Certificates", stage: "CLOSING", priority: "Medium" }
];

// --- DRAGGABLE CARD COMPONENT ---
const SortableTaskCard = ({ task, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="mb-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group touch-none"
        >
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2">
                    <button {...attributes} {...listeners} className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                        <GripVertical size={14} />
                    </button>
                    <div>
                        <p className="text-sm font-medium text-gray-800 leading-tight">{task.title}</p>
                        {task.priority && (
                            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 inline-block px-1.5 py-0.5 rounded
                                ${task.priority === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {task.priority}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => onDelete(task.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// --- MAIN BOARD COMPONENT ---
const FundraisingTaskBoard = ({ user }) => {
    const [tasks, setTasks] = useState([]);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isAddingTo, setIsAddingTo] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Fetch Tasks
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'fundraising_tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    // Handle Drag End
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Determine new stage
        let newStage = overId;
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) newStage = overTask.stage; // If dropped on a task, take that task's stage

        // If dropped on a column (STAGE ID) or a task in a different stage
        if (STAGES.find(s => s.id === newStage) || (overTask && overTask.stage)) {
             // Find current task
             const currentTask = tasks.find(t => t.id === activeId);
             if (currentTask && currentTask.stage !== newStage) {
                 // Optimistic Update
                 setTasks(prev => prev.map(t => t.id === activeId ? { ...t, stage: newStage } : t));
                 
                 // Firebase Update
                 await updateDoc(doc(db, 'users', user.uid, 'fundraising_tasks', activeId), {
                     stage: newStage,
                     updatedAt: serverTimestamp()
                 });
             }
        }
    };

    // Add New Task
    const handleAddTask = async (stageId) => {
        if (!newTaskInput.trim()) return;
        try {
            await addDoc(collection(db, 'users', user.uid, 'fundraising_tasks'), {
                title: newTaskInput,
                stage: stageId,
                createdAt: serverTimestamp(),
                priority: 'Normal'
            });
            setNewTaskInput('');
            setIsAddingTo(null);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    // Seed Cambridge Template
    const seedCambridgeTasks = async () => {
        if (!window.confirm("Load the 'Cambridge Pre-seed to Exit' checklist? This will add tasks to your board.")) return;
        
        const batchPromises = CAMBRIDGE_TEMPLATE.map(task => 
            addDoc(collection(db, 'users', user.uid, 'fundraising_tasks'), {
                ...task,
                createdAt: serverTimestamp()
            })
        );
        await Promise.all(batchPromises);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Delete this task?")) {
            await deleteDoc(doc(db, 'users', user.uid, 'fundraising_tasks', id));
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Toolbar */}
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <Briefcase className="text-orange-600" size={24} />
                        Fundraising Roadmap
                    </h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Based on Cambridge University "Pre-seed to Exit" Framework
                    </p>
                </div>
                <Button onClick={seedCambridgeTasks} variant="secondary" className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50">
                    <Sparkles size={16} className="mr-2" /> Load Course Template
                </Button>
            </div>

            {/* Kanban Board */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                    {STAGES.map(stage => (
                        <div key={stage.id} className={`flex-shrink-0 w-80 flex flex-col rounded-xl border ${stage.border} ${stage.color} h-full`}>
                            {/* Column Header */}
                            <div className="p-3 border-b border-black/5 flex justify-between items-center">
                                <span className={`font-black text-xs uppercase tracking-wider ${stage.text}`}>
                                    {stage.title}
                                </span>
                                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full text-gray-400 shadow-sm">
                                    {tasks.filter(t => t.stage === stage.id).length}
                                </span>
                            </div>

                            {/* Column Body */}
                            <div className="flex-1 p-2 overflow-y-auto min-h-[100px]">
                                <SortableContext 
                                    id={stage.id} 
                                    items={tasks.filter(t => t.stage === stage.id).map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {tasks.filter(t => t.stage === stage.id).map(task => (
                                        <SortableTaskCard key={task.id} task={task} onDelete={handleDelete} />
                                    ))}
                                </SortableContext>

                                {/* Add Task Input */}
                                {isAddingTo === stage.id ? (
                                    <div className="mt-2 bg-white p-2 rounded-lg shadow-sm border border-blue-200 animate-in fade-in slide-in-from-top-1">
                                        <input 
                                            autoFocus
                                            className="w-full text-sm outline-none mb-2"
                                            placeholder="Task name..." 
                                            value={newTaskInput}
                                            onChange={(e) => setNewTaskInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(stage.id)}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsAddingTo(null)} className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase">Cancel</button>
                                            <button onClick={() => handleAddTask(stage.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-bold uppercase">Add</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsAddingTo(stage.id)}
                                        className="w-full py-2 mt-2 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-transparent hover:border-black/5"
                                    >
                                        <Plus size={14} className="mr-1"/> Add Task
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>
        </div>
    );
};

export default FundraisingTaskBoard;
