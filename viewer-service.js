// ============================================================
// viewer-service.js
// Lightweight molecular viewer/grid planner helper.
// Provides state helpers and a minimal NGL-based mount function.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const viewerStore = {};

    function clamp(value, min, max) {
        return Math.min(Math.max(Number(value) || 0, min), max);
    }

    function normalizeChainList(chains) {
        return Array.isArray(chains) ? chains.filter(Boolean).map(String) : [];
    }

    function defaultGrid() {
        return {
            center: { x: 0, y: 0, z: 0 },
            size: { x: 25, y: 25, z: 25 },
            source: 'manual',
            basedOn: '',
        };
    }

    function ensureViewer(projectKey) {
        if (!viewerStore[projectKey]) {
            viewerStore[projectKey] = {
                projectKey,
                pdbId: '',
                selectedChains: [],
                selectedLigand: '',
                selectedCofactor: '',
                grid: defaultGrid(),
                mounted: false,
                containerId: '',
                structureUrl: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }
        return viewerStore[projectKey];
    }

    function guessGridFromLigand(ligandCode) {
        return {
            center: { x: 0, y: 0, z: 0 },
            size: { x: 22, y: 22, z: 22 },
            source: 'ligand-centroid',
            basedOn: ligandCode || '',
        };
    }

    async function ensureNglLoaded() {
        if (window.NGL) return true;
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-ngl-loader="true"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(true), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ngl@2.0.0-dev.39/dist/ngl.js';
            s.defer = true;
            s.dataset.nglLoader = 'true';
            s.onload = () => resolve(true);
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return Boolean(window.NGL);
    }

    GMX.ViewerService = {
        async init(projectKey, payload = {}) {
            const record = ensureViewer(projectKey);
            record.pdbId = String(payload.pdbId || record.pdbId || '').toUpperCase();
            record.selectedChains = normalizeChainList(payload.selectedChains || record.selectedChains);
            record.selectedLigand = String(payload.selectedLigand || record.selectedLigand || '');
            record.selectedCofactor = String(payload.selectedCofactor || record.selectedCofactor || '');
            record.structureUrl = payload.structureUrl || `https://files.rcsb.org/download/${record.pdbId}.pdb`;
            record.updatedAt = new Date().toISOString();
            return { ok: true, viewer: { ...record } };
        },

        async setChains(projectKey, chains) {
            const record = ensureViewer(projectKey);
            record.selectedChains = normalizeChainList(chains);
            record.updatedAt = new Date().toISOString();
            return { ok: true, viewer: { ...record } };
        },

        async setLigandFocus(projectKey, ligandCode) {
            const record = ensureViewer(projectKey);
            record.selectedLigand = String(ligandCode || '');
            record.grid = guessGridFromLigand(record.selectedLigand);
            record.updatedAt = new Date().toISOString();
            return { ok: true, viewer: { ...record } };
        },

        async setManualGrid(projectKey, gridPatch = {}) {
            const record = ensureViewer(projectKey);
            const current = record.grid || defaultGrid();
            record.grid = {
                center: {
                    x: Number(gridPatch.center?.x ?? current.center.x ?? 0),
                    y: Number(gridPatch.center?.y ?? current.center.y ?? 0),
                    z: Number(gridPatch.center?.z ?? current.center.z ?? 0),
                },
                size: {
                    x: clamp(gridPatch.size?.x ?? current.size.x ?? 25, 8, 80),
                    y: clamp(gridPatch.size?.y ?? current.size.y ?? 25, 8, 80),
                    z: clamp(gridPatch.size?.z ?? current.size.z ?? 25, 8, 80),
                },
                source: 'manual',
                basedOn: current.basedOn || '',
            };
            record.updatedAt = new Date().toISOString();
            return { ok: true, viewer: { ...record } };
        },

        async getState(projectKey) {
            const record = ensureViewer(projectKey);
            return { ok: true, viewer: { ...record } };
        },

        async mountNglViewer(projectKey, containerId, options = {}) {
            const record = ensureViewer(projectKey);
            if (!record.pdbId) {
                return { ok: false, reason: 'MISSING_PDB', message: 'Initialize viewer with a PDB ID first.' };
            }

            try {
                await ensureNglLoaded();
            } catch (e) {
                return { ok: false, reason: 'NGL_LOAD_FAILED', message: 'Could not load NGL viewer library.' };
            }

            const container = document.getElementById(containerId);
            if (!container) {
                return { ok: false, reason: 'CONTAINER_NOT_FOUND', message: 'Viewer container not found.' };
            }

            container.innerHTML = '';
            const stage = new window.NGL.Stage(containerId, {
                backgroundColor: options.backgroundColor || '#02050e',
            });

            const structureUrl = record.structureUrl || `https://files.rcsb.org/download/${record.pdbId}.pdb`;
            try {
                const comp = await stage.loadFile(structureUrl, { defaultRepresentation: false });
                const chainSele = record.selectedChains.length ? `:${record.selectedChains.join(' or :')}` : '*';
                comp.addRepresentation('cartoon', { sele: chainSele, colorScheme: 'chainname' });
                if (record.selectedLigand) {
                    comp.addRepresentation('ball+stick', { sele: `[${record.selectedLigand}]`, multipleBond: true });
                }
                if (record.selectedCofactor) {
                    comp.addRepresentation('licorice', { sele: `[${record.selectedCofactor}]` });
                }
                comp.autoView();

                record.mounted = true;
                record.containerId = containerId;
                record.updatedAt = new Date().toISOString();

                return {
                    ok: true,
                    viewer: { ...record },
                    stage,
                    component: comp,
                    message: 'NGL viewer mounted successfully.',
                };
            } catch (e) {
                return { ok: false, reason: 'STRUCTURE_LOAD_FAILED', message: `Failed to load structure for ${record.pdbId}.` };
            }
        },

        buildGridOverlaySpec(projectKey) {
            const record = ensureViewer(projectKey);
            return {
                ok: true,
                grid: { ...record.grid },
                overlayText: `Center (${record.grid.center.x}, ${record.grid.center.y}, ${record.grid.center.z}) | Size (${record.grid.size.x}, ${record.grid.size.y}, ${record.grid.size.z})`,
            };
        },
    };

    console.log('[GMX] viewer-service.js loaded ✔');
})();
