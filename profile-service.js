// ============================================================
// profile-service.js
// Verified-email profile fetch/save helper for GMX workspace.
// Frontend-only mock service layer.
// Replace in-memory calls with your backend/database endpoints.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const memoryProfiles = {};

    function normalizeEmail(email) {
        return GMX.AuthService && GMX.AuthService.normalizeEmail
            ? GMX.AuthService.normalizeEmail(email)
            : String(email || '').trim().toLowerCase();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function defaultProfile(email) {
        return {
            email: normalizeEmail(email),
            fullName: '',
            countryCode: '+91',
            phone: '',
            institution: '',
            designation: '',
            department: '',
            city: '',
            country: 'India',
            projectDefaults: {
                projectTitlePrefix: '',
                preferredDurationNs: 100,
                preferredGridSize: 25,
                preferredPlanId: 'starter',
                includeApoByDefault: false,
            },
            savedAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };
    }

    function sanitizeProfileInput(profile) {
        const p = profile || {};
        return {
            fullName: String(p.fullName || '').trim(),
            countryCode: String(p.countryCode || '+91').trim(),
            phone: String(p.phone || '').trim(),
            institution: String(p.institution || '').trim(),
            designation: String(p.designation || '').trim(),
            department: String(p.department || '').trim(),
            city: String(p.city || '').trim(),
            country: String(p.country || 'India').trim(),
            projectDefaults: {
                projectTitlePrefix: String((p.projectDefaults || {}).projectTitlePrefix || '').trim(),
                preferredDurationNs: parseInt((p.projectDefaults || {}).preferredDurationNs) || 100,
                preferredGridSize: parseInt((p.projectDefaults || {}).preferredGridSize) || 25,
                preferredPlanId: String((p.projectDefaults || {}).preferredPlanId || 'starter').trim(),
                includeApoByDefault: Boolean((p.projectDefaults || {}).includeApoByDefault),
            },
        };
    }

    function ensureVerifiedSession(session, email) {
        const normalized = normalizeEmail(email);
        if (!session || !session.verified || normalizeEmail(session.email) !== normalized) {
            return { ok: false, reason: 'UNVERIFIED_EMAIL', message: 'Verified email session required.' };
        }
        return { ok: true };
    }

    function buildPrefillPayload(profile) {
        return {
            fullName: profile.fullName,
            email: profile.email,
            countryCode: profile.countryCode,
            phone: profile.phone,
            institution: profile.institution,
            designation: profile.designation,
            department: profile.department,
            city: profile.city,
            country: profile.country,
            projectDefaults: { ...profile.projectDefaults },
        };
    }

    GMX.ProfileService = {
        async getProfile(email, session) {
            const normalized = normalizeEmail(email);
            const guard = ensureVerifiedSession(session, normalized);
            if (!guard.ok) return guard;

            await new Promise(resolve => setTimeout(resolve, 350));

            if (!memoryProfiles[normalized]) {
                const created = defaultProfile(normalized);
                memoryProfiles[normalized] = created;
                return {
                    ok: true,
                    found: false,
                    created: true,
                    profile: created,
                    prefill: buildPrefillPayload(created),
                    message: 'New profile shell created for verified email.',
                };
            }

            return {
                ok: true,
                found: true,
                created: false,
                profile: memoryProfiles[normalized],
                prefill: buildPrefillPayload(memoryProfiles[normalized]),
                message: 'Existing profile fetched successfully.',
            };
        },

        async saveProfile(email, session, partialProfile) {
            const normalized = normalizeEmail(email);
            const guard = ensureVerifiedSession(session, normalized);
            if (!guard.ok) return guard;

            await new Promise(resolve => setTimeout(resolve, 400));

            const existing = memoryProfiles[normalized] || defaultProfile(normalized);
            const clean = sanitizeProfileInput(partialProfile);
            const merged = {
                ...existing,
                ...clean,
                email: normalized,
                projectDefaults: {
                    ...existing.projectDefaults,
                    ...clean.projectDefaults,
                },
                savedAt: nowIso(),
                updatedAt: nowIso(),
            };

            memoryProfiles[normalized] = merged;

            return {
                ok: true,
                saved: true,
                profile: merged,
                prefill: buildPrefillPayload(merged),
                message: 'Profile saved successfully.',
            };
        },

        async patchProjectDefaults(email, session, defaultsPatch) {
            const normalized = normalizeEmail(email);
            const guard = ensureVerifiedSession(session, normalized);
            if (!guard.ok) return guard;

            const existing = memoryProfiles[normalized] || defaultProfile(normalized);
            const merged = {
                ...existing,
                email: normalized,
                projectDefaults: {
                    ...existing.projectDefaults,
                    ...sanitizeProfileInput({ projectDefaults: defaultsPatch }).projectDefaults,
                },
                savedAt: nowIso(),
                updatedAt: nowIso(),
            };
            memoryProfiles[normalized] = merged;

            return {
                ok: true,
                saved: true,
                profile: merged,
                prefill: buildPrefillPayload(merged),
                message: 'Project defaults updated successfully.',
            };
        },

        async profileExists(email, session) {
            const normalized = normalizeEmail(email);
            const guard = ensureVerifiedSession(session, normalized);
            if (!guard.ok) return guard;

            return {
                ok: true,
                exists: Boolean(memoryProfiles[normalized]),
                email: normalized,
            };
        },

        async deleteProfile(email, session) {
            const normalized = normalizeEmail(email);
            const guard = ensureVerifiedSession(session, normalized);
            if (!guard.ok) return guard;

            const existed = Boolean(memoryProfiles[normalized]);
            delete memoryProfiles[normalized];

            return {
                ok: true,
                deleted: existed,
                email: normalized,
                message: existed ? 'Profile removed.' : 'No profile existed for this email.',
            };
        },

        async debugSeedProfile(email, seedData) {
            const normalized = normalizeEmail(email);
            const seeded = {
                ...defaultProfile(normalized),
                ...sanitizeProfileInput(seedData),
                email: normalized,
                savedAt: nowIso(),
                updatedAt: nowIso(),
            };
            memoryProfiles[normalized] = seeded;
            return { ok: true, profile: seeded };
        },
    };

    console.log('[GMX] profile-service.js loaded ✔');
})();
