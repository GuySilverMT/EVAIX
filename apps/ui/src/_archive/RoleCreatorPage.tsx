import React from 'react';
// Import the new Unified Manager
import { UnifiedRoleManagerCard } from '../components/UnifiedRoleManagerCard.js';

export const RoleCreatorPage = () => {
    return (
        <div className="w-full h-full bg-zinc-950 p-6 flex justify-center items-center">
             <div className="w-full max-w-4xl h-[800px]">
                {/* Mount it standalone */}
                <UnifiedRoleManagerCard cardId="standalone-role-creator" />
             </div>
        </div>
    );
};

export default RoleCreatorPage;
