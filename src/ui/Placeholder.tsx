import React from 'react';
import logo from '../assets/icon.svg';
import { Theme } from '../lib/logseq';

export const Placeholder: React.FC<{ theme: Theme }> = ({ theme }) => (
    <div style={{ color: theme.props.primaryTextColor }} className="p-2 min-h-[50dvh]">
        <img src={logo} alt="Copilot Logo" className="w-24 h-24 mx-auto" />
        <p className="text-center text-sm pt-5">
            <kbd>⏎</kbd> to submit
        </p>
        <p className="text-center text-sm pt-2">
            <kbd>shift+⏎</kbd> for new line
        </p>
    </div>
);
