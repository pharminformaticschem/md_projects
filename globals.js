// ============================================================
// PART 1 — globals.js
// Shared state, utility functions, constants, config & data.
// All other parts import from window.GMX.
// To add new features: add config/data/helpers HERE first.
// ============================================================

window.GMX = window.GMX || {};

// ── CONTACT CONFIG ──────────────────────────────────────────
GMX.CONTACT = {
    email: "ravi.med.chem@gmail.com",
    whatsappNumber: "918288992343",
};

// ── PRICING CALCULATOR ───────────────────────────────────────
GMX.calculatePrice = function(mdJobs) {
    const n = parseInt(mdJobs) || 1;
    let baseInr = 0, baseUsd = 0;
    if (n === 1)               { baseInr = 2499;  baseUsd = 30;  }
    else if (n === 2)          { baseInr = 4499;  baseUsd = 55;  }
    else if (n >= 3 && n <= 5) { baseInr = 7999;  baseUsd = 97;  }
    else                       { baseInr = 12999; baseUsd = 158; }
    return { inr: baseInr, usd: baseUsd };
};

// ── LINK GENERATORS ─────────────────────────────────────────
GMX.generateMailtoLink = function(formData, proteins) {
    const recipient   = GMX.CONTACT.email;
    const projectTag  = formData.project || "[Insert Project Name]";
    const subject     = `Project Inquiry: Molecular Docking & MD Simulation - ${projectTag}`;
    const rawDuration = parseFloat(formData.duration);
    const nsDuration  = !isNaN(rawDuration) ? Math.round(rawDuration * 1000) : "100";
    const pdbList     = (proteins || []).map(p => p.pdbCode).filter(Boolean).join(', ') || "[Insert PDB ID]";
    const body =
        `Hello "GROMACS Cloud Workspace with AI" Team,\n\n` +
        `I would like to inquire about MD Simulation / Docking services.\n\n` +
        `Project: ${projectTag}\n` +
        `PDB ID(s): ${pdbList}\n` +
        `Simulation Scale: ${formData.mdJobs || 1} Jobs x ${nsDuration} ns\n\n` +
        `Researcher: ${formData.name || "[Name]"}\n` +
        `Email: ${formData.email || "[Email]"}\n` +
        `Phone: ${formData.phone || "[Phone]"}\n\n` +
        `Best regards,\n${formData.name || "[Name]"}`;
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

GMX.generateWhatsappLink = function(formData, proteins, ligands) {
    const pdbDisplay  = (proteins || []).map(p => p.pdbCode).filter(Boolean).join(', ') || "[Insert PDB ID]";
    const ligandCount = (ligands  || []).length;
    const rawDuration = parseFloat((formData || {}).duration);
    const nsDuration  = !isNaN(rawDuration) ? Math.round(rawDuration * 1000) : "100";
    const nameDisplay = (formData || {}).name || "[Your Name]";
    const mdJobs      = (formData || {}).mdJobs || 4;
    const textBlock =
        `Hello GROMACS Cloud Workspace with AI Team,\n\n` +
        `I would like to check the feasibility and scholarly pricing for an upcoming Molecular Docking/MD Simulation project.\n\n` +
        `Project Details:\n` +
        `🔹 Target Protein / PDB ID: ${pdbDisplay}\n` +
        `🔹 No. of Compounds/Ligands: ${ligandCount}\n` +
        `🔹 Simulation Scale: ${mdJobs} Jobs x ${nsDuration} ns\n\n` +
        `Could you please let me know the turnaround time and how I can share my structural files (.pdb / .mol2) with you for verification?\n\n` +
        `Best regards,\n${nameDisplay}`;
    return `https://wa.me/${GMX.CONTACT.whatsappNumber}?text=${encodeURIComponent(textBlock)}`;
};

// ── TOOLTIPS ─────────────────────────────────────────────────
GMX.TOOLTIPS = {
    email: "This email establishes your permanent account workspace. All historical and future molecular runs can be retrieved through this single credential link.",
    pdb:   "Accepts structural notation arrays from 4 up to 12 alphanumeric digits. This safely encapsulates traditional RCSB entries as well as extended structural configurations.",
    ligandClass: "Test Ligands represent your experimental compounds. Standard Controls are your baseline comparison reference drugs (e.g., co-crystallized inhibitors). Our automated engine will auto-populate the final top trajectories based on this classification.",
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
    { label: "Automated Graphic 01", orig: "assets/images/originals/rmsd-evolution-map.png",           thumb: "assets/images/thumbs/rmsd-evolution-map.webp",           alt: "Protein RMSD Evolution Map",        title: "Protein RMSD Evolution Map",        sub: "Trajectory Equilibrium",         color: "cyan"   },
    { label: "Automated Graphic 02", orig: "assets/images/originals/mmpbsa-binding-energy.png",        thumb: "assets/images/thumbs/mmpbsa-binding-energy.webp",        alt: "MMPBSA Free Energy Binding",        title: "MMPBSA Free Energy Binding",        sub: "Thermodynamic Quantization",     color: "cyan"   },
    { label: "Automated Graphic 03", orig: "assets/images/originals/pca-dynamics.png",                 thumb: "assets/images/thumbs/pca-dynamics.webp",                 alt: "Principal Component Analysis",      title: "Principal Component Analysis",      sub: "Essential Dynamics Mode",        color: "cyan"   },
    { label: "Automated Graphic 04", orig: "assets/images/originals/free-energy-landscape.png",        thumb: "assets/images/thumbs/free-energy-landscape.webp",        alt: "Free Energy Landscapes",            title: "Free Energy Landscapes (FEL)",      sub: "Conformational Deep Mapping",    color: "cyan"   },
    { label: "Automated Data Table 05", orig: "assets/images/originals/docking-affinities-matrix.png", thumb: "assets/images/thumbs/docking-affinities-matrix.webp",    alt: "Docking Score Affinities Matrix",   title: "Docking Score Affinities Matrix",   sub: "kcal/mol Structural Values",     color: "purple" },
    { label: "Automated Graphic 06", orig: "assets/images/originals/rmsf-trajectory.png",              thumb: "assets/images/thumbs/rmsf-trajectory.webp",              alt: "RMSF Per-Residue Fluctuation",      title: "RMSF Per-Residue Fluctuation",      sub: "Backbone Dynamics Profiling",    color: "cyan"   },
    { label: "Automated Graphic 07", orig: "assets/images/originals/radius-gyration.png",              thumb: "assets/images/thumbs/radius-gyration.webp",              alt: "Radius of Gyration Evolution",      title: "Radius of Gyration Evolution",      sub: "Compactness & Folding Indicator", color: "cyan"  },
    { label: "Automated Graphic 08", orig: "assets/images/originals/hydrogen-bonds.png",               thumb: "assets/images/thumbs/hydrogen-bonds.webp",               alt: "Hydrogen Bond Count Trajectory",    title: "Hydrogen Bond Count Trajectory",    sub: "H-Bond Stability Monitor",       color: "cyan"   },
    { label: "Automated Graphic 09", orig: "assets/images/originals/interaction-2d-map.png",           thumb: "assets/images/thumbs/interaction-2d-map.webp",           alt: "2D Protein-Ligand Interaction Map", title: "2D Protein-Ligand Interaction Map",  sub: "Residue Contact Profiling",      color: "cyan"   },
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
