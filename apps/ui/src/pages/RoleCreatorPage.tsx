import React from 'react';
import { UnifiedRoleManagerCard } from '../components/UnifiedRoleManagerCard.js';

export const RoleCreatorPage = () => {
    return (
        <div className="w-full h-full bg-zinc-950 p-4">
            {/* We pass a mock cardId for now since this is the standalone page. 
              If this was inside a SwappableCard, the wrapper would provide this ID.
            */}
             <UnifiedRoleManagerCard cardId="standalone-role-creator" />
        </div>
    );
};

export default RoleCreatorPage;
