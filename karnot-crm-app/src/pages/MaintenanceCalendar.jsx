import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Button } from '../data/constants';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, MapPin, Users, Wrench, TrendingUp, X, Edit2, Trash2, Clock, Building } from 'lucide-react';

// Philippine Holidays 2026
const PHILIPPINE_HOLIDAYS_2026 = [
    { title: "New Year's Day", date: "2026-01-01", type: "CONSTRAINT", category: "Holiday" },
    { title: "Chinese New Year", date: "2026-02-17", type: "CONSTRAINT", category: "Holiday" },
    { title: "EDSA Revolution", date: "2026-02-25", type: "CONSTRAINT", category: "Holiday" },
    { title: "Maundy Thursday", date: "2026-04-02", type: "CONSTRAINT", category: "Holiday" },
    { title: "Good Friday", date: "2026-04-03", type: "CONSTRAINT", category: "Holiday" },
    { title: "Black Saturday", date: "2026-04-04", type: "CONSTRAINT", category: "Holiday" },
    { title: "Easter Sunday", date: "2026-04-05", type: "CONSTRAINT", category: "Holiday" },
    { title: "Araw ng Kagitingan", date: "2026-04-09", type: "CONSTRAINT", category: "Holiday" },
    { title: "Labor Day", date: "2026-05-01", type: "CONSTRAINT", category: "Holiday" },
    { title: "Independence Day", date: "2026-06-12", type: "CONSTRAINT", category: "Holiday" },
    { title: "Ninoy Aquino Day", date: "2026-08-21", type: "CONSTRAINT", category: "Holiday" },
    { title: "National Heroes Day", date: "2026-08-31", type: "CONSTRAINT", category: "Holiday" },
    { title: "Christmas Day", date: "2026-12-25", type: "CONSTRAINT", category: "Holiday" },
    { title: "Rizal Day", date: "2026-12-30", type: "CONSTRAINT", category: "Holiday" }
];

// Strategic Events 2026
const STRATEGIC_EVENTS_2026 = [
    {
        title: "Worldbex 2026",
        start: "2026-03-12T09:00:00",
        end: "2026-03-15T18:00:00",
        type: "STRATEGY",
        category: "Trade_Show",
        priority: "High",
        description: "Construction & Architects trade show - target high-rise developers",
        location: "World Trade Center, Manila"
    },
    {
        title: "PhilEnergy Expo 2026",
        start: "2026-04-22T09:00:00",
        end: "2026-04-24T18:00:00",
        type: "STRATEGY",
        category: "Trade_Show",
        priority: "Critical",
        description: "Energy Efficiency & Renewables - PRIMARY TARGET EVENT for heat pump leads",
        location: "SMX Convention Center, Manila"
    },
    {
        title: "HVAC/R Philippines 2026",
        start: "2026-10-22T09:00:00",
        end: "2026-10-24T18:00:00",
        type: "STRATEGY",
        category: "Trade_Show",
        priority: "High",
        description: "Mechanical Engineers - showcase CO₂ and R290 technology",
        location: "SMX Convention Center, Manila"
    },
    {
        title: "IIEE National Convention",
        start: "2026-11-24T09:00:00",
        end: "2026-11-28T18:00:00",
        type: "STRATEGY",
        category: "Trade_Show",
        priority: "Medium",
        description: "Electrical Engineers - focus on energy efficiency messaging",
        location: "TBD"
    }
];

// Event Creation/Edit Modal
const EventModal = ({ event, onClose, onSave, companies }) => {
    const [formData, setFormData] = useState({
        title: event?.title || '',
        type: event?.type || 'OPERATION',
        category: event?.category || 'Meeting',
        priority: event?.priority || 'Medium',
        start: event?.start || new Date().toISOString().slice(0, 16),
        end: event?.end || new Date().toISOString().slice(0, 16),
        allDay: event?.allDay || false,
        description: event?.description || '',
        location: event?.location || '',
        companyId: event?.companyId || '',
        assignedTo: event?.assignedTo || ''
    });

    const categoryOptions = {
        'OPERATION': ['Meeting', 'Site Visit', 'Installation', 'Maintenance', 'Follow-up', 'Demo'],
        'STRATEGY': ['Trade Show', 'Marketing', 'Partnership', 'Planning', 'Conference'],
        'CONSTRAINT': ['Holiday', 'Blocked Time', 'Internal']
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-black text-gray-800 uppercase">
                        {event ? 'Edit Event' : 'Create New Event'}
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="!p-2">
                        <X size={16} />
                    </Button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Event Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            placeholder="e.g., Client Meeting with Nestlé"
                        />
                    </div>

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Event Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                <option value="OPERATION">Operation</option>
                                <option value="STRATEGY">Strategy</option>
                                <option value="CONSTRAINT">Constraint</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            >
                                {categoryOptions[formData.type]?.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Company (Optional) */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Related Company (Optional)
                        </label>
                        <select
                            value={formData.companyId}
                            onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                        >
                            <option value="">No Company</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>
                                    {company.companyName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date & Time */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.allDay}
                                onChange={e => setFormData({ ...formData, allDay: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <label className="text-xs font-bold text-gray-700">All Day Event</label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                    Start
                                </label>
                                <input
                                    type={formData.allDay ? 'date' : 'datetime-local'}
                                    value={formData.allDay ? formData.start.slice(0, 10) : formData.start}
                                    onChange={e => setFormData({ ...formData, start: formData.allDay ? `${e.target.value}T00:00:00` : e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                                    End
                                </label>
                                <input
                                    type={formData.allDay ? 'date' : 'datetime-local'}
                                    value={formData.allDay ? formData.end.slice(0, 10) : formData.end}
                                    onChange={e => setFormData({ ...formData, end: formData.allDay ? `${e.target.value}T23:59:59` : e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Priority
                        </label>
                        <select
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Location
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            placeholder="e.g., Client Office, Manila"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            rows="3"
                            placeholder="Event details, agenda, notes..."
                        />
                    </div>

                    {/* Assigned To */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Assigned To
                        </label>
                        <input
                            type="text"
                            value={formData.assignedTo}
                            onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                            placeholder="Team member name"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t">
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSave(formData)}
                        variant="primary"
                        className="flex-1"
                        disabled={!formData.title || !formData.start}
                    >
                        {event ? 'Update' : 'Create'} Event
                    </Button>
                </div>
            </div>
        </div>
    );
};

const MaintenanceCalendar = ({ companies = [], contracts = [], user, appointments = [], opportunities = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [maintenanceEvents, setMaintenanceEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [filterType, setFilterType] = useState('ALL');
    const [viewMode, setViewMode] = useState('month');
    const [seeding, setSeeding] = useState(false);

    // Load all calendar events
    useEffect(() => {
        if (!user) return;

        const eventsQuery = query(collection(db, 'users', user.uid, 'calendar_events'), orderBy('start', 'asc'));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCalendarEvents(eventsData);
        });

        const maintenanceQuery = query(collection(db, 'users', user.uid, 'maintenance_events'), orderBy('scheduled_date', 'asc'));
        const unsubMaintenance = onSnapshot(maintenanceQuery, (snapshot) => {
            const maintenanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMaintenanceEvents(maintenanceData);
        });

        return () => {
            unsubEvents();
            unsubMaintenance();
        };
    }, [user]);

    // Seed initial events
    const seedInitialEvents = async () => {
        if (seeding || !user) return;
        
        setSeeding(true);
        try {
            let addedCount = 0;
            let skippedCount = 0;

            for (const holiday of PHILIPPINE_HOLIDAYS_2026) {
                const existingQuery = query(
                    collection(db, 'users', user.uid, 'calendar_events'),
                    where('title', '==', holiday.title),
                    where('type', '==', 'CONSTRAINT')
                );
                const existingDocs = await getDocs(existingQuery);

                if (existingDocs.empty) {
                    await addDoc(collection(db, 'users', user.uid, 'calendar_events'), {
                        ...holiday,
                        start: `${holiday.date}T00:00:00`,
                        end: `${holiday.date}T23:59:59`,
                        allDay: true,
                        priority: "Medium"
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }

            for (const event of STRATEGIC_EVENTS_2026) {
                const existingQuery = query(
                    collection(db, 'users', user.uid, 'calendar_events'),
                    where('title', '==', event.title),
                    where('type', '==', 'STRATEGY')
                );
                const existingDocs = await getDocs(existingQuery);

                if (existingDocs.empty) {
                    await addDoc(collection(db, 'users', user.uid, 'calendar_events'), {
                        ...event,
                        allDay: false
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }

            alert(`Calendar Seeding Complete!\n\nAdded: ${addedCount} events\nSkipped: ${skippedCount} duplicates`);
        } catch (error) {
            console.error('Error seeding events:', error);
            alert('Error seeding events. Check console.');
        } finally {
            setSeeding(false);
        }
    };

    const clearAllEvents = async () => {
        if (!user || !window.confirm('Are you sure you want to delete ALL calendar events? This cannot be undone!')) {
            return;
        }

        try {
            const eventsSnapshot = await getDocs(collection(db, 'users', user.uid, 'calendar_events'));
            let deleteCount = 0;

            for (const docSnap of eventsSnapshot.docs) {
                await deleteDoc(doc(db, 'users', user.uid, 'calendar_events', docSnap.id));
                deleteCount++;
            }

            alert(`Deleted ${deleteCount} calendar events.`);
        } catch (error) {
            console.error('Error clearing events:', error);
            alert('Error clearing events. Check console.');
        }
    };

    const handleSaveEvent = async (formData) => {
        if (!user) return;

        try {
            if (editingEvent) {
                await updateDoc(doc(db, 'users', user.uid, 'calendar_events', editingEvent.id), formData);
            } else {
                await addDoc(collection(db, 'users', user.uid, 'calendar_events'), formData);
            }
            setShowNewEvent(false);
            setEditingEvent(null);
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error saving event. Check console.');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!user || !window.confirm('Delete this event?')) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'calendar_events', eventId));
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error deleting event.');
        }
    };

    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const getEventsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        
        // Calendar events
        const calEvents = calendarEvents.filter(event => {
            const eventStart = new Date(event.start).toISOString().split('T')[0];
            const eventEnd = new Date(event.end).toISOString().split('T')[0];
            return dateStr >= eventStart && dateStr <= eventEnd;
        });

        // Maintenance events
        const maintEvents = maintenanceEvents
            .filter(event => event.scheduled_date === dateStr)
            .map(event => ({
                ...event,
                type: 'OPERATION',
                category: 'Maintenance',
                title: `${event.maintenance_type} - ${getClientName(event.client_ref)}`
            }));

        // Appointments
        const aptEvents = (appointments || [])
            .filter(apt => apt.appointmentDate === dateStr)
            .map(apt => ({
                ...apt,
                type: 'OPERATION',
                category: 'Appointment',
                title: `📞 ${apt.companyName}`,
                description: `${apt.purpose} - ${apt.contactPerson}`,
                start: `${apt.appointmentDate}T${apt.appointmentTime || '00:00'}:00`,
                end: `${apt.appointmentDate}T${apt.appointmentTime || '00:00'}:00`,
                priority: apt.priority || 'Medium'
            }));

        // Opportunity follow-ups (Next Action dates)
        const oppEvents = (opportunities || [])
            .filter(opp => opp.nextAction && opp.nextAction.date === dateStr)
            .map(opp => ({
                ...opp,
                type: 'STRATEGY',
                category: 'Follow-up',
                title: `🎯 ${opp.customerName}`,
                description: opp.nextAction.action,
                start: `${opp.nextAction.date}T09:00:00`,
                end: `${opp.nextAction.date}T09:00:00`,
                priority: 'High'
            }));

        return [...calEvents, ...maintEvents, ...aptEvents, ...oppEvents].filter(event => 
            filterType === 'ALL' || event.type === filterType
        );
    };

    const getClientName = (clientRef) => {
        const company = companies.find(c => c.id === clientRef);
        return company?.companyName || 'Unknown Client';
    };

    const getEventTypeColor = (type, priority) => {
        if (type === 'OPERATION') return 'bg-blue-100 border-blue-500 text-blue-700';
        if (type === 'CONSTRAINT') return 'bg-gray-100 border-gray-400 text-gray-600';
        if (type === 'STRATEGY') {
            if (priority === 'Critical') return 'bg-red-100 border-red-500 text-red-700';
            if (priority === 'High') return 'bg-orange-100 border-orange-500 text-orange-700';
            return 'bg-yellow-100 border-yellow-500 text-yellow-700';
        }
        return 'bg-gray-100 border-gray-400 text-gray-600';
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isHoliday = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return calendarEvents.some(event => 
            event.type === 'CONSTRAINT' && 
            event.category === 'Holiday' &&
            dateStr >= new Date(event.start).toISOString().split('T')[0] &&
            dateStr <= new Date(event.end).toISOString().split('T')[0]
        );
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const monthDays = getMonthDays();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Modals */}
            {(showNewEvent || editingEvent) && (
                <EventModal
                    event={editingEvent}
                    onClose={() => {
                        setShowNewEvent(false);
                        setEditingEvent(null);
                    }}
                    onSave={handleSaveEvent}
                    companies={companies}
                />
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Company Calendar</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Appointments • Maintenance • Trade Shows • Follow-ups
                    </p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={() => setShowNewEvent(true)}
                        variant="primary"
                        className="text-xs"
                    >
                        <Plus size={12} className="mr-1" /> New Event
                    </Button>
                    <Button
                        onClick={() => setFilterType('ALL')}
                        variant={filterType === 'ALL' ? 'primary' : 'secondary'}
                        className="text-xs"
                    >
                        All Events
                    </Button>
                    <Button
                        onClick={() => setFilterType('OPERATION')}
                        variant={filterType === 'OPERATION' ? 'primary' : 'secondary'}
                        className="text-xs"
                    >
                        <Wrench size={12} className="mr-1" /> Operations
                    </Button>
                    <Button
                        onClick={() => setFilterType('STRATEGY')}
                        variant={filterType === 'STRATEGY' ? 'primary' : 'secondary'}
                        className="text-xs"
                    >
                        <TrendingUp size={12} className="mr-1" /> Strategy
                    </Button>
                    <Button
                        onClick={() => setFilterType('CONSTRAINT')}
                        variant={filterType === 'CONSTRAINT' ? 'primary' : 'secondary'}
                        className="text-xs"
                    >
                        <CalendarIcon size={12} className="mr-1" /> Holidays
                    </Button>
                </div>
            </div>

            {/* Calendar Navigation */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                    <Button onClick={() => navigateMonth(-1)} variant="secondary">
                        <ChevronLeft size={16} />
                    </Button>
                    
                    <h2 className="text-xl font-black text-gray-800 uppercase">{monthName}</h2>
                    
                    <Button onClick={() => navigateMonth(1)} variant="secondary">
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 bg-gray-100 border-b-2 border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center font-black text-xs uppercase text-gray-600">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                    {monthDays.map((day, idx) => {
                        const events = getEventsForDate(day.date);
                        const holiday = isHoliday(day.date);
                        
                        return (
                            <div
                                key={idx}
                                className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                                    !day.isCurrentMonth ? 'bg-gray-50' : holiday ? 'bg-red-50' : 'bg-white'
                                } ${isToday(day.date) ? 'ring-2 ring-orange-500' : ''}`}
                            >
                                <div className={`text-sm font-bold mb-2 ${
                                    isToday(day.date) 
                                        ? 'bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
                                        : day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                    {day.date.getDate()}
                                </div>
                                
                                <div className="space-y-1">
                                    {events.slice(0, 3).map((event, eventIdx) => (
                                        <div
                                            key={eventIdx}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`text-xs px-2 py-1 rounded border-l-2 cursor-pointer hover:shadow-md transition-shadow ${
                                                getEventTypeColor(event.type, event.priority)
                                            }`}
                                        >
                                            <div className="font-bold truncate">{event.title}</div>
                                            {event.location && (
                                                <div className="text-[10px] opacity-75 truncate">
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {events.length > 3 && (
                                        <div className="text-xs text-gray-500 font-bold px-2">
                                            +{events.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">{selectedEvent.title}</h2>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    getEventTypeColor(selectedEvent.type, selectedEvent.priority)
                                }`}>
                                    {selectedEvent.type} - {selectedEvent.priority || selectedEvent.category}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {selectedEvent.id && !selectedEvent.appointmentDate && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                setEditingEvent(selectedEvent);
                                                setSelectedEvent(null);
                                            }}
                                            variant="secondary"
                                            className="!p-2"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteEvent(selectedEvent.id)}
                                            variant="secondary"
                                            className="!p-2 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </>
                                )}
                                <Button onClick={() => setSelectedEvent(null)} variant="secondary" className="!p-2">
                                    <X size={16} />
                                </Button>
                            </div>
                        </div>

                        {selectedEvent.description && (
                            <p className="text-gray-700 mb-4">{selectedEvent.description}</p>
                        )}

                        {selectedEvent.location && (
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <MapPin size={16} />
                                <span className="text-sm">{selectedEvent.location}</span>
                            </div>
                        )}

                        {selectedEvent.start && (
                            <div className="flex items-center gap-2 text-gray-600 mb-4">
                                <Clock size={16} />
                                <span className="text-sm">
                                    {new Date(selectedEvent.start).toLocaleString()} 
                                    {selectedEvent.end && ` - ${new Date(selectedEvent.end).toLocaleString()}`}
                                </span>
                            </div>
                        )}

                        {selectedEvent.companyName && (
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <Building size={16} />
                                <span className="text-sm font-bold">{selectedEvent.companyName}</span>
                            </div>
                        )}

                        {selectedEvent.assignedTo && (
                            <div className="flex items-center gap-2 text-gray-600 mb-4">
                                <Users size={16} />
                                <span className="text-sm">Assigned to: {selectedEvent.assignedTo}</span>
                            </div>
                        )}

                        {selectedEvent.type === 'OPERATION' && selectedEvent.status && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <p className="text-xs font-bold text-blue-700 uppercase mb-2">Status</p>
                                <p className="text-sm text-gray-700">{selectedEvent.status}</p>
                                {selectedEvent.assigned_tech && (
                                    <p className="text-sm text-gray-700">Technician: {selectedEvent.assigned_tech}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Calendar Management Tools */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-bold text-blue-800 uppercase mb-3">Calendar Management</p>
                <div className="flex gap-2 flex-wrap">
                    <Button 
                        onClick={seedInitialEvents} 
                        variant="primary" 
                        className="text-xs"
                        disabled={seeding}
                    >
                        {seeding ? 'Seeding...' : 'Seed 2026 Events'}
                    </Button>
                    <Button 
                        onClick={clearAllEvents} 
                        variant="secondary" 
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                        Clear All Events
                    </Button>
                    <div className="text-xs text-gray-600 self-center ml-2">
                        Manual Events: {calendarEvents.length} | Appointments: {appointments?.length || 0} | Follow-ups: {opportunities?.filter(o => o.nextAction).length || 0}
                    </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                    ℹ️ Calendar automatically shows appointments and opportunity follow-ups
                </p>
            </div>
        </div>
    );
};

export default MaintenanceCalendar;
