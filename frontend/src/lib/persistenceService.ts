/**
 * Persistence Service for CGPA Intel
 * Bridges localStorage with Neon PostgreSQL backend.
 */
import { API_BASE } from '@/config/api';

export interface SavedReport {
    id?: number;
    semester: number;
    gpa: number;
    cgpa: number;
    regulation: string;
    branch: string;
    total_credits: number;
    subjects: any[];
    created_at?: string;
}

export interface UserStats {
    is_pro: boolean;
    streak_count: number;
    badges: string[];
    scan_count: number;
    referrals_count: number;
    referral_code?: string;
}

// API_BASE is now imported from '@/config/api'

export const persistenceService = {
    /**
     * Get local reports from localStorage
     */
    getLocalReports(): SavedReport[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem('saffron_cgpa_reports');
        return data ? JSON.parse(data) : [];
    },

    /**
     * Get local badges from localStorage
     */
    getLocalBadges(): string[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem('cgpa_intel_badges');
        return data ? JSON.parse(data) : [];
    },

    /**
     * Sync local reports and badges to the backend
     */
    async syncToBackend(firebaseUid: string): Promise<{ synced_reports: number; total_badges: number }> {
        const reports = this.getLocalReports();
        const badges = this.getLocalBadges();

        const res = await fetch(`${API_BASE}/users/sync-local`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firebase_uid: firebaseUid,
                reports: reports,
                badges: badges
            })
        });

        if (!res.ok) throw new Error('Sync failed');
        return res.json();
    },

    /**
     * Save a new report both locally and to backend
     */
    async saveReport(firebaseUid: string | null, report: SavedReport): Promise<void> {
        // Save Locally
        const local = this.getLocalReports();
        // Check for duplicates
        const exists = local.some(r => r.semester === report.semester && r.gpa === report.gpa);
        if (!exists) {
            localStorage.setItem('saffron_cgpa_reports', JSON.stringify([...local, report]));
        }

        // Save to Backend if logged in
        if (firebaseUid) {
            try {
                await fetch(`${API_BASE}/reports/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebase_uid: firebaseUid,
                        ...report
                    })
                });
            } catch (err) {
                console.error('Failed to sync report to backend:', err);
            }
        }
    },

    /**
     * Unlock a badge both locally and in backend
     */
    async unlockBadge(firebaseUid: string | null, badgeId: string): Promise<void> {
        // Save Locally
        const local = this.getLocalBadges();
        if (!local.includes(badgeId)) {
            const next = [...local, badgeId];
            localStorage.setItem('cgpa_intel_badges', JSON.stringify(next));

            // Legacy support for manual keys if needed by existing components
            localStorage.setItem(`saffron_badge_${badgeId}`, 'true');
        }

        // Save to Backend if logged in
        if (firebaseUid) {
            try {
                // We'll use the sync-local endpoint to push the new badge specifically
                await fetch(`${API_BASE}/users/sync-local`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebase_uid: firebaseUid,
                        reports: [],
                        badges: [badgeId]
                    })
                });
            } catch (err) {
                console.error('Failed to sync badge to backend:', err);
            }
        }
    },

    /**
     * Fetch user stats from backend
     */
    async getUserStats(firebaseUid: string): Promise<UserStats> {
        const res = await fetch(`${API_BASE}/users/stats/${firebaseUid}`);
        if (!res.ok) throw new Error('Failed to fetch user stats');
        const data = await res.json();
        return data.stats;
    }
};
