import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Button } from '../data/constants';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, MapPin, Users, Wrench, TrendingUp, X } from 'lucide-react';

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

const MaintenanceCalendar = ({ companies, contracts, user }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [maintenanceEvents, setMaintenanceEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [filterType, setFilterType] = useState('ALL');
    const [viewMode, setViewMode] = useState('month');
    const [seeding, setSeeding] = useState(false);

    // Load all calendar events
    useEffect(() => {
        const eventsQuery = query(collection(db, 'calendar_events'), orderBy('start', 'asc'));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCalendarEvents(eventsData);
        });

        const maintenanceQuery = query(collection(db, 'maintenance_events'), orderBy('scheduled_date', 'asc'));
        const unsubMaintenance = onSnapshot(maintenanceQuery, (snapshot) => {
            const maintenanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMaintenanceEvents(maintenanceData);
        });

        return () => {
            unsubEvents();
            unsubMaintenance();
        };
    }, []);

    // FIXED: Seed holidays and strategic events (with duplicate checking)
    const seedInitialEvents = async () => {
        if (seeding) return;
        
        setSeeding(true);
        try {
            let addedCount = 0;
            let skippedCount = 0;

            // Check and seed holidays
            for (const holiday of PHILIPPINE_HOLIDAYS_2026) {
                // Check if holiday already exists
                const existingQuery = query(
                    collection(db, 'calendar_events'),
                    where('title', '==', holiday.title),
                    where('type', '==', 'CONSTRAINT')
                );
                const existingDocs = await getDocs(existingQuery);

                if (existingDocs.empty) {
                    await addDoc(collection(db, 'calendar_events'), {
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

            // Check and seed strategic events
            for (const event of STRATEGIC_EVENTS_2026) {
                // Check if event already exists
                const existingQuery = query(
                    collection(db, 'calendar_events'),
                    where('title', '==', event.title),
                    where('type', '==', 'STRATEGY')
                );
                const existingDocs = await getDocs(existingQuery);

                if (existingDocs.empty) {
                    await addDoc(collection(db, 'calendar_events'), {
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

    // ADDED: Clear all calendar events
    const clearAllEvents = async () => {
        if (!window.confirm('Are you sure you want to delete ALL calendar events? This cannot be undone!')) {
            return;
        }

        try {
            const eventsSnapshot = await getDocs(collection(db, 'calendar_events'));
            let deleteCount = 0;

            for (const docSnap of eventsSnapshot.docs) {
                await deleteDoc(doc(db, 'calendar_events', docSnap.id));
                deleteCount++;
            }

            alert(`Deleted ${deleteCount} calendar events.`);
        } catch (error) {
            console.error('Error clearing events:', error);
            alert('Error clearing events. Check console.');
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
        
        // Previous month's days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        // Current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month's days
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

        return [...calEvents, ...maintEvents].filter(event => 
            filterType === 'ALL' || event.type === filterType
        );
    };

    const getClientName = (clientRef) => {
        const company = companies.find(c => c.id === clientRef);
        return company?.name || 'Unknown Client';
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
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Operations Calendar</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Maintenance • Trade Shows • Holidays
                    </p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
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
                            <Button onClick={() => setSelectedEvent(null)} variant="secondary">
                                <X size={16} />
                            </Button>
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
                            <div className="text-sm text-gray-600 mb-4">
                                {new Date(selectedEvent.start).toLocaleString()} 
                                {selectedEvent.end && ` - ${new Date(selectedEvent.end).toLocaleString()}`}
                            </div>
                        )}

                        {selectedEvent.type === 'OPERATION' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <p className="text-xs font-bold text-blue-700 uppercase mb-2">Maintenance Details</p>
                                <p className="text-sm text-gray-700">Status: {selectedEvent.status}</p>
                                {selectedEvent.assigned_tech && (
                                    <p className="text-sm text-gray-700">Technician: {selectedEvent.assigned_tech}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FIXED: Calendar Management Tools */}
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
                        Total events: {calendarEvents.length}
                    </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                    ℹ️ Seed button will skip existing events to prevent duplicates
                </p>
            </div>
        </div>
    );
};

export default MaintenanceCalendar;
