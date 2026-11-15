import type {
  CurriculumClass,
  IntegrationReadinessItem,
  StreamId,
  StudyTask,
} from '../types/studyverse';
import { addSupplementalCurriculum } from './curriculumSupplemental';

export const STREAM_OPTIONS: { id: StreamId; label: string; description: string }[] = [
  { id: 'mpc', label: 'MPC', description: 'Mathematics, Physics & Chemistry' },
  { id: 'bipc', label: 'BiPC', description: 'Biology, Physics & Chemistry' },
  { id: 'cec', label: 'CEC', description: 'Civics, Economics & Commerce' },
  { id: 'mec', label: 'MEC', description: 'Mathematics, Economics & Commerce' },
];

const BASE_CURRICULUM_CLASSES: CurriculumClass[] = [
  {
    id: 'class-5',
    label: 'Class 5',
    shortLabel: '5th',
    tier: 'middle',
    order: 5,
    description: 'Upper primary foundations in arithmetic, natural sciences, and grammar.',
    subjects: [
      {
        id: 'c5-math',
        name: 'Mathematics',
        code: 'MATH-05',
        streams: ['general'],
        chapters: [
          {
            id: 'c5-math-ch1',
            number: 1,
            title: 'Fractions and Decimals',
            textbookUnit: 'Unit 2 · Number Systems',
            topics: [
              {
                id: 'c5-math-t1',
                title: 'Equivalent Fractions & Simplification',
                summary: 'Comparing halves, quarters, and finding lowest common forms.',
                estimatedMinutes: 25,
                hasNumericals: true,
                keyFormula: 'a/b = (a × k) / (b × k)',
              },
              {
                id: 'c5-math-t2',
                title: 'Decimal Place Value (Tenths & Hundredths)',
                summary: 'Converting simple fractions into decimal notation.',
                estimatedMinutes: 20,
                hasNumericals: true,
              },
            ],
          },
          {
            id: 'c5-math-ch2',
            number: 2,
            title: 'Area and Perimeter',
            textbookUnit: 'Unit 4 · Mensuration',
            topics: [
              {
                id: 'c5-math-t3',
                title: 'Perimeter of Squares & Rectangles',
                summary: 'Measuring boundary lengths of everyday geometric shapes.',
                estimatedMinutes: 25,
                hasNumericals: true,
                keyFormula: 'P = 2(l + w)',
              },
            ],
          },
        ],
      },
      {
        id: 'c5-sci',
        name: 'Environmental Science',
        code: 'EVS-05',
        streams: ['general'],
        chapters: [
          {
            id: 'c5-sci-ch1',
            number: 1,
            title: 'Seeds and Germination',
            textbookUnit: 'Unit 1 · Living World',
            topics: [
              {
                id: 'c5-sci-t1',
                title: 'Structure of a Seed & Dispersal',
                summary: 'How wind, water, and animals help plants spread across habitats.',
                estimatedMinutes: 20,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'class-6',
    label: 'Class 6',
    shortLabel: '6th',
    tier: 'middle',
    order: 6,
    description: 'Core middle school bridge introducing integers, ratios, and physical science.',
    subjects: [
      {
        id: 'c6-math',
        name: 'Mathematics',
        code: 'MATH-06',
        streams: ['general'],
        chapters: [
          {
            id: 'c6-math-ch1',
            number: 1,
            title: 'Ratio and Proportion',
            textbookUnit: 'Unit 3 · Commercial Math',
            topics: [
              {
                id: 'c6-math-t1',
                title: 'Comparing Quantities with Ratios',
                summary: 'Expressing part-to-part and part-to-whole relationships cleanly.',
                estimatedMinutes: 30,
                hasNumericals: true,
                keyFormula: 'a : b = c : d  =>  a × d = b × c',
              },
            ],
          },
          {
            id: 'c6-math-ch2',
            number: 2,
            title: 'Introduction to Algebra',
            textbookUnit: 'Unit 5 · Algebraic Thinking',
            topics: [
              {
                id: 'c6-math-t2',
                title: 'Variables and Matchstick Patterns',
                summary: 'Representing unknown quantities with letters in simple expressions.',
                estimatedMinutes: 25,
              },
            ],
          },
        ],
      },
      {
        id: 'c6-sci',
        name: 'Science',
        code: 'SCI-06',
        streams: ['general'],
        chapters: [
          {
            id: 'c6-sci-ch1',
            number: 1,
            title: 'Electricity and Circuits',
            textbookUnit: 'Unit 4 · Physical Phenomena',
            topics: [
              {
                id: 'c6-sci-t1',
                title: 'Open vs Closed Electric Circuits',
                summary: 'Understanding dry cells, switches, conductors, and insulators.',
                estimatedMinutes: 25,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'class-7',
    label: 'Class 7',
    shortLabel: '7th',
    tier: 'middle',
    order: 7,
    description: 'Deepening algebraic equations, triangles, heat transfer, and life processes.',
    subjects: [
      {
        id: 'c7-math',
        name: 'Mathematics',
        code: 'MATH-07',
        streams: ['general'],
        chapters: [
          {
            id: 'c7-math-ch1',
            number: 1,
            title: 'Simple Linear Equations',
            textbookUnit: 'Unit 2 · Algebra',
            topics: [
              {
                id: 'c7-math-t1',
                title: 'Balancing Equations in One Variable',
                summary: 'Transposing terms across the equality sign to isolate x.',
                estimatedMinutes: 30,
                hasNumericals: true,
                keyFormula: 'ax + b = c  =>  x = (c - b) / a',
              },
            ],
          },
        ],
      },
      {
        id: 'c7-sci',
        name: 'Science',
        code: 'SCI-07',
        streams: ['general'],
        chapters: [
          {
            id: 'c7-sci-ch1',
            number: 1,
            title: 'Heat and Temperature',
            textbookUnit: 'Unit 2 · Thermal Physics',
            topics: [
              {
                id: 'c7-sci-t1',
                title: 'Conduction, Convection, and Radiation',
                summary: 'How thermal energy moves across solids, fluids, and vacuum.',
                estimatedMinutes: 30,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'class-8',
    label: 'Class 8',
    shortLabel: '8th',
    tier: 'middle',
    order: 8,
    description: 'Pre-secondary transition covering exponents, quadrilaterals, force, and cell biology.',
    subjects: [
      {
        id: 'c8-math',
        name: 'Mathematics',
        code: 'MATH-08',
        streams: ['general'],
        chapters: [
          {
            id: 'c8-math-ch1',
            number: 1,
            title: 'Exponents and Powers',
            textbookUnit: 'Unit 3 · Number Theory',
            topics: [
              {
                id: 'c8-math-t1',
                title: 'Laws of Negative and Integral Exponents',
                summary: 'Multiplying and dividing powers with common bases.',
                estimatedMinutes: 30,
                hasNumericals: true,
                keyFormula: 'a^m × a^n = a^(m+n)',
              },
            ],
          },
        ],
      },
      {
        id: 'c8-sci',
        name: 'Science',
        code: 'SCI-08',
        streams: ['general'],
        chapters: [
          {
            id: 'c8-sci-ch1',
            number: 1,
            title: 'Force and Pressure',
            textbookUnit: 'Unit 3 · Mechanics',
            topics: [
              {
                id: 'c8-sci-t1',
                title: 'Contact vs Non-Contact Forces & Atmospheric Pressure',
                summary: 'Relating force distributed over surface area to fluid pressure.',
                estimatedMinutes: 30,
                hasNumericals: true,
                keyFormula: 'P = F / A',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'class-9',
    label: 'Class 9',
    shortLabel: '9th',
    tier: 'secondary',
    order: 9,
    description: 'Secondary foundation in coordinate geometry, kinematics, mole concept, and tissues.',
    subjects: [
      {
        id: 'c9-math',
        name: 'Mathematics',
        code: 'MATH-09',
        streams: ['general'],
        chapters: [
          {
            id: 'c9-math-ch1',
            number: 1,
            title: 'Polynomials',
            textbookUnit: 'Unit 2 · Algebra',
            topics: [
              {
                id: 'c9-math-t1',
                title: 'Remainder and Factor Theorems',
                summary: 'Finding zeros of cubic and quadratic polynomials algebraically.',
                estimatedMinutes: 35,
                hasNumericals: true,
                keyFormula: 'p(a) = 0  <=>  (x - a) is a factor',
              },
            ],
          },
        ],
      },
      {
        id: 'c9-phy',
        name: 'Physics',
        code: 'PHY-09',
        streams: ['general'],
        chapters: [
          {
            id: 'c9-phy-ch1',
            number: 1,
            title: 'Laws of Motion & Gravitation',
            textbookUnit: 'Unit 1 · Kinematics & Dynamics',
            topics: [
              {
                id: 'c9-phy-t1',
                title: 'Equations of Uniformly Accelerated Motion',
                summary: 'Deriving velocity-time and position-time relationships.',
                estimatedMinutes: 40,
                hasNumericals: true,
                keyFormula: 's = ut + (1/2)at^2',
              },
            ],
          },
        ],
      },
      {
        id: 'c9-chem',
        name: 'Chemistry',
        code: 'CHEM-09',
        streams: ['general'],
        chapters: [
          {
            id: 'c9-chem-ch1',
            number: 1,
            title: 'Atoms and Molecules',
            textbookUnit: 'Unit 2 · Stoichiometry',
            topics: [
              {
                id: 'c9-chem-t1',
                title: 'Mole Concept and Molar Mass',
                summary: 'Linking Avogadro constant to atomic mass units in reactions.',
                estimatedMinutes: 35,
                hasNumericals: true,
                keyFormula: 'n = m / M',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'class-10',
    label: 'Class 10',
    shortLabel: '10th',
    tier: 'secondary',
    order: 10,
    description: 'Board exam preparation covering quadratics, trigonometry, optics, and heredity.',
    subjects: [
      {
        id: 'c10-math',
        name: 'Mathematics',
        code: 'MATH-10',
        streams: ['general'],
        chapters: [
          {
            id: 'c10-math-ch1',
            number: 1,
            title: 'Quadratic Equations',
            textbookUnit: 'Unit 2 · Algebra',
            topics: [
              {
                id: 'c10-math-t1',
                title: 'Quadratic Formula & Nature of Roots',
                summary: 'Using the discriminant b^2 - 4ac to classify real and equal roots.',
                estimatedMinutes: 40,
                hasNumericals: true,
                keyFormula: 'x = (-b ± sqrt(b^2 - 4ac)) / 2a',
              },
              {
                id: 'c10-math-t2',
                title: 'Word Problems on Speed & Area',
                summary: 'Translating real-world constraints into quadratic equations.',
                estimatedMinutes: 35,
                hasNumericals: true,
              },
            ],
          },
          {
            id: 'c10-math-ch2',
            number: 2,
            title: 'Introduction to Trigonometry',
            textbookUnit: 'Unit 5 · Trigonometry',
            topics: [
              {
                id: 'c10-math-t3',
                title: 'Trigonometric Ratios & Pythagorean Identities',
                summary: 'Applying sin, cos, and tan identities to right triangles.',
                estimatedMinutes: 40,
                hasNumericals: true,
                keyFormula: 'sin^2(θ) + cos^2(θ) = 1',
              },
            ],
          },
        ],
      },
      {
        id: 'c10-phy',
        name: 'Physics',
        code: 'PHY-10',
        streams: ['general'],
        chapters: [
          {
            id: 'c10-phy-ch1',
            number: 1,
            title: 'Light: Reflection and Refraction',
            textbookUnit: 'Unit 3 · Ray Optics',
            topics: [
              {
                id: 'c10-phy-t1',
                title: 'Mirror and Lens Formulae with Sign Convention',
                summary: 'Computing focal length, image distance, and magnification.',
                estimatedMinutes: 40,
                hasNumericals: true,
                keyFormula: '1/f = 1/v - 1/u',
              },
            ],
          },
          {
            id: 'c10-phy-ch2',
            number: 2,
            title: 'Electricity & Ohm’s Law',
            textbookUnit: 'Unit 4 · Current Electricity',
            topics: [
              {
                id: 'c10-phy-t2',
                title: 'Series and Parallel Resistor Networks',
                summary: 'Calculating equivalent resistance and Joule heating.',
                estimatedMinutes: 35,
                hasNumericals: true,
                keyFormula: 'V = I × R',
              },
            ],
          },
        ],
      },
      {
        id: 'c10-chem',
        name: 'Chemistry',
        code: 'CHEM-10',
        streams: ['general'],
        chapters: [
          {
            id: 'c10-chem-ch1',
            number: 1,
            title: 'Chemical Reactions and Equations',
            textbookUnit: 'Unit 1 · Chemical Change',
            topics: [
              {
                id: 'c10-chem-t1',
                title: 'Balancing Redox & Displacement Equations',
                summary: 'Applying conservation of mass to oxidation-reduction reactions.',
                estimatedMinutes: 30,
              },
            ],
          },
        ],
      },
      {
        id: 'c10-bio',
        name: 'Biology',
        code: 'BIO-10',
        streams: ['general'],
        chapters: [
          {
            id: 'c10-bio-ch1',
            number: 1,
            title: 'Life Processes',
            textbookUnit: 'Unit 2 · Physiology',
            topics: [
              {
                id: 'c10-bio-t1',
                title: 'Photosynthesis and Cellular Respiration',
                summary: 'Comparing autotrophic nutrition and ATP energy pathways.',
                estimatedMinutes: 35,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'inter-1',
    label: 'Intermediate 1st Year',
    shortLabel: 'Inter 1st',
    tier: 'intermediate',
    order: 11,
    description: 'Junior Intermediate streams (MPC, BiPC, CEC, MEC) with rigorous analytical depth.',
    subjects: [
      {
        id: 'i1-math',
        name: 'Mathematics (1A & 1B)',
        code: 'MATH-11',
        streams: ['mpc', 'mec'],
        chapters: [
          {
            id: 'i1-math-ch1',
            number: 1,
            title: 'Functions and Mathematical Induction',
            textbookUnit: 'Paper 1A · Algebra',
            topics: [
              {
                id: 'i1-math-t1',
                title: 'Domain, Range & Inverse Functions',
                summary: 'Classifying one-one, onto, and bijective mappings.',
                estimatedMinutes: 45,
                hasNumericals: true,
              },
            ],
          },
          {
            id: 'i1-math-ch2',
            number: 2,
            title: 'Limits, Continuity & Differentiation',
            textbookUnit: 'Paper 1B · Calculus',
            topics: [
              {
                id: 'i1-math-t2',
                title: 'First Principles of Derivatives',
                summary: 'Evaluating standard trigonometric and algebraic limits.',
                estimatedMinutes: 50,
                hasNumericals: true,
                keyFormula: "f'(x) = lim(h->0) [f(x+h) - f(x)] / h",
              },
            ],
          },
        ],
      },
      {
        id: 'i1-phy',
        name: 'Physics',
        code: 'PHY-11',
        streams: ['mpc', 'bipc'],
        chapters: [
          {
            id: 'i1-phy-ch1',
            number: 1,
            title: 'Motion in a Plane & Vectors',
            textbookUnit: 'Unit 3 · Mechanics',
            topics: [
              {
                id: 'i1-phy-t1',
                title: 'Projectile Motion & Range Optimization',
                summary: 'Resolving horizontal and vertical velocity components under gravity.',
                estimatedMinutes: 45,
                hasNumericals: true,
                keyFormula: 'R = (u^2 × sin(2θ)) / g',
              },
            ],
          },
          {
            id: 'i1-phy-ch2',
            number: 2,
            title: 'Thermodynamics',
            textbookUnit: 'Unit 8 · Thermal Physics',
            topics: [
              {
                id: 'i1-phy-t2',
                title: 'First Law & Carnot Efficiency',
                summary: 'Isothermal and adiabatic expansion work equations.',
                estimatedMinutes: 45,
                hasNumericals: true,
                keyFormula: 'ΔQ = ΔU + ΔW',
              },
            ],
          },
        ],
      },
      {
        id: 'i1-chem',
        name: 'Chemistry',
        code: 'CHEM-11',
        streams: ['mpc', 'bipc'],
        chapters: [
          {
            id: 'i1-chem-ch1',
            number: 1,
            title: 'Chemical Bonding & Molecular Orbital Theory',
            textbookUnit: 'Unit 4 · Physical & Inorganic',
            topics: [
              {
                id: 'i1-chem-t1',
                title: 'VSEPR Geometry & Hybridization (sp, sp2, sp3)',
                summary: 'Predicting bond angles and molecular dipole moments.',
                estimatedMinutes: 40,
              },
            ],
          },
        ],
      },
      {
        id: 'i1-bio',
        name: 'Botany & Zoology',
        code: 'BIO-11',
        streams: ['bipc'],
        chapters: [
          {
            id: 'i1-bio-ch1',
            number: 1,
            title: 'Cell Cycle and Division',
            textbookUnit: 'Unit 3 · Cell Biology',
            topics: [
              {
                id: 'i1-bio-t1',
                title: 'Mitosis vs Meiosis Crossing Over',
                summary: 'Chromosomal checkpoints across prophase, metaphase, and anaphase.',
                estimatedMinutes: 40,
              },
            ],
          },
        ],
      },
      {
        id: 'i1-econ',
        name: 'Economics & Commerce',
        code: 'ECON-11',
        streams: ['cec', 'mec'],
        chapters: [
          {
            id: 'i1-econ-ch1',
            number: 1,
            title: 'Theory of Consumer Behaviour',
            textbookUnit: 'Unit 2 · Microeconomics',
            topics: [
              {
                id: 'i1-econ-t1',
                title: 'Law of Diminishing Marginal Utility & Demand Elasticity',
                summary: 'Measuring price sensitivity with indifference curves.',
                estimatedMinutes: 40,
                hasNumericals: true,
                keyFormula: 'Ed = (%ΔQ) / (%ΔP)',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'inter-2',
    label: 'Intermediate 2nd Year',
    shortLabel: 'Inter 2nd',
    tier: 'intermediate',
    order: 12,
    description: 'Senior Intermediate board & competitive foundation across calculus, electrostatics, organic synthesis, and macroeconomics.',
    subjects: [
      {
        id: 'i2-math',
        name: 'Mathematics (2A & 2B)',
        code: 'MATH-12',
        streams: ['mpc', 'mec'],
        chapters: [
          {
            id: 'i2-math-ch1',
            number: 1,
            title: 'Definite Integrals & Differential Equations',
            textbookUnit: 'Paper 2B · Integral Calculus',
            topics: [
              {
                id: 'i2-math-t1',
                title: 'Integration by Parts & Area Under Curves',
                summary: 'Applying the Fundamental Theorem of Calculus to bounded regions.',
                estimatedMinutes: 50,
                hasNumericals: true,
                keyFormula: '∫ u dv = uv - ∫ v du',
              },
            ],
          },
          {
            id: 'i2-math-ch2',
            number: 2,
            title: 'Complex Numbers & Probability',
            textbookUnit: 'Paper 2A · Algebra',
            topics: [
              {
                id: 'i2-math-t2',
                title: 'De Moivre’s Theorem & Bayes’ Theorem',
                summary: 'Computing conditional probabilities and nth roots of unity.',
                estimatedMinutes: 45,
                hasNumericals: true,
              },
            ],
          },
        ],
      },
      {
        id: 'i2-phy',
        name: 'Physics',
        code: 'PHY-12',
        streams: ['mpc', 'bipc'],
        chapters: [
          {
            id: 'i2-phy-ch1',
            number: 1,
            title: 'Electrostatics & Gauss’s Law',
            textbookUnit: 'Unit 1 · Electromagnetism',
            topics: [
              {
                id: 'i2-phy-t1',
                title: 'Electric Flux, Capacitors & Dielectrics',
                summary: 'Energy stored in parallel-plate capacitors and spherical charge shells.',
                estimatedMinutes: 45,
                hasNumericals: true,
                keyFormula: 'U = (1/2) C V^2',
              },
            ],
          },
          {
            id: 'i2-phy-ch2',
            number: 2,
            title: 'Electromagnetic Induction & AC',
            textbookUnit: 'Unit 4 · Electrodynamics',
            topics: [
              {
                id: 'i2-phy-t2',
                title: 'Faraday’s Law & LCR Resonance',
                summary: 'Determining impedance and quality factor in alternating circuits.',
                estimatedMinutes: 45,
                hasNumericals: true,
                keyFormula: 'Z = sqrt(R^2 + (XL - XC)^2)',
              },
            ],
          },
        ],
      },
      {
        id: 'i2-chem',
        name: 'Chemistry',
        code: 'CHEM-12',
        streams: ['mpc', 'bipc'],
        chapters: [
          {
            id: 'i2-chem-ch1',
            number: 1,
            title: 'Electrochemistry & Chemical Kinetics',
            textbookUnit: 'Unit 3 · Physical Chemistry',
            topics: [
              {
                id: 'i2-chem-t1',
                title: 'Nernst Equation & First-Order Rate Constants',
                summary: 'Calculating cell EMF under non-standard concentrations and half-life.',
                estimatedMinutes: 45,
                hasNumericals: true,
                keyFormula: 'E = E° - (0.0591 / n) log Q',
              },
            ],
          },
        ],
      },
      {
        id: 'i2-bio',
        name: 'Biology & Genetics',
        code: 'BIO-12',
        streams: ['bipc'],
        chapters: [
          {
            id: 'i2-bio-ch1',
            number: 1,
            title: 'Molecular Basis of Inheritance',
            textbookUnit: 'Unit 2 · Genetics',
            topics: [
              {
                id: 'i2-bio-t1',
                title: 'DNA Replication, Transcription & Lac Operon',
                summary: 'Understanding genetic code regulation in prokaryotes and eukaryotes.',
                estimatedMinutes: 45,
              },
            ],
          },
        ],
      },
      {
        id: 'i2-comm',
        name: 'Macroeconomics & Accountancy',
        code: 'COMM-12',
        streams: ['cec', 'mec'],
        chapters: [
          {
            id: 'i2-comm-ch1',
            number: 1,
            title: 'National Income Accounting & Banking',
            textbookUnit: 'Unit 1 · Macroeconomics',
            topics: [
              {
                id: 'i2-comm-t1',
                title: 'GDP Deflator & Money Multiplier',
                summary: 'Computing GNP, NNP at factor cost, and reserve ratio expansion.',
                estimatedMinutes: 40,
                hasNumericals: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

export const CURRICULUM_CLASSES: CurriculumClass[] =
  addSupplementalCurriculum(BASE_CURRICULUM_CLASSES);

export const INITIAL_STUDY_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    title: 'Review Quadratic Formula & Discriminant cases',
    subjectName: 'Mathematics',
    day: 'Mon',
    durationMinutes: 40,
    completed: false,
  },
  {
    id: 'task-2',
    title: 'Read Ray Optics sign convention examples',
    subjectName: 'Physics',
    day: 'Tue',
    durationMinutes: 35,
    completed: false,
  },
  {
    id: 'task-3',
    title: 'Practice 5 balanced chemical displacement equations',
    subjectName: 'Chemistry',
    day: 'Wed',
    durationMinutes: 30,
    completed: false,
  },
];

export const INTEGRATION_READINESS: IntegrationReadinessItem[] = [
  {
    id: 'supabase',
    name: 'StudyVerse Account & Sync',
    purpose: 'Student & parent sign-in, profile preferences, saved notes, study plans, and quiz history.',
    status: 'pending',
    envVars: [],
  },
  {
    id: 'gemini',
    name: 'StudyVerse AI Companion',
    purpose: 'Textbook-based AI lessons, AI Notes Generator, AI Teacher Aria, Quiz generation, and Numerical verification.',
    status: 'pending',
    envVars: [],
  },
  {
    id: 'youtube',
    name: 'StudyVerse Video Library',
    purpose: 'Curated chapter-aligned video lectures, duration filtering, and playlist curation in the YouTube Learning Hub.',
    status: 'pending',
    envVars: [],
  },
  {
    id: 'github',
    name: 'StudyVerse Academic Archive',
    purpose: 'Organized study resources and backup workspace tools.',
    status: 'pending',
    envVars: [],
  },
];
