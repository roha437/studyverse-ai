import type { AssessmentQuestion, ChapterItem, SubjectItem, TopicItem } from '../types/studyverse';

const CURATED_TOPIC_QUESTIONS: Record<string, AssessmentQuestion[]> = {
  'c10-math-t1': [
    {
      id: 'c10-math-t1-q1',
      prompt: 'For the quadratic equation ax² + bx + c = 0 (a ≠ 0), when are the roots real and equal?',
      options: ['b² - 4ac > 0', 'b² - 4ac = 0', 'b² - 4ac < 0', 'a + b + c = 0'],
      correctIndex: 1,
      explanation: 'When the discriminant Δ = b² - 4ac equals 0, both roots equal -b / (2a).',
    },
    {
      id: 'c10-math-t1-q2',
      prompt: 'What is the discriminant of 2x² - 4x + 3 = 0?',
      options: ['-8', '8', '40', '0'],
      correctIndex: 0,
      explanation: 'Δ = (-4)² - 4(2)(3) = 16 - 24 = -8, so there are no real roots.',
    },
    {
      id: 'c10-math-t1-q3',
      prompt: 'If a quadratic equation has two distinct real roots, which condition holds?',
      options: ['Δ = 0', 'Δ < 0', 'Δ > 0', 'b = 0'],
      correctIndex: 2,
      explanation: 'Positive discriminant Δ > 0 gives two distinct real roots.',
    },
  ],
  'c10-math-t2': [
    {
      id: 'c10-math-t2-q1',
      prompt: 'Which expression gives the nth term of an Arithmetic Progression with first term a and common difference d?',
      options: ['a + nd', 'a + (n - 1)d', 'a × d^(n - 1)', 'n/2 [2a + (n - 1)d]'],
      correctIndex: 1,
      explanation: 'The nth term formula for an AP is aₙ = a + (n - 1)d.',
    },
    {
      id: 'c10-math-t2-q2',
      prompt: 'In the AP 5, 9, 13, 17, ..., what is the common difference d?',
      options: ['3', '4', '5', '-4'],
      correctIndex: 1,
      explanation: '9 - 5 = 4 and 13 - 9 = 4.',
    },
  ],
  'c10-sci-t1': [
    {
      id: 'c10-sci-t1-q1',
      prompt: 'Which mirror formula correctly relates focal length f, image distance v, and object distance u?',
      options: ['1/f = 1/v - 1/u', '1/f = 1/v + 1/u', 'f = u + v', '1/f = u × v'],
      correctIndex: 1,
      explanation: 'The spherical mirror formula is 1/f = 1/v + 1/u under standard New Cartesian sign convention.',
    },
    {
      id: 'c10-sci-t1-q2',
      prompt: 'For a concave mirror, the focal length f under the New Cartesian sign convention is:',
      options: ['Always positive', 'Always negative', 'Zero', 'Equal to object height'],
      correctIndex: 1,
      explanation: 'The principal focus of a concave mirror lies in front of the reflecting surface (negative x-axis).',
    },
  ],
  'c10-sci-t2': [
    {
      id: 'c10-sci-t2-q1',
      prompt: 'In a balanced chemical equation, which physical law is satisfied?',
      options: ['Law of Conservation of Mass', 'Ohm’s Law', 'Boyle’s Law', 'Law of Reflection'],
      correctIndex: 0,
      explanation: 'Total atoms of each element must remain equal on reactant and product sides.',
    },
    {
      id: 'c10-sci-t2-q2',
      prompt: 'Zn + CuSO₄ → ZnSO₄ + Cu is an example of which reaction type?',
      options: ['Combination', 'Thermal decomposition', 'Single displacement', 'Neutralisation'],
      correctIndex: 2,
      explanation: 'More reactive zinc displaces copper from copper(II) sulphate solution.',
    },
  ],
  'i1-phys-t1': [
    {
      id: 'i1-phys-t1-q1',
      prompt: 'At which launch angle (neglecting air resistance) is the horizontal range of a projectile maximum for a given speed u?',
      options: ['30°', '45°', '60°', '90°'],
      correctIndex: 1,
      explanation: 'Range R = (u² sin 2θ)/g reaches its maximum when sin 2θ = 1, i.e., θ = 45°.',
    },
    {
      id: 'i1-phys-t1-q2',
      prompt: 'At the highest point of a projectile trajectory, which velocity component becomes zero?',
      options: ['Horizontal component u cos θ', 'Vertical component v_y', 'Resultant speed', 'Acceleration due to gravity'],
      correctIndex: 1,
      explanation: 'Vertical velocity is 0 at maximum height while horizontal velocity u cos θ stays constant.',
    },
  ],
};

export function getCurriculumQuestionsForContext(
  subject: SubjectItem,
  chapter: ChapterItem,
  topic: TopicItem,
  limit: number = 5
): AssessmentQuestion[] {
  const curated = CURATED_TOPIC_QUESTIONS[topic.id] ?? [];

  const topicSiblingQuestions: AssessmentQuestion[] = [
    {
      id: `${topic.id}-concept-1`,
      prompt: `Which textbook chapter covers "${topic.title}" in ${subject.name}?`,
      options: [
        `Chapter ${chapter.number}: ${chapter.title}`,
        'Appendix: Laboratory Safety',
        'Supplementary Bibliography',
        'General Reference Index',
      ],
      correctIndex: 0,
      explanation: `"${topic.title}" belongs to ${chapter.textbookUnit} (${chapter.title}).`,
    },
    {
      id: `${topic.id}-concept-2`,
      prompt: `What is the primary learning focus of "${topic.title}"?`,
      options: [
        topic.summary,
        'Memorizing unrelated historical dates without derivations',
        'Skipping foundational units and definitions',
        'Unverified external trivia outside the syllabus',
      ],
      correctIndex: 0,
      explanation: `Textbook scope: ${topic.summary}`,
    },
  ];

  if (topic.keyFormula) {
    topicSiblingQuestions.push({
      id: `${topic.id}-formula-1`,
      prompt: `Identify the verified textbook relation associated with "${topic.title}":`,
      options: [
        topic.keyFormula,
        'E = m + c',
        'P = V / I²',
        'y = x³ + 0',
      ],
      correctIndex: 0,
      explanation: `Key textbook relation for ${topic.title}: ${topic.keyFormula}`,
    });
  }

  const combined = [...curated, ...topicSiblingQuestions];
  return combined.slice(0, Math.min(limit, combined.length));
}
