// ============================================================
// PART 1 — globals.js
// Shared state, utility functions, constants, config & data.
// All other parts import from window.GMX.
// To add new features: add config/data/helpers HERE first.
// ============================================================

window.GMX = window.GMX || {};

// ── CONTACT CONFIG ───────────────────────────────────────────
GMX.CONTACT = {
    email: "ravi.med.chem@gmail.com",
    whatsappNumber: "918288992343",
};

// ── DISCOUNT CODES ───────────────────────────────────────────
// auto:true means it is silently pre-applied on load
GMX.DISCOUNTS = {
    "SCHOLAR2026": { pct: 30, label: "Scholar Discount 2026",    auto: true  },
    "PILOT10":     { pct: 10, label: "Pilot Research Offer",     auto: false },
    "COLLAB15":    { pct: 15, label: "Collaboration Partner",    auto: false },
};
GMX.AUTO_DISCOUNT_CODE = "SCHOLAR2026";   // always pre-applied

// ── ATOM-COUNT × DURATION PRICING TABLE (INR) ───────────────
// Rows = atom tiers, Cols = [100ns, 200ns, 500ns, 1000ns]
GMX.PRICING_TABLE = [
    { label: "≤ 5,000",          max: 5000,   prices: [2000,  3000,  6000,  10000] },
    { label: "5,001 – 25,000",   max: 25000,  prices: [3000,  4500,  8000,  14000] },
    { label: "25,001 – 50,000",  max: 50000,  prices: [4000,  6000,  10000, 18000] },
    { label: "50,001 – 100,000", max: 100000, prices: [6000,  8000,  14000, 25000] },
    { label: "100,001 – 250,000",max: 250000, prices: [8000,  12000, 20000, 35000] },
    { label: "> 250,000",        max: Infinity, prices: [null, null,  null,  null]  }, // custom quote
];
GMX.DURATION_COLS = [100, 200, 500, 1000]; // ns values matching price columns

// Get base price for one MD run
GMX.getPricePerRun = function(atomCount, durationNs) {
    const colIdx = GMX.DURATION_COLS.indexOf(durationNs);
    if (colIdx === -1) return null; // unsupported duration
    const atoms = parseInt(atomCount) || 0;
    for (const tier of GMX.PRICING_TABLE) {
        if (atoms <= tier.max) {
            return tier.prices[colIdx]; // null = custom quote
        }
    }
    return null;
};

// Full price calculation: runs × per-run price × discount
GMX.calculatePrice = function(atomCount, durationNs, totalRuns, discountCode) {
    const perRun = GMX.getPricePerRun(atomCount, durationNs);
    if (perRun === null) return { custom: true, inr: null, usd: null, perRun: null };

    // Original (un-discounted) price shown as slashed — inflated 65%
    const originalInr = Math.round(perRun * totalRuns * 1.65 / 100) * 100;
    let discountPct    = 0;
    let appliedCode    = '';

    // Auto-apply SCHOLAR discount first, then override if user supplied one
    const codeToCheck  = (discountCode || GMX.AUTO_DISCOUNT_CODE).toUpperCase();
    if (GMX.DISCOUNTS[codeToCheck]) {
        discountPct = GMX.DISCOUNTS[codeToCheck].pct;
        appliedCode = codeToCheck;
    }
    const discountedInr = Math.round(perRun * totalRuns * (1 - discountPct / 100) / 100) * 100;
    const discountedUsd = Math.round(discountedInr / 84);

    return {
        custom:       false,
        perRun,
        originalInr,
        discountedInr,
        discountedUsd,
        discountPct,
        appliedCode,
        savings:      originalInr - discountedInr,
    };
};

// ── MD JOB PLANS ─────────────────────────────────────────────
// Each plan defines test + control + apoprotein run counts
GMX.MD_PLANS = [
    {
        id: "solo",
        label: "Solo Test",
        badge: "",
        testRuns: 1, controlRuns: 0, apoRuns: 0,
        totalRuns: 1,
        tag: "Minimal — 1 compound only",
        tip: "Best for quick feasibility checks.",
    },
    {
        id: "starter",
        label: "Starter",
        badge: "POPULAR",
        testRuns: 1, controlRuns: 1, apoRuns: 0,
        totalRuns: 2,
        tag: "1 Test + 1 Standard Control",
        tip: "Gold standard comparative analysis.",
    },
    {
        id: "standard",
        label: "Standard",
        badge: "BEST VALUE",
        testRuns: 2, controlRuns: 1, apoRuns: 0,
        totalRuns: 3,
        tag: "2 Test + 1 Standard Control",
        tip: "Compare two leads against one reference.",
    },
    {
        id: "full",
        label: "Full Panel",
        badge: "RECOMMENDED",
        testRuns: 3, controlRuns: 1, apoRuns: 0,
        totalRuns: 4,
        tag: "3 Test + 1 Standard Control",
        tip: "Complete lead-selection panel.",
    },
];

// Apoprotein add-on (no ligand MD run for apo reference)
GMX.APO_ADDON = {
    id: "apo",
    label: "Apoprotein Run",
    extraRuns: 1,
    tip: "MD run with no ligand — reveals intrinsic protein dynamics and serves as a clean baseline for all binding analyses.",
};

// ── TRACKING ID GENERATOR ────────────────────────────────────
// Format: YYYY-MM-DD-NNNNN-TEXT (max 15 chars for text part)
GMX.generateTrackingPrefix = function() {
    const now   = new Date();
    const y     = now.getFullYear();
    const m     = String(now.getMonth() + 1).padStart(2, '0');
    const d     = String(now.getDate()).padStart(2, '0');
    const count = GMX.getNextProjectCount();
    const num   = String(count).padStart(5, '0');
    return `${y}-${m}-${d}-${num}-`;
};

GMX.getNextProjectCount = function() {
    const key   = 'gmx_project_counter';
    // Use in-memory store (no localStorage in sandboxed iframes)
    if (!GMX._projectCounter) GMX._projectCounter = 1;
    else GMX._projectCounter++;
    return GMX._projectCounter;
};

GMX.sanitizeTrackingText = function(raw) {
    // Remove spaces (replace with _), strip special chars except hyphens/underscores, max 15 chars
    return raw.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 15);
};

// ── COUNTRY PHONE CODES ──────────────────────────────────────
GMX.COUNTRY_CODES = [
    { code: "+91",  name: "India",                flag: "🇮🇳" },
    { code: "+1",   name: "USA / Canada",          flag: "🇺🇸" },
    { code: "+44",  name: "United Kingdom",        flag: "🇬🇧" },
    { code: "+61",  name: "Australia",             flag: "🇦🇺" },
    { code: "+49",  name: "Germany",               flag: "🇩🇪" },
    { code: "+33",  name: "France",                flag: "🇫🇷" },
    { code: "+39",  name: "Italy",                 flag: "🇮🇹" },
    { code: "+34",  name: "Spain",                 flag: "🇪🇸" },
    { code: "+31",  name: "Netherlands",           flag: "🇳🇱" },
    { code: "+46",  name: "Sweden",                flag: "🇸🇪" },
    { code: "+47",  name: "Norway",                flag: "🇳🇴" },
    { code: "+45",  name: "Denmark",               flag: "🇩🇰" },
    { code: "+41",  name: "Switzerland",           flag: "🇨🇭" },
    { code: "+43",  name: "Austria",               flag: "🇦🇹" },
    { code: "+32",  name: "Belgium",               flag: "🇧🇪" },
    { code: "+48",  name: "Poland",                flag: "🇵🇱" },
    { code: "+7",   name: "Russia",                flag: "🇷🇺" },
    { code: "+86",  name: "China",                 flag: "🇨🇳" },
    { code: "+81",  name: "Japan",                 flag: "🇯🇵" },
    { code: "+82",  name: "South Korea",           flag: "🇰🇷" },
    { code: "+65",  name: "Singapore",             flag: "🇸🇬" },
    { code: "+60",  name: "Malaysia",              flag: "🇲🇾" },
    { code: "+66",  name: "Thailand",              flag: "🇹🇭" },
    { code: "+84",  name: "Vietnam",               flag: "🇻🇳" },
    { code: "+62",  name: "Indonesia",             flag: "🇮🇩" },
    { code: "+63",  name: "Philippines",           flag: "🇵🇭" },
    { code: "+880", name: "Bangladesh",            flag: "🇧🇩" },
    { code: "+92",  name: "Pakistan",              flag: "🇵🇰" },
    { code: "+94",  name: "Sri Lanka",             flag: "🇱🇰" },
    { code: "+977", name: "Nepal",                 flag: "🇳🇵" },
    { code: "+971",  name: "UAE",                  flag: "🇦🇪" },
    { code: "+966",  name: "Saudi Arabia",         flag: "🇸🇦" },
    { code: "+20",   name: "Egypt",                flag: "🇪🇬" },
    { code: "+27",   name: "South Africa",         flag: "🇿🇦" },
    { code: "+234",  name: "Nigeria",              flag: "🇳🇬" },
    { code: "+254",  name: "Kenya",                flag: "🇰🇪" },
    { code: "+55",   name: "Brazil",               flag: "🇧🇷" },
    { code: "+54",   name: "Argentina",            flag: "🇦🇷" },
    { code: "+52",   name: "Mexico",               flag: "🇲🇽" },
    { code: "+56",   name: "Chile",                flag: "🇨🇱" },
    { code: "+57",   name: "Colombia",             flag: "🇨🇴" },
    { code: "+64",   name: "New Zealand",          flag: "🇳🇿" },
    { code: "+353",  name: "Ireland",              flag: "🇮🇪" },
    { code: "+351",  name: "Portugal",             flag: "🇵🇹" },
    { code: "+30",   name: "Greece",               flag: "🇬🇷" },
    { code: "+90",   name: "Turkey",               flag: "🇹🇷" },
    { code: "+98",   name: "Iran",                 flag: "🇮🇷" },
    { code: "+972",  name: "Israel",               flag: "🇮🇱" },
    { code: "+886",  name: "Taiwan",               flag: "🇹🇼" },
    { code: "+852",  name: "Hong Kong",            flag: "🇭🇰" },
];

// ── PDB → CO-CRYSTALLIZED LIGAND MAP ─────────────────────────
// Common research targets: PDB code → known ligands + grid centroid hints
// Expand this list as needed — used to auto-suggest cavity centroid
GMX.PDB_LIGAND_MAP = {
    // Malaria / Plasmodium
    "1TV5": { ligands: ["DSF"], organism: "P. falciparum DHFR",     hint: "Active site cavity" },
    "2B3Q": { ligands: ["WR9"],  organism: "P. falciparum DHODH",   hint: "Ubiquinone binding site" },
    "1HBP": { ligands: ["FMN"],  organism: "P. falciparum",         hint: "Flavin binding site" },
    // HIV / Antivirals
    "1HSG": { ligands: ["MK1"],  organism: "HIV-1 Protease",        hint: "Catalytic dyad, Asp25-Asp125" },
    "1HVK": { ligands: ["VX"],   organism: "HIV-1 Protease",        hint: "Active site cleft" },
    // COVID-19
    "6LU7": { ligands: ["N3"],   organism: "SARS-CoV-2 Mpro",       hint: "Substrate binding cleft" },
    "7BQY": { ligands: ["JFM"],  organism: "SARS-CoV-2 Mpro",       hint: "Active site" },
    "7L11": { ligands: ["WNL"],  organism: "SARS-CoV-2 RdRp",       hint: "RNA template channel" },
    // Cancer
    "1M17": { ligands: ["SB2"],  organism: "EGFR Kinase",           hint: "ATP binding pocket" },
    "2ITY": { ligands: ["IMA"],  organism: "BCR-ABL Kinase",        hint: "DFG-out inactive conformation" },
    "3ERT": { ligands: ["RAL"],  organism: "Estrogen Receptor α",   hint: "Ligand-binding domain" },
    "2OHB": { ligands: ["STU"],  organism: "CDK2 Kinase",           hint: "Hinge region" },
    // Antibacterial
    "1JIJ": { ligands: ["PIP"],  organism: "P. aeruginosa OprD",    hint: "Outer membrane channel" },
    "3TYG": { ligands: ["ACT"],  organism: "E. coli DNA Gyrase",    hint: "ATP binding site" },
    // Neurological
    "1ACJ": { ligands: ["THA"],  organism: "AChE",                  hint: "Catalytic triad" },
    "4EY7": { ligands: ["DNP"],  organism: "AChE",                  hint: "Peripheral anionic site" },
    // Diabetes
    "1UNK": { ligands: ["GLM"],  organism: "PPAR-γ",                hint: "Ligand binding pocket" },
    "2G9K": { ligands: ["RGZ"],  organism: "PPAR-γ",                hint: "AF-2 helix region" },
};

// Fetch ligand info for a PDB code (returns null if not in map)
GMX.lookupPdbLigand = function(pdbCode) {
    return GMX.PDB_LIGAND_MAP[(pdbCode || '').toUpperCase()] || null;
};

// ── GRID SIZE OPTIONS ────────────────────────────────────────
GMX.GRID_SIZES = [
    { value: 20, label: "20 Å — Tight (known binding site, co-crystal available)" },
    { value: 25, label: "25 Å — Standard (recommended for most targets)"           },
    { value: 30, label: "30 Å — Wide (allosteric / flexible / unknown site)"       },
];

// ── TOOLTIPS ─────────────────────────────────────────────────
GMX.TOOLTIPS = {
    email: "This email establishes your permanent account workspace. All historical and future molecular runs can be retrieved through this single credential link.",
    pdb:   "Accepts standard RCSB PDB codes (4 characters) or extended notation up to 12 characters. Enter your target receptor code and we will auto-check for co-crystallized ligands to define the binding cavity.",
    ligandClass: "Test Ligands are your experimental compounds under investigation. Standard Control is a known reference drug (e.g. the co-crystallized inhibitor) used as a comparative benchmark. Our engine auto-ranks your test ligands against the control.",
    ligandInfo: [
        "📌 Add each ligand structure individually — give it a clear name exactly as you want it to appear in your final report.",
        "✏️  Draw structure — opens the Ketcher molecular editor (recommended, most precise).",
        "🔤  SMILES input — paste a SMILES string directly if you have it.",
        "📁  Upload file — supported formats: .mol2, .sdf, .pdb (one compound per file).",
        "📦  Bulk upload — zip archive of .mol2 files, may need manual QC by our team.",
        "🧪  Test Ligand — your experimental compound.",
        "💊  Standard Control — reference drug for comparison (strongly recommended — submit at least one).",
        "⚗️  Apoprotein job — optional MD run with no ligand; reveals intrinsic receptor dynamics and provides the cleanest baseline for binding energy analysis.",
    ],
    grid: "The docking grid box defines the search space for AutoDock. 20 Å is precise and fast for known cavities. 25 Å is the standard choice. 30 Å is used for flexible loops, allosteric pockets, or when the binding site is uncertain.",
    atomCount: "The number of atoms in your solvated simulation box (protein + water + ions). This determines computational cost. If unsure, use 25,000 as a safe default for a typical ~300-residue protein. Our team will verify and adjust if needed.",
    duration: "Simulation length in nanoseconds (ns). 100 ns is sufficient for initial stability and binding analysis. 200–500 ns is recommended for publication-grade results. 1000 ns (1 µs) for high-impact conformational studies.",
};

// ── NAME EXTRACTION FROM EMAIL ───────────────────────────────
// Tries to extract a human name from an email address
GMX.guessNameFromEmail = function(email) {
    if (!email || !email.includes('@')) return '';
    const local = email.split('@')[0];
    // Remove numbers and common separators, then title-case
    const cleaned = local
        .replace(/[0-9._\-]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    return cleaned || '';
};

// ── LINK GENERATORS (updated) ────────────────────────────────
GMX.generateMailtoLink = function(formData, proteins) {
    const recipient   = GMX.CONTACT.email;
    const projectTag  = formData.trackingId || formData.project || "[Insert Project Name]";
    const subject     = `Project Inquiry: Molecular Docking & MD Simulation — ${projectTag}`;
    const durationNs  = parseInt(formData.duration) || 100;
    const pdbList     = (proteins || []).map(p => p.pdbCode).filter(Boolean).join(', ') || "[Insert PDB ID]";
    const plan        = GMX.MD_PLANS.find(p => p.id === formData.planId) || GMX.MD_PLANS[1];
    const body =
        `Hello "GROMACS Cloud Workspace with AI" Team,\n\n` +
        `I would like to inquire about MD Simulation / Docking services.\n\n` +
        `Project ID : ${projectTag}\n` +
        `PDB ID(s)  : ${pdbList}\n` +
        `MD Plan    : ${plan.label} (${plan.tag})\n` +
        `Duration   : ${durationNs} ns per run\n` +
        `Atom Count : ~${formData.atomCount || "unknown"}\n\n` +
        `Researcher : ${formData.name || "[Name]"}\n` +
        `Email      : ${formData.email || "[Email]"}\n` +
        `Phone      : ${(formData.countryCode || '') + (formData.phone || "[Phone]")}\n\n` +
        `Best regards,\n${formData.name || "[Name]"}`;
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

GMX.generateWhatsappLink = function(formData, proteins, ligands) {
    const pdbDisplay  = (proteins || []).map(p => p.pdbCode).filter(Boolean).join(', ') || "[Insert PDB ID]";
    const ligandCount = (ligands  || []).length;
    const durationNs  = parseInt(formData.duration) || 100;
    const nameDisplay = (formData || {}).name || "[Your Name]";
    const plan        = GMX.MD_PLANS.find(p => p.id === (formData || {}).planId) || GMX.MD_PLANS[1];
    const textBlock =
        `Hello GROMACS Cloud Workspace with AI Team,\n\n` +
        `I would like to check the feasibility and scholarly pricing for an upcoming Molecular Docking/MD Simulation project.\n\n` +
        `Project Details:\n` +
        `🔹 Target Protein / PDB ID : ${pdbDisplay}\n` +
        `🔹 No. of Compounds/Ligands : ${ligandCount}\n` +
        `🔹 MD Plan : ${plan.label} — ${plan.tag}\n` +
        `🔹 Duration per run : ${durationNs} ns\n\n` +
        `Could you please let me know the turnaround time and how I can share my structural files (.pdb / .mol2) with you for verification?\n\n` +
        `Best regards,\n${nameDisplay}`;
    return `https://wa.me/${GMX.CONTACT.whatsappNumber}?text=${encodeURIComponent(textBlock)}`;
};

// ── PUBLICATIONS DATA ─────────────────────────────────────────
GMX.PUBLICATIONS = [
    { cite: "Ravi Rawat*, Kant, K.; Kumar, A.; Bhati, K.; Verma, S. M. HeroMDAnalysis: An Automagical tool for GROMACS based Molecular Dynamics Simulation Analysis. Future Medicinal Chemistry, 2021, 13(5), 447-456. DOI: 10.4155/fmc-2020-0191", factor: "4.768" },
    { cite: "Uniyal, P.; Pramanik, S. D.; Pandey, S.; Shukla, P.; Roy, P.; Padrashar, D.; Gupta, S.; Ravi Rawat*, Gaurav, A.; Lee, V. S. Synergistic combinatorial anticancer potential of Tamoxifen with Naringin and Diosmetin in MCF-7 breast cancer cells and their liposomal delivery. Scientific Reports. 2026, 10.1038/s41598-026-37954-5", factor: "4.5" },
    { cite: "Ravi Rawat*, Verma, S. M. An exclusive computational insight toward molecular mechanism of MMV007571, a multitarget inhibitor of Plasmodium falciparum. Journal of Biomolecular Structure and Dynamics, 2020, 38(18), 5362-5373. DOI: 10.1080/07391102.2019.1700165", factor: "5.235" },
    { cite: "Ravi Rawat*, Verma, S. M. High-throughput virtual screening approach involving pharmacophore mapping, ADME filtering, molecular docking and MM-GBSA to identify new dual target inhibitors of PfDHODH and PfCytbc1 complex to combat drug resistant malaria. Journal of Biomolecular Structure and Dynamics, 2021, 39(14), 5148-5159. DOI: 10.1080/07391102.2020.1784288", factor: "5.235" },
    { cite: "Ravi Rawat*, Molecular Docking and Simulation Studies of Outer Membrane Proteins with piperacillin; a broad-spectrum antibiotic against Pseudomonas aeruginosa. Journal of Biomolecular Structure and Dynamics, 2025, DOI: 10.1080/07391102.2025.2499949", factor: "5.235" },
    { cite: "Choudhary, D.; Kaur, R.; Rani, N.; Kumar, B.; Singh, T. G.; Chandrasekaran, B.; Ravi Rawat*, Eyupoglu, V. Insights into in silico analysis to explore the multitarget antidepressant role of Camellia sinensis. Journal of Biomolecular Structure and Dynamics, 2025, DOI: 10.1080/07391102.2025.2498625", factor: "5.235" },
];

// ── ANALYTICS CARDS DATA ──────────────────────────────────────
GMX.ANALYTICS_CARDS = [
    { label: "Automated Graphic 01", orig: "assets/images/originals/rmsd-evolution-map.png",              thumb: "assets/images/thumbs/rmsd-evolution-map.webp",           alt: "Protein RMSD Evolution Map",        title: "Protein RMSD Evolution Map",        sub: "Trajectory Equilibrium",          color: "cyan"   },
    { label: "Automated Graphic 02", orig: "assets/images/originals/mmpbsa-binding-energy.png",           thumb: "assets/images/thumbs/mmpbsa-binding-energy.webp",        alt: "MMPBSA Free Energy Binding",        title: "MMPBSA Free Energy Binding",        sub: "Thermodynamic Quantization",      color: "cyan"   },
    { label: "Automated Graphic 03", orig: "assets/images/originals/pca-dynamics.png",                    thumb: "assets/images/thumbs/pca-dynamics.webp",                 alt: "Principal Component Analysis",      title: "Principal Component Analysis",      sub: "Essential Dynamics Mode",         color: "cyan"   },
    { label: "Automated Graphic 04", orig: "assets/images/originals/free-energy-landscape.png",           thumb: "assets/images/thumbs/free-energy-landscape.webp",        alt: "Free Energy Landscapes",            title: "Free Energy Landscapes (FEL)",      sub: "Conformational Deep Mapping",     color: "cyan"   },
    { label: "Automated Data Table 05", orig: "assets/images/originals/docking-affinities-matrix.png",   thumb: "assets/images/thumbs/docking-affinities-matrix.webp",    alt: "Docking Score Affinities Matrix",   title: "Docking Score Affinities Matrix",   sub: "kcal/mol Structural Values",      color: "purple" },
    { label: "Automated Graphic 06", orig: "assets/images/originals/rmsf-trajectory.png",                 thumb: "assets/images/thumbs/rmsf-trajectory.webp",              alt: "RMSF Per-Residue Fluctuation",      title: "RMSF Per-Residue Fluctuation",      sub: "Backbone Dynamics Profiling",     color: "cyan"   },
    { label: "Automated Graphic 07", orig: "assets/images/originals/radius-gyration.png",                 thumb: "assets/images/thumbs/radius-gyration.webp",              alt: "Radius of Gyration Evolution",      title: "Radius of Gyration Evolution",      sub: "Compactness & Folding Indicator",  color: "cyan"  },
    { label: "Automated Graphic 08", orig: "assets/images/originals/hydrogen-bonds.png",                  thumb: "assets/images/thumbs/hydrogen-bonds.webp",               alt: "Hydrogen Bond Count Trajectory",    title: "Hydrogen Bond Count Trajectory",    sub: "H-Bond Stability Monitor",        color: "cyan"   },
    { label: "Automated Graphic 09", orig: "assets/images/originals/interaction-2d-map.png",              thumb: "assets/images/thumbs/interaction-2d-map.webp",           alt: "2D Protein-Ligand Interaction Map", title: "2D Protein-Ligand Interaction Map",  sub: "Residue Contact Profiling",       color: "cyan"   },
];

// ── FAQ DATA ──────────────────────────────────────────────────
GMX.FAQS = [
    {
        q: "1. How is AI integrated into the workflow?",
        preamble: "We utilize specialized AI agents across five critical stages:",
        bullets: [
            "<strong>Stage 1: Structural Curation & PDB Repair</strong> — AI scans for missing residues or broken loops.",
            "<strong>Stage 2: Forcefield Parameterization</strong> — Determines charges and topologies compatible with GROMACS/Amber architectures.",
            "<strong>Stage 3: Screening & Scoring</strong> — Heuristics optimize binding patterns to minimize cluster load.",
            "<strong>Stage 4: Trajectory Pattern Recognition</strong> — Dynamic observers trace domain shifts and frame loops.",
            "<strong>Stage 5: Multi-Modal Reporting</strong> — Generates comprehensive structural discussions safely on demand.",
        ],
    },
    {
        q: "2. How are AMD Radeon™ GPU clusters utilized to maintain Scholar-tier rates?",
        body: "Computational kernels are optimized dynamically using open-source parallel architectures (ROCm). By avoiding high software ecosystem overheads, we pipeline high-throughput trajectories cost-effectively.",
    },
    {
        q: "3. What level of detail is included in the Specific Interaction Analysis?",
        body: "Unlike automated wrappers, multi-modal instances trace specific residue targets explicitly (Pi-stacking, salt bridges, hydrophobic pocket geometries) instead of compiling basic energy numbers.",
    },
];

console.log("[GMX] globals.js loaded ✔");
