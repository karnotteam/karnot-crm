import React from 'react';
import { Button } from '../data/constants.jsx';
import { Calculator, Sun, Droplets, Wind, Zap, Flame, ArrowRight, Snowflake, Target } from 'lucide-react';

const CalculatorsPage = ({ setActiveView }) => {
    const tools = [
        {
            id: 'heatPumpCalc',
            title: 'Heat Pump ROI',
            description: 'Calculate savings, payback period, and CO2 reduction for Heat Pump vs. LPG/Diesel.',
            icon: <Calculator className="text-orange-600" size={32} />,
            status: 'Ready'
        },
        {
            id: 'warmRoomCalc',
            title: 'Warm Room Heating',
            description: 'Industrial heat pump sizing for temperature-controlled rooms, replacing steam boiler systems.',
            icon: <Flame className="text-red-600" size={32} />,
            status: 'Ready'
        },
        {
            id: 'coldRoomCalc',
            title: 'Cold Room Cooling',
            description: 'Panasonic iCOOL system sizing for refrigerated storage, blast freezing, and cold chain facilities.',
            icon: <Snowflake className="text-blue-600" size={32} />,
            status: 'Ready'
        },
        {
            {
    id: 'rsrhCalc',
    title: 'RSRH Cattle Finishing',
    description: 'Joint venture ROI calculator for HydroGreen fodder production and pre-slaughter cattle conditioning in Philippines.',
    icon: <Target className="text-green-600" size={32} />,
    status: 'Ready',
    badge: 'Philippines'
}
        },
        {
            id: 'poolCalc',
            title: 'Pool Heating',
            description: 'Calculate thermal loss and heat pump sizing for commercial swimming pools.',
            icon: <Droplets className="text-blue-500" size={32} />,
            status: 'Coming Soon'
        },
        {
            id: 'windCalc',
            title: 'Wind Load',
            description: 'Check mounting requirements based on roof type and wind zone.',
            icon: <Wind className="text-gray-500" size={32} />,
            status: 'Coming Soon'
        },
        {
            id: 'elecCalc',
            title: 'Electrical Load',
            description: 'Breaker sizing and wire gauge calculator for installation teams.',
            icon: <Zap className="text-purple-500" size={32} />,
            status: 'Coming Soon'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Engineering Tools</h2>
            <p className="text-gray-500 mb-8">Select a calculator to generate reports for your clients.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <div 
                        key={tool.id} 
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                        <div>
                            <div className="mb-4 p-3 bg-gray-50 rounded-full w-fit">
                                {tool.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{tool.title}</h3>
                            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                                {tool.description}
                            </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                            {tool.status === 'Ready' ? (
                                <Button 
                                    onClick={() => setActiveView(tool.id)} 
                                    className="w-full justify-center"
                                >
                                    Launch Tool <ArrowRight size={16} className="ml-2"/>
                                </Button>
                            ) : (
                                <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                                    In Development
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalculatorsPage;
