'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type UserData = {
    id: string; // This is the Firebase UID (string) used for API routes
    db_id?: number; // This is the PostgreSQL database integer ID
    firebase_uid: string;
    name: string;
    email: string;
    is_pro: boolean;
    streak_count: number;
    badges: string[];
    scan_count: number;
    referral_code?: string;
    referrals_count: number;
    applied_referral_code?: string;
    semestersCalculated?: number[];
} | null;

interface UserContextType {
    user: UserData;
    isDemo: boolean;
    isDemoGPA: boolean;
    homeData: any;
    subjectsData: any;
    login: (userData: UserData) => void;
    logout: () => void;
    startDemo: (gpaOnly?: boolean) => void;
    setHomeData: (data: any) => void;
    setSubjectsData: (data: any) => void;
    setStats: (stats: Partial<UserData>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData>(null);
    const [isDemo, setIsDemo] = useState<boolean>(false);
    const [isDemoGPA, setIsDemoGPA] = useState<boolean>(false);
    const [homeData, setHomeData] = useState<any>(null);
    const [subjectsData, setSubjectsData] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('user_data');
            if (saved) {
                try {
                    setUser(JSON.parse(saved));
                } catch (e) {
                    localStorage.removeItem('user_data');
                }
            }
        }
    }, []);

    const login = (userData: UserData) => {
        // Clear previous user's cached data to prevent cross-account leakage
        const previousUser = user;
        if (previousUser && userData && previousUser.id !== userData.id) {
            setHomeData(null);
            setSubjectsData(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('saffron_cgpa_reports');
                localStorage.removeItem('cgpa_intel_badges');
            }
        }
        setUser(userData);
        setIsDemo(false);
        setIsDemoGPA(false);
        if (typeof window !== 'undefined' && userData) {
            localStorage.setItem('user_data', JSON.stringify(userData));
        }
    };

    const logout = () => {
        setUser(null);
        setIsDemo(false);
        setIsDemoGPA(false);
        setHomeData(null);
        setSubjectsData(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user_data');
            localStorage.removeItem('saffron_cgpa_reports');
            localStorage.removeItem('cgpa_intel_badges');
        }
    };

    const startDemo = (gpaOnly: boolean = false) => {
        setIsDemo(true);
        setIsDemoGPA(gpaOnly);
        setUser(null);
        setHomeData(null);
        setSubjectsData(null);
    };

    const setStats = (stats: Partial<UserData>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...stats };
            if (typeof window !== 'undefined') {
                localStorage.setItem('user_data', JSON.stringify(updated));
            }
            return updated;
        });
    };

    return (
        <UserContext.Provider value={{
            user,
            isDemo,
            isDemoGPA,
            homeData,
            subjectsData,
            login,
            logout,
            startDemo,
            setHomeData,
            setSubjectsData,
            setStats
        }}>
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
