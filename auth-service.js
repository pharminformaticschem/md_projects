// ============================================================
// auth-service.js
// Email-first authentication/session helper for GMX workspace.
// Frontend-only demo/service contract layer.
// Replace the mock API handlers with your backend endpoints.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const SESSION_TTL_DAYS = 180;
    const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

    const memoryStore = {
        session: null,
        otpRequests: {},
    };

    function nowIso() {
        return new Date().toISOString();
    }

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
    }

    function generateOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    function generateSessionToken(email) {
        const safe = normalizeEmail(email).replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
        return `GMX-${safe}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    function getSessionCache() {
        if (memoryStore.session) return memoryStore.session;
        return null;
    }

    function setSessionCache(sessionObj) {
        memoryStore.session = sessionObj;
        return sessionObj;
    }

    function clearSessionCache() {
        memoryStore.session = null;
    }

    function isSessionFresh(sessionObj) {
        if (!sessionObj || !sessionObj.expiresAt) return false;
        return new Date(sessionObj.expiresAt).getTime() > Date.now();
    }

    function buildSession(email) {
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
        return {
            email: normalizeEmail(email),
            token: generateSessionToken(email),
            verified: true,
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            rememberDays: SESSION_TTL_DAYS,
            source: 'cache',
        };
    }

    async function mockSendOtpEmail(email, otpCode) {
        await new Promise(resolve => setTimeout(resolve, 600));
        console.info('[GMX AUTH] Mock OTP sent to', email, 'OTP:', otpCode);
        return {
            ok: true,
            delivery: 'email',
            maskedEmail: maskEmail(email),
            message: 'OTP dispatched successfully.',
        };
    }

    function maskEmail(email) {
        const normalized = normalizeEmail(email);
        const [user, domain] = normalized.split('@');
        if (!user || !domain) return normalized;
        const maskedUser = user.length <= 2 ? `${user[0] || '*'}*` : `${user.slice(0, 2)}***`;
        return `${maskedUser}@${domain}`;
    }

    GMX.AuthService = {
        SESSION_TTL_DAYS,

        normalizeEmail,
        isValidEmail,
        maskEmail,

        async bootstrapSession() {
            const cached = getSessionCache();
            if (!cached) {
                return { ok: false, restored: false, reason: 'NO_CACHED_SESSION' };
            }
            if (!isSessionFresh(cached)) {
                clearSessionCache();
                return { ok: false, restored: false, reason: 'SESSION_EXPIRED' };
            }
            return {
                ok: true,
                restored: true,
                reason: 'SESSION_RESTORED',
                session: { ...cached, source: 'cache' },
            };
        },

        async requestOtp(email) {
            const normalized = normalizeEmail(email);

            if (!isValidEmail(normalized)) {
                return { ok: false, reason: 'INVALID_EMAIL', message: 'Please enter a valid email address.' };
            }

            const cached = getSessionCache();
            if (cached && cached.email === normalized && isSessionFresh(cached)) {
                return {
                    ok: true,
                    skipped: true,
                    reason: 'ACTIVE_SESSION_EXISTS',
                    session: { ...cached, source: 'cache' },
                    message: 'Existing verified session restored.',
                };
            }

            const otpCode = generateOtp();
            const requestId = `OTP-${Date.now().toString(36).toUpperCase()}`;
            memoryStore.otpRequests[normalized] = {
                requestId,
                otpCode,
                attempts: 0,
                createdAt: nowIso(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                verified: false,
            };

            const delivery = await mockSendOtpEmail(normalized, otpCode);
            return {
                ok: true,
                skipped: false,
                reason: 'OTP_SENT',
                requestId,
                maskedEmail: delivery.maskedEmail,
                expiresAt: memoryStore.otpRequests[normalized].expiresAt,
                message: 'Verification code sent to email.',
            };
        },

        async verifyOtp(email, otpInput) {
            const normalized = normalizeEmail(email);
            const record = memoryStore.otpRequests[normalized];

            if (!record) {
                return { ok: false, reason: 'OTP_NOT_REQUESTED', message: 'Please request an OTP first.' };
            }

            if (new Date(record.expiresAt).getTime() <= Date.now()) {
                delete memoryStore.otpRequests[normalized];
                return { ok: false, reason: 'OTP_EXPIRED', message: 'OTP expired. Please request a new code.' };
            }

            record.attempts += 1;
            if (String(otpInput).trim() !== record.otpCode) {
                return {
                    ok: false,
                    reason: 'OTP_INVALID',
                    attempts: record.attempts,
                    message: 'Incorrect OTP. Please try again.',
                };
            }

            record.verified = true;
            const session = buildSession(normalized);
            setSessionCache(session);

            return {
                ok: true,
                reason: 'OTP_VERIFIED',
                session,
                message: 'Email verified successfully.',
            };
        },

        async resendOtp(email) {
            const normalized = normalizeEmail(email);
            delete memoryStore.otpRequests[normalized];
            return this.requestOtp(normalized);
        },

        async verifyOrRestore(email) {
            const normalized = normalizeEmail(email);
            const cached = getSessionCache();

            if (cached && cached.email === normalized && isSessionFresh(cached)) {
                return {
                    ok: true,
                    restored: true,
                    reason: 'SESSION_REUSED',
                    session: { ...cached, source: 'cache' },
                };
            }

            return {
                ok: false,
                restored: false,
                reason: 'OTP_REQUIRED',
                message: 'OTP verification required for this email.',
            };
        },

        async getSessionStatus(email) {
            const normalized = normalizeEmail(email);
            const cached = getSessionCache();
            if (!cached || cached.email !== normalized) {
                return { ok: false, authenticated: false, reason: 'NO_SESSION' };
            }
            if (!isSessionFresh(cached)) {
                clearSessionCache();
                return { ok: false, authenticated: false, reason: 'SESSION_EXPIRED' };
            }
            return { ok: true, authenticated: true, session: cached };
        },

        async logout(email) {
            const normalized = normalizeEmail(email);
            const cached = getSessionCache();
            if (cached && (!normalized || cached.email === normalized)) {
                clearSessionCache();
            }
            return { ok: true, reason: 'LOGGED_OUT' };
        },

        async debugPeekOtp(email) {
            const normalized = normalizeEmail(email);
            const record = memoryStore.otpRequests[normalized];
            return record ? { ok: true, otp: record.otpCode, requestId: record.requestId } : { ok: false };
        },
    };

    console.log('[GMX] auth-service.js loaded ✔');
})();
