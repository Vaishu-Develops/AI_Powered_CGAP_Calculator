'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TargetType = 'me' | 'friend';
export type ModeType = 'single_sem' | 'multi_sem';
export type InputMethodType = 'ocr' | 'manual';
export type FlowSourceType = 'fresh' | 'home_quick_add' | 'home_semester_view' | 'home_upload_missing' | 'friend_mode';

interface CalcFlowState {
    target: TargetType | null;
    friendName: string;
    mode: ModeType | null;
    inputMethod: InputMethodType | null;
    source: FlowSourceType;
    preselectedSemester: number | null;
    preselectedSemesters: number[];
}

interface CalcFlowContextType {
    state: CalcFlowState;
    setTarget: (target: TargetType, friendName?: string) => void;
    setMode: (mode: ModeType) => void;
    setInputMethod: (method: InputMethodType) => void;
    setSource: (source: FlowSourceType) => void;
    setPreselectedSemester: (semester: number | null) => void;
    setPreselectedSemesters: (semesters: number[]) => void;
    startQuickAddFromHome: (semester: number) => void;
    startUploadMissingFromHome: (semesters: number[]) => void;
    startFriendMode: () => void;
    resetFlow: () => void;
}

const initialState: CalcFlowState = {
    target: null,
    friendName: '',
    mode: null,
    inputMethod: null,
    source: 'fresh',
    preselectedSemester: null,
    preselectedSemesters: [],
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

    const setSource = (source: FlowSourceType) => {
        setState((prev) => ({ ...prev, source }));
    };

    const setPreselectedSemester = (preselectedSemester: number | null) => {
        setState((prev) => ({ ...prev, preselectedSemester }));
    };

    const setPreselectedSemesters = (preselectedSemesters: number[]) => {
        setState((prev) => ({ ...prev, preselectedSemesters }));
    };

    const startQuickAddFromHome = (semester: number) => {
        setState((prev) => ({
            ...prev,
            target: 'me',
            friendName: '',
            mode: 'multi_sem',
            source: 'home_quick_add',
            preselectedSemester: semester,
            preselectedSemesters: [semester],
        }));
    };

    const startUploadMissingFromHome = (semesters: number[]) => {
        setState((prev) => ({
            ...prev,
            target: 'me',
            friendName: '',
            mode: 'multi_sem',
            inputMethod: 'ocr',
            source: 'home_upload_missing',
            preselectedSemester: null,
            preselectedSemesters: [...semesters].sort((a, b) => a - b),
        }));
    };

    const startFriendMode = () => {
        setState((prev) => ({
            ...prev,
            target: 'friend',
            source: 'friend_mode',
            inputMethod: null,
            mode: null,
            preselectedSemester: null,
            preselectedSemesters: [],
        }));
    };

    const resetFlow = () => {
        setState(initialState);
    };

    return (
        <CalcFlowContext.Provider
            value={{
                state,
                setTarget,
                setMode,
                setInputMethod,
                setSource,
                setPreselectedSemester,
                setPreselectedSemesters,
                startQuickAddFromHome,
                startUploadMissingFromHome,
                startFriendMode,
                resetFlow,
            }}
        >
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
