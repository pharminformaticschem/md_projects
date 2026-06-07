// ============================================================
// pdb-service.js
// PDB metadata, chain, ligand/cofactor, atom-count and cleanup helper.
// Uses RCSB REST endpoints when available and falls back safely.
// ============================================================

window.GMX = window.GMX || {};

(function () {
    const cache = {};

    function normalizePdbId(pdbId) {
        return String(pdbId || '').trim().toUpperCase();
    }

    function isValidPdbId(pdbId) {
        const clean = normalizePdbId(pdbId);
        return /^[A-Z0-9]{4}$/.test(clean);
    }

    async function fetchJson(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    function classifyNonPolymer(compId, name) {
        const id = String(compId || '').toUpperCase();
        const text = `${id} ${String(name || '').toUpperCase()}`;
        const waterIds = ['HOH', 'WAT', 'DOD'];
        const ionIds = ['NA', 'K', 'CL', 'CA', 'MG', 'ZN', 'MN', 'FE', 'CU', 'CO', 'CD', 'NI', 'IOD', 'BR'];
        if (waterIds.includes(id)) return 'water';
        if (ionIds.includes(id)) return 'ion';
        if (text.includes('COFACTOR') || text.includes('HEME') || text.includes('FAD') || text.includes('FMN') || text.includes('NAD') || text.includes('COENZYME')) return 'cofactor';
        return 'ligand';
    }

    function parseEntrySummary(entry) {
        const info = entry?.rcsb_entry_info || {};
        const polymerEntityCount = info.polymer_entity_count || 0;
        const nonpolymerEntityCount = info.nonpolymer_entity_count || 0;
        const depositedAtomCount = info.deposited_atom_count || 0;
        const resolution = (entry?.rcsb_entry_info?.resolution_combined || [])[0] || null;
        const title = entry?.struct?.title || '';
        const experimentalMethods = (entry?.exptl || []).map(x => x.method).filter(Boolean);

        return {
            title,
            resolution,
            experimentalMethods,
            polymerEntityCount,
            nonpolymerEntityCount,
            depositedAtomCount,
        };
    }

    function buildChainList(polymerEntities) {
        const chains = [];
        (polymerEntities || []).forEach(entity => {
            const description = entity?.rcsb_polymer_entity?.pdbx_description || 'Polymer';
            const entityId = entity?.rcsb_id || '';
            const instances = entity?.polymer_entity_instances || [];
            instances.forEach(instance => {
                const asymId = instance?.rcsb_polymer_entity_instance_container_identifiers?.asym_id || '';
                const authAsymId = instance?.rcsb_polymer_entity_instance_container_identifiers?.auth_asym_id || asymId;
                const chainAtomCount = instance?.rcsb_polymer_entity_instance_feature_summary?.coverage || null;
                chains.push({
                    entityId,
                    asymId,
                    authAsymId,
                    label: `Chain ${authAsymId}`,
                    description,
                    type: entity?.entity_poly?.type || 'polymer',
                    atomEstimate: chainAtomCount,
                    selected: false,
                });
            });
        });
        return chains;
    }

    function buildNonPolymerList(nonPolymerEntities) {
        const rows = [];
        (nonPolymerEntities || []).forEach(entity => {
            const chem = entity?.nonpolymer_comp || {};
            const compId = chem?.chem_comp?.id || entity?.pdbx_entity_nonpoly?.comp_id || '';
            const name = chem?.chem_comp?.name || entity?.pdbx_description || compId;
            const instances = entity?.nonpolymer_entity_instances || [];
            instances.forEach(instance => {
                const authAsymId = instance?.rcsb_nonpolymer_entity_instance_container_identifiers?.auth_asym_id || '';
                rows.push({
                    compId,
                    name,
                    chain: authAsymId,
                    classification: classifyNonPolymer(compId, name),
                });
            });
        });
        return rows;
    }

    function summarizeHetero(nonPolymers) {
        return {
            ligands: nonPolymers.filter(x => x.classification === 'ligand'),
            cofactors: nonPolymers.filter(x => x.classification === 'cofactor'),
            waters: nonPolymers.filter(x => x.classification === 'water'),
            ions: nonPolymers.filter(x => x.classification === 'ion'),
        };
    }

    function estimateSelectedAtomCount(entrySummary, selectedChains = []) {
        const totalAtoms = Number(entrySummary?.depositedAtomCount || 0);
        if (!selectedChains.length || !totalAtoms) return totalAtoms || 0;
        const heuristicPolymerShare = 0.85;
        const estimatedPolymerAtoms = Math.round(totalAtoms * heuristicPolymerShare);
        return Math.round(estimatedPolymerAtoms * (selectedChains.length / Math.max(selectedChains.length, selectedChains.length)));
    }

    GMX.PdbService = {
        normalizePdbId,
        isValidPdbId,

        async lookupSeedLigands(pdbId) {
            const clean = normalizePdbId(pdbId);
            if (GMX.lookupPdbLigand) return GMX.lookupPdbLigand(clean);
            return GMX.PDB_LIGAND_MAP && GMX.PDB_LIGAND_MAP[clean] ? GMX.PDB_LIGAND_MAP[clean] : null;
        },

        async fetchPdbProfile(pdbId) {
            const clean = normalizePdbId(pdbId);
            if (!isValidPdbId(clean)) {
                return { ok: false, reason: 'INVALID_PDB', message: 'PDB ID must be exactly 4 alphanumeric characters.' };
            }
            if (cache[clean]) {
                return { ok: true, cached: true, profile: cache[clean] };
            }

            try {
                const entryUrl = `https://data.rcsb.org/rest/v1/core/entry/${clean}`;
                const polymerUrl = `https://data.rcsb.org/rest/v1/core/polymer_entity/${clean}/1`;
                const entry = await fetchJson(entryUrl);

                const polymerEntities = [];
                const entityIds = entry?.rcsb_entry_container_identifiers?.polymer_entity_ids || [];
                for (const entityId of entityIds) {
                    try {
                        const item = await fetchJson(`https://data.rcsb.org/rest/v1/core/polymer_entity/${clean}/${entityId}`);
                        polymerEntities.push(item);
                    } catch (e) {}
                }

                const nonPolymerEntities = [];
                const nonPolyIds = entry?.rcsb_entry_container_identifiers?.non_polymer_entity_ids || [];
                for (const entityId of nonPolyIds) {
                    try {
                        const item = await fetchJson(`https://data.rcsb.org/rest/v1/core/nonpolymer_entity/${clean}/${entityId}`);
                        nonPolymerEntities.push(item);
                    } catch (e) {}
                }

                const entrySummary = parseEntrySummary(entry);
                const chains = buildChainList(polymerEntities);
                const nonPolymers = buildNonPolymerList(nonPolymerEntities);
                const hetero = summarizeHetero(nonPolymers);
                const seedLigands = await this.lookupSeedLigands(clean);

                const profile = {
                    pdbId: clean,
                    title: entrySummary.title,
                    resolution: entrySummary.resolution,
                    experimentalMethods: entrySummary.experimentalMethods,
                    depositedAtomCount: entrySummary.depositedAtomCount,
                    chains,
                    ligands: hetero.ligands,
                    cofactors: hetero.cofactors,
                    waters: hetero.waters,
                    ions: hetero.ions,
                    seedLigands,
                    displaySummary: {
                        chainCount: chains.length,
                        ligandCount: hetero.ligands.length,
                        cofactorCount: hetero.cofactors.length,
                        waterCount: hetero.waters.length,
                        ionCount: hetero.ions.length,
                    },
                };

                cache[clean] = profile;
                return { ok: true, cached: false, profile };
            } catch (error) {
                const seedLigands = await this.lookupSeedLigands(clean);
                const fallback = {
                    pdbId: clean,
                    title: '',
                    resolution: null,
                    experimentalMethods: [],
                    depositedAtomCount: 0,
                    chains: [],
                    ligands: seedLigands?.ligands ? seedLigands.ligands.map(x => ({ compId: x, name: x, chain: '', classification: 'ligand' })) : [],
                    cofactors: [],
                    waters: [],
                    ions: [],
                    seedLigands,
                    displaySummary: {
                        chainCount: 0,
                        ligandCount: seedLigands?.ligands?.length || 0,
                        cofactorCount: 0,
                        waterCount: 0,
                        ionCount: 0,
                    },
                    fallback: true,
                };
                cache[clean] = fallback;
                return {
                    ok: true,
                    cached: false,
                    profile: fallback,
                    warning: 'Live RCSB metadata unavailable. Seed-only fallback used.',
                };
            }
        },

        async getChainOptions(pdbId) {
            const res = await this.fetchPdbProfile(pdbId);
            if (!res.ok) return res;
            return { ok: true, chains: res.profile.chains };
        },

        async getVisibleHeteroGroups(pdbId) {
            const res = await this.fetchPdbProfile(pdbId);
            if (!res.ok) return res;
            return {
                ok: true,
                ligands: res.profile.ligands,
                cofactors: res.profile.cofactors,
            };
        },

        async buildPreparedSelection(pdbId, selectedChainIds = []) {
            const res = await this.fetchPdbProfile(pdbId);
            if (!res.ok) return res;

            const selectedChains = res.profile.chains.filter(c => selectedChainIds.length ? selectedChainIds.includes(c.authAsymId || c.asymId) : true);
            const estimatedAtomCount = estimateSelectedAtomCount({ depositedAtomCount: res.profile.depositedAtomCount }, selectedChains);

            return {
                ok: true,
                prepared: {
                    pdbId: res.profile.pdbId,
                    selectedChains,
                    visibleLigands: res.profile.ligands,
                    visibleCofactors: res.profile.cofactors,
                    hiddenWaters: res.profile.waters.length,
                    hiddenIons: res.profile.ions.length,
                    estimatedAtomCount,
                    notes: [
                        'Water molecules are hidden by default.',
                        'Simple ions are hidden by default.',
                        'Ligands and cofactors remain visible for pocket planning.',
                    ],
                },
            };
        },
    };

    console.log('[GMX] pdb-service.js loaded ✔');
})();
