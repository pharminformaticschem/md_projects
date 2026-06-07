// ============================================================
// payment-service.js
// Free/manual payment workflow service for QR/UPI/bank transfer.
// Frontend-only mock service layer.
// Replace mock mail/admin handlers with your backend endpoints.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const paymentStore = {};

    function nowIso() {
        return new Date().toISOString();
    }

    function normalizeEmail(email) {
        return GMX.AuthService && GMX.AuthService.normalizeEmail
            ? GMX.AuthService.normalizeEmail(email)
            : String(email || '').trim().toLowerCase();
    }

    function sanitizeText(value, fallback = '') {
        return String(value || fallback).trim();
    }

    function buildPaymentId(projectId) {
        return `PAY-${sanitizeText(projectId, 'GMX').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20)}-${Date.now().toString(36).toUpperCase()}`;
    }

    function getStatusConstants() {
        return GMX.PAYMENT_STATUS || {
            NOT_STARTED: 'NOT_STARTED',
            AWAITING_PAYMENT: 'AWAITING_PAYMENT',
            USER_MARKED_PAID: 'USER_MARKED_PAID',
            VERIFICATION_PENDING: 'VERIFICATION_PENDING',
            VERIFIED: 'VERIFIED',
            REJECTED: 'REJECTED',
            RETRY_ALLOWED: 'RETRY_ALLOWED',
        };
    }

    function getPaymentConfig() {
        return GMX.PAYMENT_CONFIG || {
            currency: 'INR',
            payeeName: 'Dr. Ravi Rawat',
            upiId: 'your-upi-id@okaxis',
            upiQrImage: 'assets/images/upi-qr.png',
            bankAccountName: 'Dr. Ravi Rawat',
            bankAccountNumber: 'XXXXXXXXXXXX',
            bankIfsc: 'XXXX0000000',
            bankName: 'Your Bank Name',
            adminEmail: GMX.CONTACT ? GMX.CONTACT.email : '',
        };
    }

    function ensurePaymentRecord(projectId, seed = {}) {
        if (!paymentStore[projectId]) {
            const status = getStatusConstants();
            paymentStore[projectId] = {
                projectId,
                paymentId: buildPaymentId(projectId),
                amountInr: seed.amountInr || 0,
                currency: seed.currency || getPaymentConfig().currency,
                payerEmail: normalizeEmail(seed.payerEmail || ''),
                payerName: seed.payerName || '',
                method: seed.method || 'UPI_QR',
                status: status.AWAITING_PAYMENT,
                userMarkedPaid: false,
                verificationNote: '',
                utr: '',
                screenshotName: '',
                attempts: [],
                createdAt: nowIso(),
                updatedAt: nowIso(),
                verifiedAt: null,
                rejectedAt: null,
                adminActionBy: '',
            };
        }
        return paymentStore[projectId];
    }

    async function mockNotifyAdmin(record, action) {
        await new Promise(resolve => setTimeout(resolve, 350));
        console.info('[GMX PAYMENT] Admin email mock:', action, record);
        return {
            ok: true,
            action,
            sentTo: getPaymentConfig().adminEmail,
        };
    }

    function buildPaymentInstructions(projectId, amountInr) {
        const cfg = getPaymentConfig();
        return {
            methodPrimary: 'UPI_QR',
            methodFallback: 'BANK_TRANSFER',
            payeeName: cfg.payeeName,
            amountInr,
            currency: cfg.currency,
            upiId: cfg.upiId,
            upiQrImage: cfg.upiQrImage,
            bankName: cfg.bankName,
            bankAccountName: cfg.bankAccountName,
            bankAccountNumber: cfg.bankAccountNumber,
            bankIfsc: cfg.bankIfsc,
            paymentReference: projectId,
            note: `Use project reference ${projectId} while paying so the transfer can be matched quickly.`,
        };
    }

    GMX.PaymentService = {
        async initPayment(projectId, payload = {}) {
            await new Promise(resolve => setTimeout(resolve, 250));
            const record = ensurePaymentRecord(projectId, payload);
            record.amountInr = Number(payload.amountInr || record.amountInr || 0);
            record.payerEmail = normalizeEmail(payload.payerEmail || record.payerEmail);
            record.payerName = sanitizeText(payload.payerName || record.payerName);
            record.method = sanitizeText(payload.method || record.method || 'UPI_QR');
            record.updatedAt = nowIso();

            return {
                ok: true,
                payment: { ...record },
                instructions: buildPaymentInstructions(projectId, record.amountInr),
                message: 'Payment initialized. Awaiting user transfer.',
            };
        },

        async getPayment(projectId) {
            await new Promise(resolve => setTimeout(resolve, 150));
            const record = paymentStore[projectId];
            if (!record) {
                return { ok: false, reason: 'PAYMENT_NOT_FOUND', message: 'No payment session found.' };
            }
            return {
                ok: true,
                payment: { ...record },
                instructions: buildPaymentInstructions(projectId, record.amountInr),
            };
        },

        async markPaid(projectId, payload = {}) {
            const status = getStatusConstants();
            const record = ensurePaymentRecord(projectId, payload);
            await new Promise(resolve => setTimeout(resolve, 300));

            const attempt = {
                attemptId: `ATT-${Date.now().toString(36).toUpperCase()}`,
                markedAt: nowIso(),
                method: sanitizeText(payload.method || record.method || 'UPI_QR'),
                utr: sanitizeText(payload.utr),
                screenshotName: sanitizeText(payload.screenshotName),
                note: sanitizeText(payload.note),
                amountInr: Number(payload.amountInr || record.amountInr || 0),
                payerEmail: normalizeEmail(payload.payerEmail || record.payerEmail),
                payerName: sanitizeText(payload.payerName || record.payerName),
            };

            record.userMarkedPaid = true;
            record.status = status.VERIFICATION_PENDING;
            record.method = attempt.method;
            record.utr = attempt.utr;
            record.screenshotName = attempt.screenshotName;
            record.amountInr = attempt.amountInr;
            record.payerEmail = attempt.payerEmail;
            record.payerName = attempt.payerName;
            record.verificationNote = attempt.note;
            record.attempts.push(attempt);
            record.updatedAt = nowIso();

            await mockNotifyAdmin(record, 'USER_MARKED_PAID');

            return {
                ok: true,
                payment: { ...record },
                latestAttempt: attempt,
                message: 'Payment marked by user. Verification pending admin approval.',
            };
        },

        async allowRetry(projectId, reason = '') {
            const status = getStatusConstants();
            const record = paymentStore[projectId];
            if (!record) {
                return { ok: false, reason: 'PAYMENT_NOT_FOUND', message: 'No payment session found.' };
            }
            await new Promise(resolve => setTimeout(resolve, 200));

            record.status = status.AWAITING_PAYMENT;
            record.userMarkedPaid = false;
            record.verificationNote = sanitizeText(reason, 'Retry enabled. Previous payment mark cleared.');
            record.updatedAt = nowIso();

            return {
                ok: true,
                payment: { ...record },
                message: 'User may attempt payment again.',
            };
        },

        async approvePayment(projectId, adminPayload = {}) {
            const status = getStatusConstants();
            const record = paymentStore[projectId];
            if (!record) {
                return { ok: false, reason: 'PAYMENT_NOT_FOUND', message: 'No payment session found.' };
            }
            await new Promise(resolve => setTimeout(resolve, 250));

            record.status = status.VERIFIED;
            record.verifiedAt = nowIso();
            record.updatedAt = nowIso();
            record.adminActionBy = sanitizeText(adminPayload.admin || 'admin');
            record.verificationNote = sanitizeText(adminPayload.note, 'Payment verified manually.');

            await mockNotifyAdmin(record, 'PAYMENT_APPROVED');

            return {
                ok: true,
                payment: { ...record },
                message: 'Payment approved successfully.',
            };
        },

        async rejectPayment(projectId, adminPayload = {}) {
            const status = getStatusConstants();
            const record = paymentStore[projectId];
            if (!record) {
                return { ok: false, reason: 'PAYMENT_NOT_FOUND', message: 'No payment session found.' };
            }
            await new Promise(resolve => setTimeout(resolve, 250));

            record.status = status.REJECTED;
            record.rejectedAt = nowIso();
            record.updatedAt = nowIso();
            record.adminActionBy = sanitizeText(adminPayload.admin || 'admin');
            record.verificationNote = sanitizeText(adminPayload.note, 'Payment could not be matched. Please retry.');

            await mockNotifyAdmin(record, 'PAYMENT_REJECTED');

            return {
                ok: true,
                payment: { ...record },
                message: 'Payment rejected. User can be asked to retry.',
            };
        },

        async getDisplayState(projectId) {
            const record = paymentStore[projectId];
            if (!record) {
                return {
                    ok: true,
                    status: getStatusConstants().NOT_STARTED,
                    canRetry: false,
                    canApprove: false,
                    canMarkPaid: true,
                };
            }

            const status = record.status;
            return {
                ok: true,
                status,
                canRetry: [getStatusConstants().AWAITING_PAYMENT, getStatusConstants().REJECTED].includes(status),
                canApprove: status === getStatusConstants().VERIFICATION_PENDING,
                canMarkPaid: [getStatusConstants().AWAITING_PAYMENT, getStatusConstants().REJECTED].includes(status),
                payment: { ...record },
            };
        },
    };

    console.log('[GMX] payment-service.js loaded ✔');
})();
