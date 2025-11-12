// --- 1. 'onOpen' is still a prop
const OpportunityCard = ({ opp, onUpdate, onDelete, onEdit, onOpen }) => {
    const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
    const nextStage = STAGE_ORDER[currentStageIndex + 1];

    const handleMoveForward = () => {
        if (nextStage) {
            onUpdate(opp.id, nextStage);
        }
    };
    
    return (
        <Card className="p-4 mb-3 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                
                {/* --- 2. THIS IS THE TEST --- */}
                <h4 
                    className="font-bold text-gray-800 cursor-pointer hover:text-orange-600"
                    onClick={() => alert(`Clicked on: ${opp.customerName}`)}
                >
                    {opp.customerName}
                </h4>

                <div className="flex gap-1">
                {/* ... (rest of your buttons) ... */}
                </div>
            </div>
            {/* ... (rest of your card) ... */}
        </Card>
    );
};
