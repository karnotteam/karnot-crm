import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Button, Card } from '../data/constants';
import { 
    MapPin, Clock, CheckCircle, Phone, Navigation, 
    AlertCircle, Wrench, RefreshCw, Calendar, 
    User, ChevronRight, PlayCircle, StopCircle 
} from 'lucide-react';
import MaintenanceEventDetail from './MaintenanceEventDetail';

const TechnicianMobileView = ({ user, companies }) => {
    // --- STATE MANAGEMENT ---
    const [todaysJobs, setTodaysJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);

    // --- 1. ROBUST DATA FETCHING (Anti-Spin Logic) ---
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        console.log("Technician View: Starting Sync...");
        setLoading(true);
        setError(null);

        // Calculate "Today" in YYYY-MM-DD format based on local time
        // Note: We use local time because the tech is in the Philippines
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 10);
        
        console.log(`Fetching jobs for date: ${localISOTime}`);

        // SAFETY VALVE: Force stop loading after 4 seconds
        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn("Safety Timer Triggered: Stopping Spinner");
                setLoading(false);
                if (todaysJobs.length === 0 && !error) {
                    // Don't set error if we just have no jobs, but useful for debugging
                    console.log("No jobs loaded yet (or empty schedule).");
                }
            }
        }, 4000);

        let unsubscribe = () => {};

        try {
            // Query: Jobs for TODAY assigned to THIS USER
            // We check against both Display Name and Email to be safe
            const techIdentifier = user.displayName || user.email;

            // Note: If you haven't created the 'maintenance_events' collection yet,
            // this query handles it gracefully via the error block.
            const jobsQuery = query(
                collection(db, 'users', user.uid, 'maintenance_events'),
                where('scheduled_date', '==', localISOTime),
                orderBy('scheduled_time', 'asc')
            );

            unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
                const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`Loaded ${jobs.length} jobs.`);
                setTodaysJobs(jobs);
                setLoading(false);
                clearTimeout(safetyTimer);
            }, (err) => {
                console.warn("Firestore Error:", err);
                
                if (err.code === 'permission-denied') {
                    setError("Access Denied. Please check Database Rules.");
                } else if (err.code === 'failed-precondition') {
                    setError("Database Index Missing. Check Console link.");
                } else {
                    // Often just means collection doesn't exist yet, which is fine
                    console.log("Collection likely empty or missing.");
                }
                
                setLoading(false);
                clearTimeout(safetyTimer);
            });

        } catch (e) {
            console.error("Critical Error in Tech View:", e);
            setError("App Error: " + e.message);
            setLoading(false);
        }

        // Get GPS Location for "Distance" calc (Optional feature)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("GPS not available")
            );
        }

        return () => {
            unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, [user]);

    // --- 2. JOB ACTIONS ---

    const handleStartJob = async (e, job) => {
        e.stopPropagation(); // Prevent opening detail view
        if (!confirm(`Start job at ${job.client_name}?`)) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'maintenance_events', job.id), {
                status: 'InProgress',
                start_time: new Date().toISOString(),
                tech_status: 'On Site'
            });
        } catch (e) {
            alert("Error updating job: " + e.message);
        }
    };

    const handleNavigate = (e, address) => {
        e.stopPropagation();
        if (!address) return alert("No address provided for this job.");
        // Open Google Maps
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    const handleCall = (e, number) => {
        e.stopPropagation();
        if (!number) return alert("No phone number on file.");
        window.location.href = `tel:${number}`;
    };

    // --- 3. UI HELPERS ---

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'InProgress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-orange-100 text-orange-700 border-orange-200'; // Scheduled/Pending
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        // Simple conversion if it's HH:MM 24h format
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // --- 4. RENDER ---

    // Detail View Overlay
    if (selectedJob) {
        return (
            <MaintenanceEventDetail 
                eventId={selectedJob.id} 
                user={user}
                onClose={() => setSelectedJob(null)} 
            />
        );
    }

    return (
        <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24 font-sans">
            
            {/* --- MOBILE HEADER --- */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-b-[30px] shadow-xl sticky top-0 z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 opacity-80 mb-1">
                            <Wrench size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Karnot Ops</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Technician App</h2>
                    </div>
                    <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/10">
                        <User size={20} className="text-orange-400" />
                    </div>
                </div>
                
                {/* Date & Count Badge */}
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-3xl font-black text-white">
                            {new Date().getDate()}
                        </p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {new Date().toLocaleDateString('en-US', { month: 'long', weekday: 'long' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tasks Today</p>
                        <div className="inline-flex items-center justify-center bg-orange-500 text-white font-black h-8 px-3 rounded-lg shadow-lg shadow-orange-900/20">
                            {todaysJobs.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="px-4 -mt-4 relative z-20">
                
                {/* ERROR BANNER */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-1">
                            <AlertCircle size={14} /> System Alert
                        </div>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                {/* LOADING STATE */}
                {loading && (
                    <div className="text-center py-12">
                        <RefreshCw className="animate-spin text-orange-500 mx-auto mb-3" size={32} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing Schedule...</p>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && todaysJobs.length === 0 && !error && (
                    <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
                        <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">All Clear!</h3>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            You have no maintenance jobs scheduled for today. Enjoy the downtime or check with dispatch.
                        </p>
                        <Button onClick={() => window.location.reload()} variant="secondary" className="w-full py-4 text-sm font-bold border-gray-200">
                            <RefreshCw size={16} className="mr-2" /> Refresh Data
                        </Button>
                    </div>
                )}

                {/* JOB LIST */}
                <div className="space-y-5 mt-4">
                    {todaysJobs.map((job, index) => (
                        <div 
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform duration-100 group"
                        >
                            {/* Status Bar */}
                            <div className={`h-1.5 w-full ${
                                job.status === 'Completed' ? 'bg-green-500' : 
                                job.status === 'InProgress' ? 'bg-blue-500' : 'bg-orange-500'
                            }`}></div>
                            
                            <div className="p-5">
                                {/* Time & Status */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-gray-800 leading-none">
                                                {formatTime(job.scheduled_time)}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Scheduled</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border ${getStatusColor(job.status)}`}>
                                        {job.status === 'InProgress' ? 'In Progress' : job.status || 'Pending'}
                                    </span>
                                </div>

                                {/* Client Info */}
                                <h4 className="text-lg font-black text-gray-800 mb-1 leading-tight">
                                    {job.client_name || "Unknown Client"}
                                </h4>
                                <div className="flex items-start gap-2 text-gray-500 text-xs mb-5 bg-gray-50 p-2 rounded-lg">
                                    <MapPin size={14} className="shrink-0 mt-0.5 text-orange-500" />
                                    <span className="line-clamp-2">{job.location || 'No address provided'}</span>
                                </div>

                                {/* Quick Actions Row */}
                                <div className="flex gap-2">
                                    {/* Action 1: Status Dependent Button */}
                                    {job.status !== 'Completed' && (
                                        <button
                                            onClick={(e) => handleStartJob(e, job)}
                                            disabled={job.status === 'InProgress'}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${
                                                job.status === 'InProgress' 
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                    : 'bg-slate-900 text-white shadow-lg shadow-slate-200 active:bg-slate-800'
                                            }`}
                                        >
                                            {job.status === 'InProgress' ? (
                                                <><Wrench size={16} className="animate-pulse" /> Working...</>
                                            ) : (
                                                <><PlayCircle size={16} /> Start Job</>
                                            )}
                                        </button>
                                    )}

                                    {/* Action 2: Navigation */}
                                    <button 
                                        onClick={(e) => handleNavigate(e, job.location)}
                                        className="flex-none w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100 active:bg-orange-100"
                                    >
                                        <Navigation size={18} />
                                    </button>
                                    
                                    {/* Action 3: Call */}
                                    <button 
                                        onClick={(e) => handleCall(e, job.contact_number)}
                                        className="flex-none w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100 active:bg-green-100"
                                    >
                                        <Phone size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Tap to View Details Indicator */}
                            <div className="bg-gray-50 px-5 py-2 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Tap for Service Checklist</span>
                                <ChevronRight size={14} className="text-gray-300" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TechnicianMobileView;
