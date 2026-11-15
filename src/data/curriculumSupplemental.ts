import type { CurriculumClass, GradeLevelId, SubjectItem, TopicItem } from '../types/studyverse';

type TopicSeed = Pick<TopicItem, 'title' | 'summary' | 'learningObjective'> & {
  estimatedMinutes?: number;
};

interface CurriculumPathway {
  gradeId: Extract<GradeLevelId, 'class-6' | 'class-7' | 'class-8' | 'class-9' | 'class-10'>;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  chapterId: string;
  chapterTitle: string;
  topics: TopicSeed[];
}

const pathways: CurriculumPathway[] = [
  {
    gradeId: 'class-6',
    subjectId: 'c6-math',
    chapterId: 'c6-math-number-measure',
    chapterTitle: 'Number and Measurement Reasoning',
    topics: [
      { title: 'Whole-number operations', summary: 'Use place value and operation properties to calculate and estimate.', learningObjective: 'Choose and explain an efficient operation strategy.' },
      { title: 'Fractions and proportional thinking', summary: 'Represent parts of a whole and compare simple ratios.', learningObjective: 'Model and compare quantities with fractions and ratios.' },
      { title: 'Measurement and data', summary: 'Compare familiar measures and organize observations in tables or graphs.', learningObjective: 'Select suitable units and interpret simple data displays.' },
    ],
  },
  {
    gradeId: 'class-6',
    subjectId: 'c6-sci',
    chapterId: 'c6-sci-investigation',
    chapterTitle: 'Scientific Observation and Systems',
    topics: [
      { title: 'Living things and habitats', summary: 'Observe how organisms meet needs in different environments.', learningObjective: 'Relate observable features to an organism’s needs and habitat.' },
      { title: 'Materials and their properties', summary: 'Compare common materials using observable properties.', learningObjective: 'Sort materials by evidence rather than appearance alone.' },
      { title: 'Simple scientific investigations', summary: 'Ask a testable question and record observations carefully.', learningObjective: 'Plan a fair comparison and communicate its evidence.' },
    ],
  },
  {
    gradeId: 'class-6',
    subjectId: 'c6-english',
    subjectName: 'English Language',
    subjectCode: 'ENG-06',
    chapterId: 'c6-english-communication',
    chapterTitle: 'Reading and Communication Pathway',
    topics: [
      { title: 'Reading for main ideas', summary: 'Identify a text’s central idea and supporting details.', learningObjective: 'Summarize a short passage using evidence from the text.' },
      { title: 'Vocabulary in context', summary: 'Use surrounding words and sentences to infer meaning.', learningObjective: 'Explain how context helps determine a word’s meaning.' },
      { title: 'Clear paragraphs', summary: 'Organize related sentences around one main idea.', learningObjective: 'Draft a paragraph with a topic sentence and relevant details.' },
    ],
  },
  {
    gradeId: 'class-6',
    subjectId: 'c6-social-studies',
    subjectName: 'Social Studies',
    subjectCode: 'SST-06',
    chapterId: 'c6-social-inquiry',
    chapterTitle: 'People, Place, and Community Inquiry',
    topics: [
      { title: 'Using maps and directions', summary: 'Read basic map symbols, directions, and scale.', learningObjective: 'Locate places and describe relative position using a map.' },
      { title: 'Communities and shared responsibilities', summary: 'Explore how people cooperate and make shared decisions.', learningObjective: 'Describe a community need and ways people address it.' },
      { title: 'Evidence about the past', summary: 'Compare objects, images, and written accounts as historical evidence.', learningObjective: 'Distinguish an observation from an inference about the past.' },
    ],
  },
  {
    gradeId: 'class-7',
    subjectId: 'c7-math',
    chapterId: 'c7-math-ratio-geometry',
    chapterTitle: 'Proportional and Geometric Reasoning',
    topics: [
      { title: 'Fractions, decimals, and rational numbers', summary: 'Compare and calculate with equivalent representations of numbers.', learningObjective: 'Choose an appropriate representation to solve a problem.' },
      { title: 'Proportional relationships', summary: 'Use tables and diagrams to compare related quantities.', learningObjective: 'Recognize and solve a simple proportional relationship.' },
      { title: 'Angles and shapes', summary: 'Describe angle relationships and classify two-dimensional shapes.', learningObjective: 'Use geometric properties to justify a classification.' },
    ],
  },
  {
    gradeId: 'class-7',
    subjectId: 'c7-sci',
    chapterId: 'c7-sci-energy-systems',
    chapterTitle: 'Energy and Environmental Systems',
    topics: [
      { title: 'Energy transfer in everyday systems', summary: 'Trace how energy changes form in familiar situations.', learningObjective: 'Describe an energy transfer using a cause-and-effect model.' },
      { title: 'Ecosystems and interactions', summary: 'Examine how organisms interact with each other and their surroundings.', learningObjective: 'Represent a simple relationship within an ecosystem.' },
      { title: 'Evidence and measurement', summary: 'Use observations and measurements to support a scientific claim.', learningObjective: 'Support a conclusion with relevant recorded evidence.' },
    ],
  },
  {
    gradeId: 'class-7',
    subjectId: 'c7-english',
    subjectName: 'English Language',
    subjectCode: 'ENG-07',
    chapterId: 'c7-english-communication',
    chapterTitle: 'Reading and Communication Pathway',
    topics: [
      { title: 'Inference and point of view', summary: 'Use details in a text to infer meaning and recognize perspective.', learningObjective: 'Support an inference with a relevant textual detail.' },
      { title: 'Sentence clarity', summary: 'Use sentence structure and punctuation to communicate ideas.', learningObjective: 'Revise sentences to make meaning clear and precise.' },
      { title: 'Informative writing', summary: 'Group facts and examples to explain a topic.', learningObjective: 'Write a short explanation with an organized sequence of ideas.' },
    ],
  },
  {
    gradeId: 'class-7',
    subjectId: 'c7-social-studies',
    subjectName: 'Social Studies',
    subjectCode: 'SST-07',
    chapterId: 'c7-social-inquiry',
    chapterTitle: 'Society, Environment, and Governance Inquiry',
    topics: [
      { title: 'Physical environment and settlement', summary: 'Relate landforms and resources to how communities live.', learningObjective: 'Explain a connection between a place and a human activity.' },
      { title: 'Rules and public institutions', summary: 'Explore how rules and institutions support collective life.', learningObjective: 'Identify a public responsibility and its purpose.' },
      { title: 'Comparing historical accounts', summary: 'Compare sources and recognize that accounts may differ.', learningObjective: 'Use source details to explain a historical interpretation.' },
    ],
  },
  {
    gradeId: 'class-8',
    subjectId: 'c8-math',
    chapterId: 'c8-math-algebra-data',
    chapterTitle: 'Algebra, Geometry, and Data Reasoning',
    topics: [
      { title: 'Rational numbers and exponents', summary: 'Apply number properties to compare and simplify expressions.', learningObjective: 'Use exponent and rational-number rules with stated reasoning.' },
      { title: 'Linear relationships', summary: 'Represent a relationship with words, a table, or an equation.', learningObjective: 'Translate a simple situation into an algebraic expression.' },
      { title: 'Geometry and data', summary: 'Use shape properties and summarize data with appropriate displays.', learningObjective: 'Select a method to solve a geometric or data question.' },
    ],
  },
  {
    gradeId: 'class-8',
    subjectId: 'c8-sci',
    chapterId: 'c8-sci-matter-energy',
    chapterTitle: 'Matter, Energy, and Living Systems',
    topics: [
      { title: 'Forces and interactions', summary: 'Describe how forces can change motion or shape.', learningObjective: 'Identify forces in a system and predict a qualitative effect.' },
      { title: 'Matter and change', summary: 'Compare observable changes in materials and substances.', learningObjective: 'Use observations to distinguish a change in form from a new substance.' },
      { title: 'Cells and body systems', summary: 'Relate structures in living things to their functions.', learningObjective: 'Explain how a biological structure supports a function.' },
    ],
  },
  {
    gradeId: 'class-8',
    subjectId: 'c8-english',
    subjectName: 'English Language',
    subjectCode: 'ENG-08',
    chapterId: 'c8-english-communication',
    chapterTitle: 'Reading and Communication Pathway',
    topics: [
      { title: 'Evaluating claims', summary: 'Identify a claim and check which details support it.', learningObjective: 'Distinguish a supported claim from an unsupported statement.' },
      { title: 'Grammar for precision', summary: 'Use agreement, tense, and punctuation to improve clarity.', learningObjective: 'Edit a paragraph for consistent and precise language.' },
      { title: 'Evidence-based writing', summary: 'Develop an explanation using relevant examples or evidence.', learningObjective: 'Organize a short response around a claim and supporting evidence.' },
    ],
  },
  {
    gradeId: 'class-8',
    subjectId: 'c8-social-studies',
    subjectName: 'Social Studies',
    subjectCode: 'SST-08',
    chapterId: 'c8-social-inquiry',
    chapterTitle: 'Resources, Rights, and Historical Inquiry',
    topics: [
      { title: 'Resources and sustainability', summary: 'Explore how resources are used and conserved.', learningObjective: 'Compare choices that affect resource use over time.' },
      { title: 'Rights and civic participation', summary: 'Examine how rights and responsibilities shape civic life.', learningObjective: 'Connect a civic principle to an everyday example.' },
      { title: 'Interpreting historical evidence', summary: 'Use sources to develop a cautious account of past events.', learningObjective: 'Separate source evidence from a conclusion drawn from it.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-math',
    chapterId: 'c9-math-coordinate-data',
    chapterTitle: 'Geometry, Functions, and Data Reasoning',
    topics: [
      { title: 'Coordinate representations', summary: 'Use coordinates and diagrams to describe mathematical relationships.', learningObjective: 'Interpret or construct a coordinate representation.' },
      { title: 'Geometric justification', summary: 'Use definitions and properties to support a geometric conclusion.', learningObjective: 'Present a logically ordered geometric justification.' },
      { title: 'Data and uncertainty', summary: 'Summarize data and interpret what a measure can and cannot show.', learningObjective: 'Choose and interpret a suitable summary of a data set.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-phy',
    chapterId: 'c9-phy-energy-waves',
    chapterTitle: 'Energy and Wave Phenomena',
    topics: [
      { title: 'Work and energy models', summary: 'Relate work, energy transfer, and changes in a system.', learningObjective: 'Use a model to explain an energy change in a physical system.' },
      { title: 'Sound and wave descriptions', summary: 'Describe sound through vibration and wave properties.', learningObjective: 'Connect observable sound properties to a wave description.' },
      { title: 'Measurement and uncertainty', summary: 'Use units and repeated measurements to describe physical quantities.', learningObjective: 'Report a measured quantity with a suitable unit and precision.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-chem',
    chapterId: 'c9-chem-mixtures-change',
    chapterTitle: 'Mixtures and Chemical Change',
    topics: [
      { title: 'Mixtures and separation', summary: 'Compare mixtures and choose a separation method using properties.', learningObjective: 'Justify a separation method with a material property.' },
      { title: 'Particle models of matter', summary: 'Use particle arrangements to reason about observable states.', learningObjective: 'Explain a state-related observation with a particle model.' },
      { title: 'Representing chemical change', summary: 'Describe changes in substances using evidence and symbolic models.', learningObjective: 'Distinguish evidence of change from a chemical representation.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-bio',
    subjectName: 'Biology',
    subjectCode: 'BIO-09',
    chapterId: 'c9-bio-cells-ecosystems',
    chapterTitle: 'Cells, Organisms, and Ecosystems',
    topics: [
      { title: 'Cell structures and functions', summary: 'Relate major cell structures to their roles in an organism.', learningObjective: 'Explain how a cell structure contributes to a basic function.' },
      { title: 'Organization in living things', summary: 'Describe how living systems are organized from cells upward.', learningObjective: 'Compare levels of biological organization using examples.' },
      { title: 'Ecosystem relationships', summary: 'Represent interactions among organisms and their environment.', learningObjective: 'Use a simple model to explain an ecological relationship.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-english',
    subjectName: 'English Language and Literature',
    subjectCode: 'ENG-09',
    chapterId: 'c9-english-communication',
    chapterTitle: 'Critical Reading and Communication Pathway',
    topics: [
      { title: 'Theme and textual evidence', summary: 'Interpret a text and select details that support the interpretation.', learningObjective: 'Build a concise interpretation supported by textual evidence.' },
      { title: 'Language and tone', summary: 'Analyze how word choice and structure shape a text’s tone.', learningObjective: 'Explain the effect of a language choice using an example.' },
      { title: 'Structured writing', summary: 'Develop an argument with a clear position and relevant support.', learningObjective: 'Organize a response with a claim, evidence, and conclusion.' },
    ],
  },
  {
    gradeId: 'class-9',
    subjectId: 'c9-social-studies',
    subjectName: 'Social Science',
    subjectCode: 'SST-09',
    chapterId: 'c9-social-civic-inquiry',
    chapterTitle: 'Historical, Geographical, and Civic Inquiry',
    topics: [
      { title: 'Source-based historical reasoning', summary: 'Compare sources and identify perspective and context.', learningObjective: 'Support a historical explanation with evidence from a source.' },
      { title: 'Human and physical geography', summary: 'Interpret spatial patterns and relationships between people and place.', learningObjective: 'Use a map or data display to explain a geographic pattern.' },
      { title: 'Institutions and economic choices', summary: 'Explore how public institutions and economic decisions affect people.', learningObjective: 'Explain a civic or economic idea with a concrete example.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-math',
    chapterId: 'c10-math-functions-data',
    chapterTitle: 'Functions, Geometry, and Data Reasoning',
    topics: [
      { title: 'Relationships and representations', summary: 'Connect a real situation with a table, graph, or equation.', learningObjective: 'Choose and interpret a representation of a quantitative relationship.' },
      { title: 'Geometric reasoning', summary: 'Apply definitions and established properties to solve geometric problems.', learningObjective: 'Explain why a geometric method applies to a given problem.' },
      { title: 'Statistics and probability', summary: 'Summarize data and reason about outcomes using probability language.', learningObjective: 'Interpret a data summary or probability in context.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-phy',
    chapterId: 'c10-phy-energy-effects',
    chapterTitle: 'Energy, Magnetism, and Physical Effects',
    topics: [
      { title: 'Energy transfers and efficiency', summary: 'Track energy transfers and compare useful output with input.', learningObjective: 'Describe an energy transfer and identify where energy is dissipated.' },
      { title: 'Magnetic effects and fields', summary: 'Use field representations to reason about magnetic interactions.', learningObjective: 'Interpret a basic field representation and predict an interaction.' },
      { title: 'Evidence in physical models', summary: 'Use observations and equations together to explain physical behavior.', learningObjective: 'Connect a stated physical model to observable evidence.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-chem',
    chapterId: 'c10-chem-substances',
    chapterTitle: 'Substances, Reactions, and Applications',
    topics: [
      { title: 'Acids, bases, and indicators', summary: 'Compare common substances using indicator observations.', learningObjective: 'Use evidence from an indicator to classify a sample cautiously.' },
      { title: 'Metals, non-metals, and materials', summary: 'Relate observable material properties to uses and reactions.', learningObjective: 'Use a property to justify a material choice or prediction.' },
      { title: 'Carbon compounds in context', summary: 'Recognize patterns in familiar carbon-containing substances.', learningObjective: 'Describe a simple structure-property relationship.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-bio',
    chapterId: 'c10-bio-organisms',
    chapterTitle: 'Organisms, Inheritance, and Environment',
    topics: [
      { title: 'Coordination in organisms', summary: 'Describe how body systems coordinate responses to changes.', learningObjective: 'Trace a basic stimulus-response pathway.' },
      { title: 'Inheritance and variation', summary: 'Explore how inherited information relates to variation.', learningObjective: 'Distinguish inherited traits from acquired changes using examples.' },
      { title: 'Ecosystems and sustainability', summary: 'Relate organism interactions to ecosystem stability and change.', learningObjective: 'Explain a possible effect of a change in an ecosystem.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-english',
    subjectName: 'English Language and Literature',
    subjectCode: 'ENG-10',
    chapterId: 'c10-english-communication',
    chapterTitle: 'Critical Reading and Communication Pathway',
    topics: [
      { title: 'Interpretation and evidence', summary: 'Develop an interpretation and support it with precise textual details.', learningObjective: 'Write a focused interpretation that cites relevant evidence.' },
      { title: 'Purpose, audience, and form', summary: 'Adapt language and organization to a communication purpose.', learningObjective: 'Select a suitable structure and tone for a stated audience.' },
      { title: 'Editing for accuracy', summary: 'Review organization, grammar, and word choice for clarity.', learningObjective: 'Revise a response to improve precision and coherence.' },
    ],
  },
  {
    gradeId: 'class-10',
    subjectId: 'c10-social-studies',
    subjectName: 'Social Science',
    subjectCode: 'SST-10',
    chapterId: 'c10-social-civic-inquiry',
    chapterTitle: 'Historical, Geographical, and Civic Inquiry',
    topics: [
      { title: 'Evidence and historical interpretation', summary: 'Compare accounts and assess how evidence supports an interpretation.', learningObjective: 'Evaluate a claim by checking it against source evidence.' },
      { title: 'Resources, development, and sustainability', summary: 'Analyze how resource use and development choices affect places.', learningObjective: 'Explain a trade-off in a resource or development decision.' },
      { title: 'Democracy and economic decisions', summary: 'Explore how institutions and economic choices influence society.', learningObjective: 'Use a relevant example to explain a civic or economic concept.' },
    ],
  },
];

export function addSupplementalCurriculum(classes: CurriculumClass[]): CurriculumClass[] {
  return classes.map((curriculumClass) => {
    const additions = pathways.filter((pathway) => pathway.gradeId === curriculumClass.id);
    if (additions.length === 0) return curriculumClass;

    const subjects = [...curriculumClass.subjects];
    for (const pathway of additions) {
      const topics = pathway.topics.map((topic, index) => ({
        ...topic,
        id: `${pathway.chapterId}-t${index + 1}`,
        estimatedMinutes: topic.estimatedMinutes ?? 25,
      }));
      const existingSubject = subjects.find((subject) => subject.id === pathway.subjectId);
      if (existingSubject) {
        const nextNumber = existingSubject.chapters.reduce(
          (highest, chapter) => Math.max(highest, chapter.number),
          0
        ) + 1;
        const subjectIndex = subjects.indexOf(existingSubject);
        subjects[subjectIndex] = {
          ...existingSubject,
          chapters: [
            ...existingSubject.chapters,
            {
              id: pathway.chapterId,
              number: nextNumber,
              title: pathway.chapterTitle,
              textbookUnit: 'Curated learning cluster; not an official textbook unit',
              topics,
            },
          ],
        };
      } else if (pathway.subjectName && pathway.subjectCode) {
        const newSubject: SubjectItem = {
          id: pathway.subjectId,
          name: pathway.subjectName,
          code: pathway.subjectCode,
          streams: ['general'],
          chapters: [
            {
              id: pathway.chapterId,
              number: 1,
              title: pathway.chapterTitle,
              textbookUnit: 'Curated learning cluster; not an official textbook unit',
              topics,
            },
          ],
        };
        subjects.push(newSubject);
      }
    }

    return { ...curriculumClass, subjects };
  });
}
