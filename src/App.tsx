import React, { useEffect } from 'react';
import "@logseq/libs";

export const App: React.FC = () => {
    useEffect(() => {
        console.log("Plugin rerendered");
    }, []);

    return (
        <div>
            Hello Logseq!!!!
        </div>
    );
};
