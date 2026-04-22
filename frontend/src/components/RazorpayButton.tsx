'use client';

import { useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { API_BASE } from '@/config/api';
import { Icon } from '@iconify/react';
import NotificationToast from './NotificationToast';

interface RazorpayButtonProps {
    amount: number; // in INR
    planName: string;
    planCode?: string;
    onSuccess?: () => void;
    className?: string;
    children?: React.ReactNode;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const ensureRazorpayLoaded = (): Promise<void> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window is not available.'));
    }

    if (window.Razorpay) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
        if (existing) {
            const onLoad = () => {
                existing.removeEventListener('load', onLoad);
                existing.removeEventListener('error', onError);
                resolve();
            };
            const onError = () => {
                existing.removeEventListener('load', onLoad);
                existing.removeEventListener('error', onError);
                reject(new Error('Failed to load Razorpay checkout script.'));
            };

            let checks = 0;
            const poll = window.setInterval(() => {
                if (window.Razorpay) {
                    window.clearInterval(poll);
                    resolve();
                    return;
                }
                checks += 1;
                if (checks > 80) {
                    window.clearInterval(poll);
                    reject(new Error('Razorpay checkout script did not initialize in time.'));
                }
            }, 50);

            existing.addEventListener('load', onLoad);
            existing.addEventListener('error', onError);
            return;
        }

        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_SRC;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));

        document.body.appendChild(script);
    });
};

export default function RazorpayButton({
    amount,
    planName,
    planCode = 'pro_monthly',
    onSuccess,
    className,
    children
}: RazorpayButtonProps) {
    const { user, login } = useUser();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const lastFailureKeyRef = useRef<string | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handlePayment = async () => {
        if (!user) {
            showToast("Please sign in to upgrade to Pro!", "info");
            return;
        }

        setLoading(true);

        try {
            await ensureRazorpayLoaded();
            console.log("[RAZORPAY] Starting order creation...");
            // 1. Create Order on Backend
            const orderResponse = await fetch(`${API_BASE}/create-razorpay-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: user.firebase_uid,
                    plan_code: planCode,
                }),
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                throw new Error(errorData.detail || "Failed to create order");
            }

            const orderData = await orderResponse.json();
            console.log("[RAZORPAY] Order Created Successfully:", orderData);

            if (!window.Razorpay) {
                throw new Error("Razorpay script not found! Please check your internet connection and refresh.");
            }

            // 2. Initialize Razorpay Checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Saffron CGPA",
                description: `Upgrade to ${planName}`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    console.log("[RAZORPAY] Payment success, verifying...", response);
                    try {
                        const verifyResponse = await fetch(`${API_BASE}/verify-razorpay-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                firebase_uid: user.firebase_uid,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan_code: planCode,
                            }),
                        });

                        if (verifyResponse.ok) {
                            showToast("Upgrade successful! Welcome to the Pro Club. 🚀", "success");

                            // Refresh context
                            const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/stats/${user.firebase_uid}`);
                            if (statsRes.ok) {
                                const statsData = await statsRes.json();
                                if (login) {
                                    login({
                                        ...user,
                                        is_pro: statsData.stats.is_pro,
                                        referrals_count: statsData.stats.referrals_count,
                                        scan_count: statsData.stats.scan_count
                                    });
                                }
                            }
                            if (onSuccess) onSuccess();
                        } else {
                            const errData = await verifyResponse.json();
                            console.error("[RAZORPAY] Verification 422 Detail:", errData);
                            throw new Error(`Verification failed: ${JSON.stringify(errData)}`);
                        }
                    } catch (err) {
                        console.error("[RAZORPAY] Verification Error:", err);
                        showToast("Transaction successful but verification failed. Please contact support.", "error");
                    }
                },
                prefill: {
                    name: user.name || "",
                    email: user.email || "",
                },
                theme: {
                    color: "#D4500A",
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                        console.log("[RAZORPAY] Checkout modal closed");
                    }
                },
                retry: {
                    enabled: true
                }
            };

            console.log("[RAZORPAY] Final Integration Config:", {
                key_id: options.key,
                order_id: options.order_id,
                amount: options.amount
            });

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response: any) {
                const details = {
                    code: response?.error?.code,
                    description: response?.error?.description,
                    source: response?.error?.source,
                    step: response?.error?.step,
                    reason: response?.error?.reason,
                    order_id: response?.error?.metadata?.order_id,
                    payment_id: response?.error?.metadata?.payment_id,
                };
                const dedupeKey = `${details.payment_id || 'na'}:${details.reason || 'na'}:${details.step || 'na'}`;
                if (lastFailureKeyRef.current === dedupeKey) {
                    return;
                }
                lastFailureKeyRef.current = dedupeKey;

                const serialized = JSON.stringify(details);
                const isUserCancelled =
                    details.reason === 'payment_cancelled' ||
                    details.code === 'BAD_REQUEST_ERROR' && details.step === 'payment_authentication';

                if (isUserCancelled) {
                    console.warn(`[RAZORPAY] Modal Cancel Detail: ${serialized}`);
                    showToast('Payment was cancelled.', 'info');
                    return;
                }

                console.error(`[RAZORPAY] Modal Error Detail: ${serialized}`);
                showToast(`Payment failed: ${details.description || 'Unknown error'}`, "error");
            });

            rzp.open();
        } catch (error: any) {
            console.error("[RAZORPAY] Integration Error:", error);
            showToast(error.message || "Something went wrong. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handlePayment}
                disabled={loading}
                className={className}
            >
                {loading ? (
                    <Icon icon="solar:refresh-bold-duotone" className="w-5 h-5 animate-spin" />
                ) : (
                    children || `Unlock ${planName}`
                )}
            </button>

            <NotificationToast
                isVisible={!!toast}
                message={toast?.message || ''}
                type={toast?.type || 'info'}
                onClose={() => setToast(null)}
            />
        </>
    );
}
