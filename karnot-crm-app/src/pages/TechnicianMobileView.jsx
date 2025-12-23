import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Button } from '../data/constants';
import { MapPin, Clock, CheckCircle, Phone, Navigation, AlertCircle, Wrench } from 'lucide-react';
import MaintenanceEventDetail from './MaintenanceEventDetail';

const TechnicianMobileView = ({ user, companies }) => {
    const [todaysJobs, setTodaysJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // list, detail
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        
        // Query for today's maintenance events assigned to this tech
        const jobsQuery = query(
            collection(db, 'maintenance_events'),
            where('scheduled_date', '==', today),
            where('assigned_tech', '==', user?.displayName || user?.email),
            orderBy('scheduled_time', 'asc')
        );

        const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTodaysJobs(jobs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleStartJob = async (jobId) => {
        try {
            await updateDoc(doc(db, 'maintenance_events', jobId), {
                status: 'InProgress',
                start_time: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error starting job:', error);
            alert('Error starting job: ' + error.message);
        }
    };

    const handleOpenNavigation = (address) => {
        const encodedAddress = encodeURIComponent(address);
        // Open Google Maps in new tab
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    };

    const getClientName = (clientRef) => {
        const company = companies.find(c => c.id === clientRef);
        return company?.name || 'Unknown Client';
    };

    const getJobStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 border-green-500 text-green-700';
            case 'InProgress': return 'bg-blue-100 border-blue-500 text-blue-700';
            case 'Pending': return 'bg-gray-100 border-gray-400 text-gray-700';
            case 'Cancelled': return 'bg-red-100 border-red-500 text-red-700';
            default: return 'bg-gray-100 border-gray-400 text-gray-700';
        }
    };

    const getJobStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle size={20} className="text-green-600" />;
            case 'InProgress': return <Wrench size={20} className="text-blue-600 animate-pulse" />;
            case 'Pending': return <Clock size={20} className="text-gray-400" />;
            default: return <AlertCircle size={20} className="text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Wrench size={48} className="mx-auto text-gray-400 mb-4 animate-spin" />
                    <p className="text-gray-500 font-bold">Loading today's schedule...</p>
                </div>
            </div>
        );
    }

    if (viewMode === 'detail' && selectedJob) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-4 z-10">
                    <Button onClick={() => setViewMode('list')} variant="secondary">
                        ← Back to Jobs
                    </Button>
                </div>
                <MaintenanceEventDetail
                    eventId={selectedJob.id}
                    onClose={() => setViewMode('list')}
                    user={user}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 z-10 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-black uppercase mb-1">Today's Schedule</h1>
                    <p className="text-orange-100 text-sm font-bold">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="mt-4 flex gap-3">
                        <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                            <div className="text-2xl font-black">{todaysJobs.length}</div>
                            <div className="text-xs uppercase font-bold">Total Jobs</div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                            <div className="text-2xl font-black">
                                {todaysJobs.filter(j => j.status === 'Completed').length}
                            </div>
                            <div className="text-xs uppercase font-bold">Completed</div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                            <div className="text-2xl font-black">
                                {todaysJobs.filter(j => j.status === 'InProgress').length}
                            </div>
                            <div className="text-xs uppercase font-bold">In Progress</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {todaysJobs.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <CheckCircle size={64} className="mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-black text-gray-400 uppercase mb-2">No Jobs Scheduled</h2>
                        <p className="text-gray-500 text-sm">Enjoy your day off or check back later for updates</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {todaysJobs.map(job => (
                            <div
                                key={job.id}
                                className={`bg-white border-2 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow ${
                                    getJobStatusColor(job.status)
                                }`}
                            >
                                {/* Job Header */}
                                <div className="p-4 border-b border-gray-200">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {getJobStatusIcon(job.status)}
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800">
                                                    {getClientName(job.client_ref)}
                                                </h3>
                                                <p className="text-xs uppercase font-bold text-gray-500 tracking-wide">
                                                    {job.maintenance_type}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-gray-800">
                                                {job.scheduled_time}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase font-bold">
                                                {job.duration_hours}h est.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Job Details */}
                                <div className="p-4 bg-gray-50">
                                    {/* Location */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <MapPin size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-700 font-medium">{job.service_address}</p>
                                            {job.access_notes && (
                                                <p className="text-xs text-gray-500 mt-1 italic">{job.access_notes}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contract Info */}
                                    {job.contract_ref && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                                            <CheckCircle size={14} className="text-green-600" />
                                            <span className="font-bold uppercase">Under Service Contract</span>
                                            {!job.billable && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                    NO CHARGE
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="p-4 bg-white border-t border-gray-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => handleOpenNavigation(job.service_address)}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            <Navigation size={14} className="mr-1" /> Navigate
                                        </Button>
                                        
                                        {job.status === 'Pending' && (
                                            <Button
                                                onClick={() => handleStartJob(job.id)}
                                                variant="primary"
                                                className="text-xs bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Wrench size={14} className="mr-1" /> Start Job
                                            </Button>
                                        )}
                                        
                                        {(job.status === 'InProgress' || job.status === 'Completed') && (
                                            <Button
                                                onClick={() => {
                                                    setSelectedJob(job);
                                                    setViewMode('detail');
                                                }}
                                                variant="primary"
                                                className="text-xs"
                                            >
                                                {job.status === 'Completed' ? (
                                                    <>
                                                        <CheckCircle size={14} className="mr-1" /> View Report
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wrench size={14} className="mr-1" /> Continue
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Status Banner for In Progress */}
                                {job.status === 'InProgress' && (
                                    <div className="bg-blue-600 text-white px-4 py-2 text-center text-xs font-bold uppercase">
                                        🔧 Job in Progress - Started at {new Date(job.start_time).toLocaleTimeString()}
                                    </div>
                                )}

                                {/* Status Banner for Completed */}
                                {job.status === 'Completed' && (
                                    <div className="bg-green-600 text-white px-4 py-2 text-center text-xs font-bold uppercase">
                                        ✓ Completed - {job.completion_data?.labor_hours || 0}h labor time
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicianMobileView;
