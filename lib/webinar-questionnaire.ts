
export type WebinarQuestion = {
  id: "q1" | "q2" | "q3" | "q4";
  step: number;
  title: string;
  question: string;
  helpText: string;
  placeholder: string;
};

export const WEBINAR_QUESTIONS: WebinarQuestion[] = [
  {
    id: "q1",
    step: 1,
    title: "Business Idea",
    question: "Tell me about your business or business idea. (What do you do, or what do you want to be known for?)",
    helpText: "Share what services, products, or core methodology you deliver or want to build your reputation around.",
    placeholder: "e.g. We provide done-for-you outbound lead generation for B2B tech startups...",
  },
  {
    id: "q2",
    step: 2,
    title: "Ideal Buyer",
    question: "Who do you think your ideal buyer would be for this program or service? (Describe in a sentence or two — age, role, or situation.)",
    helpText: "Describe who has the urgency and budget: their job title, business stage, or specific circumstance.",
    placeholder: "e.g. B2B Founders and VP of Sales at 10–50 person companies with $1M–$5M ARR...",
  },
  {
    id: "q3",
    step: 3,
    title: "Problem & Transformation",
    question: "What’s the biggest problem you want to help them solve — and the result or transformation you’d love them to achieve?",
    helpText: "Detail their acute pain or bottleneck, plus the concrete dream milestone or measurable outcome they reach.",
    placeholder: "e.g. They struggle with unpredictable sales pipelines. We help them scale from inconsistent revenue to 15+ qualified enterprise meetings every month...",
  },
  {
    id: "q4",
    step: 4,
    title: "Hesitation / Objection",
    question: "What’s one hesitation or objection you think they might have about working with you?",
    helpText: "What skepticism or past disappointment might hold them back? (e.g. price, time commitment, doubt that it works for their niche).",
    placeholder: "e.g. They worry they don't have enough internal team bandwidth, or that outbound won't work in their specialized niche...",
  },
];

export type WebinarAnswers = {
  q1_business?: string;
  q2_buyer?: string;
  q3_problem_transformation?: string;
  q4_objection?: string;
};

export type QuestionnaireStatus = {
  currentStep: number; // 1 to 4: in progress, 5: completed
  activeQuestion: WebinarQuestion | null;
  completedQuestions: WebinarQuestion[];
  isComplete: boolean;
  answers: WebinarAnswers;
};

/**
 * Determine current questionnaire step based on collected answers
 */
export function getQuestionnaireStatus(answers: WebinarAnswers = {}): QuestionnaireStatus {
  const completed: WebinarQuestion[] = [];
  if (answers.q1_business?.trim()) completed.push(WEBINAR_QUESTIONS[0]);
  if (answers.q2_buyer?.trim()) completed.push(WEBINAR_QUESTIONS[1]);
  if (answers.q3_problem_transformation?.trim()) completed.push(WEBINAR_QUESTIONS[2]);
  if (answers.q4_objection?.trim()) completed.push(WEBINAR_QUESTIONS[3]);

  let currentStep = 1;
  if (!answers.q1_business?.trim()) currentStep = 1;
  else if (!answers.q2_buyer?.trim()) currentStep = 2;
  else if (!answers.q3_problem_transformation?.trim()) currentStep = 3;
  else if (!answers.q4_objection?.trim()) currentStep = 4;
  else currentStep = 5;

  const isComplete = currentStep === 5;
  const activeQuestion = isComplete ? null : WEBINAR_QUESTIONS[currentStep - 1] ?? null;

  return {
    currentStep,
    activeQuestion,
    completedQuestions: completed,
    isComplete,
    answers,
  };
}
