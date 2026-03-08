'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TargetType = 'me' | 'friend';
export type ModeType = 'single_sem' | 'multi_sem';
export type InputMethodType = 'ocr' | 'manual';

interface CalcFlowState {
    target: TargetType | null;
    friendName: string;
    mode: ModeType | null;
    inputMethod: InputMethodType | null;
}

interface CalcFlowContextType {
    state: CalcFlowState;
    setTarget: (target: TargetType, friendName?: string) => void;
    setMode: (mode: ModeType) => void;
    setInputMethod: (method: InputMethodType) => void;
    resetFlow: () => void;
}

const initialState: CalcFlowState = {
    target: null,
    friendName: '',
    mode: null,
    inputMethod: null,
};

const CalcFlowContext = createContext<CalcFlowContextType | undefined>(undefined);

export function CalcFlowProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CalcFlowState>(initialState);

    const setTarget = (target: TargetType, friendName = '') => {
        setState((prev) => ({ ...prev, target, friendName }));
    };

    const setMode = (mode: ModeType) => {
        setState((prev) => ({ ...prev, mode }));
    };

    const setInputMethod = (inputMethod: InputMethodType) => {
        setState((prev) => ({ ...prev, inputMethod }));
    };

    const resetFlow = () => {
        setState(initialState);
    };

    return (
        <CalcFlowContext.Provider value={{ state, setTarget, setMode, setInputMethod, resetFlow }}>
            {children}
        </CalcFlowContext.Provider>
    );
}

export function useCalcFlow() {
    const context = useContext(CalcFlowContext);
    if (context === undefined) {
        throw new Error('useCalcFlow must be used within a CalcFlowProvider');
    }
    return context;
}
