import type { AssessmentQuestion, ChapterItem, SubjectItem, TopicItem } from '../types/studyverse';

const CURATED_TOPIC_QUESTIONS: Record<string, AssessmentQuestion[]> = {
  'c10-math-t1': [
    {
      id: 'c10-math-t1-q1',
      prompt: 'For the quadratic equation ax² + bx + c = 0 (a ≠ 0), when are the roots real and equal?',
      options: ['b² - 4ac > 0', 'b² - 4ac = 0', 'b² - 4ac < 0', 'a + b + c = 0'],
      correctIndex: 1,
      difficulty: 'Foundation',
      explanation: 'When the discriminant Δ = b² - 4ac equals 0, both roots equal -b / (2a).',
    },
    {
      id: 'c10-math-t1-q2',
      prompt: 'What is the discriminant of 2x² - 4x + 3 = 0?',
      options: ['-8', '8', '40', '0'],
      correctIndex: 0,
      difficulty: 'Challenge',
      explanation: 'Δ = (-4)² - 4(2)(3) = 16 - 24 = -8, so there are no real roots.',
    },
    {
      id: 'c10-math-t1-q3',
      prompt: 'If a quadratic equation has two distinct real roots, which condition holds?',
      options: ['Δ = 0', 'Δ < 0', 'Δ > 0', 'b = 0'],
      correctIndex: 2,
      difficulty: 'Board Standard',
      explanation: 'Positive discriminant Δ > 0 gives two distinct real roots.',
    },
  ],
  'c10-math-t2': [
    {
      id: 'c10-math-t2-q1',
      prompt: 'Which expression gives the nth term of an Arithmetic Progression with first term a and common difference d?',
      options: ['a + nd', 'a + (n - 1)d', 'a × d^(n - 1)', 'n/2 [2a + (n - 1)d]'],
      correctIndex: 1,
      difficulty: 'Foundation',
      explanation: 'The nth term formula for an AP is aₙ = a + (n - 1)d.',
    },
    {
      id: 'c10-math-t2-q2',
      prompt: 'In the AP 5, 9, 13, 17, ..., what is the common difference d?',
      options: ['3', '4', '5', '-4'],
      correctIndex: 1,
      difficulty: 'Board Standard',
      explanation: '9 - 5 = 4 and 13 - 9 = 4.',
    },
  ],
  'c10-sci-t1': [
    {
      id: 'c10-sci-t1-q1',
      prompt: 'Which mirror formula correctly relates focal length f, image distance v, and object distance u?',
      options: ['1/f = 1/v - 1/u', '1/f = 1/v + 1/u', 'f = u + v', '1/f = u × v'],
      correctIndex: 1,
      difficulty: 'Board Standard',
      explanation: 'The spherical mirror formula is 1/f = 1/v + 1/u under standard New Cartesian sign convention.',
    },
    {
      id: 'c10-sci-t1-q2',
      prompt: 'For a concave mirror, the focal length f under the New Cartesian sign convention is:',
      options: ['Always positive', 'Always negative', 'Zero', 'Equal to object height'],
      correctIndex: 1,
      difficulty: 'Foundation',
      explanation: 'The principal focus of a concave mirror lies in front of the reflecting surface (negative x-axis).',
    },
  ],
  'c10-sci-t2': [
    {
      id: 'c10-sci-t2-q1',
      prompt: 'In a balanced chemical equation, which physical law is satisfied?',
      options: ['Law of Conservation of Mass', 'Ohm’s Law', 'Boyle’s Law', 'Law of Reflection'],
      correctIndex: 0,
      difficulty: 'Foundation',
      explanation: 'Total atoms of each element must remain equal on reactant and product sides.',
    },
    {
      id: 'c10-sci-t2-q2',
      prompt: 'Zn + CuSO₄ → ZnSO₄ + Cu is an example of which reaction type?',
      options: ['Combination', 'Thermal decomposition', 'Single displacement', 'Neutralisation'],
      correctIndex: 2,
      difficulty: 'Board Standard',
      explanation: 'More reactive zinc displaces copper from copper(II) sulphate solution.',
    },
  ],
  'i1-phys-t1': [
    {
      id: 'i1-phys-t1-q1',
      prompt: 'At which launch angle (neglecting air resistance) is the horizontal range of a projectile maximum for a given speed u?',
      options: ['30°', '45°', '60°', '90°'],
      correctIndex: 1,
      difficulty: 'Challenge',
      explanation: 'Range R = (u² sin 2θ)/g reaches its maximum when sin 2θ = 1, i.e., θ = 45°.',
    },
    {
      id: 'i1-phys-t1-q2',
      prompt: 'At the highest point of a projectile trajectory, which velocity component becomes zero?',
      options: ['Horizontal component u cos θ', 'Vertical component v_y', 'Resultant speed', 'Acceleration due to gravity'],
      correctIndex: 1,
      difficulty: 'Foundation',
      explanation: 'Vertical velocity is 0 at maximum height while horizontal velocity u cos θ stays constant.',
    },
  ],
};

export function getCurriculumQuestionsForContext(
  subject: SubjectItem,
  chapter: ChapterItem,
  topic: TopicItem,
  limit: number = 5,
  difficulty: AssessmentQuestion['difficulty'] = 'Board Standard',
  random: () => number = Math.random
): AssessmentQuestion[] {
  void subject;
  void chapter;
  const eligible = (CURATED_TOPIC_QUESTIONS[topic.id] ?? []).filter(
    (question) => question.difficulty === difficulty
  );
  const shuffled = [...eligible];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const boundedLimit = Math.max(0, Math.min(20, Math.floor(limit)));
  return shuffled.slice(0, boundedLimit);
}
