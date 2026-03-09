'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserData = {
    id: string;
    name: string;
    email: string;
    semestersCalculated?: number[]; // Array of semester numbers they have calculated 
} | null;

interface UserContextType {
    user: UserData;
    isDemo: boolean;
    login: (userData: UserData) => void;
    logout: () => void;
    startDemo: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData>(null);
    const [isDemo, setIsDemo] = useState<boolean>(false);

    const login = (userData: UserData) => {
        setUser(userData);
        setIsDemo(false);
    };

    const logout = () => {
        setUser(null);
        setIsDemo(false);
    };

    const startDemo = () => {
        setIsDemo(true);
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, isDemo, login, logout, startDemo }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
