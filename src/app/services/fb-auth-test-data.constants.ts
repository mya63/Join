export type TestContactTemplate = {
  key: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  color: string;
};

export type TestTaskTemplate = {
  key: string;
  title: string;
  description: string;
  dueOffsetDays: number;
  status: 'to-do' | 'in-progress' | 'await-feedback' | 'done';
  priority: 'low' | 'medium' | 'urgent';
  category: { category: number; categoryProperties: { name: string; color: string }[] };
  subTasks: { subtaskTitle: string; subtaskCompleted: boolean; onEdit: boolean }[];
};

export const TEST_CONTACTS: readonly TestContactTemplate[] = [
  { key: 'tc-01', name: 'Liam', surname: 'Carter', email: 'liam.carter@join.local', phone: '+49 151 90000001', color: '#FF7A00' },
  { key: 'tc-02', name: 'Emma', surname: 'Fischer', email: 'emma.fischer@join.local', phone: '+49 151 90000002', color: '#9327FF' },
  { key: 'tc-03', name: 'Noah', surname: 'Becker', email: 'noah.becker@join.local', phone: '+49 151 90000003', color: '#6E52FF' },
  { key: 'tc-04', name: 'Mia', surname: 'Wagner', email: 'mia.wagner@join.local', phone: '+49 151 90000004', color: '#FC71FF' },
  { key: 'tc-05', name: 'Elias', surname: 'Schmidt', email: 'elias.schmidt@join.local', phone: '+49 151 90000005', color: '#FFBB2B' },
  { key: 'tc-06', name: 'Sofia', surname: 'Keller', email: 'sofia.keller@join.local', phone: '+49 151 90000006', color: '#1FD7C1' },
  { key: 'tc-07', name: 'Jonas', surname: 'Hartmann', email: 'jonas.hartmann@join.local', phone: '+49 151 90000007', color: '#462F8A' },
  { key: 'tc-08', name: 'Lina', surname: 'Krause', email: 'lina.krause@join.local', phone: '+49 151 90000008', color: '#FF4646' },
  { key: 'tc-09', name: 'Finn', surname: 'Neumann', email: 'finn.neumann@join.local', phone: '+49 151 90000009', color: '#00BEE8' },
  { key: 'tc-10', name: 'Hannah', surname: 'Wolf', email: 'hannah.wolf@join.local', phone: '+49 151 90000010', color: '#FF5EC4' }
];

export const TEST_TASKS: readonly TestTaskTemplate[] = [
  {
    key: 'tt-01',
    title: 'Prepare onboarding package',
    description: 'Collect access data, profile details and welcome material for the new teammate.',
    dueOffsetDays: 1,
    status: 'to-do',
    priority: 'medium',
    category: { category: 1, categoryProperties: [{ name: 'User Story', color: '#0038FF' }] },
    subTasks: [
      { subtaskTitle: 'Create workspace account', subtaskCompleted: false, onEdit: false },
      { subtaskTitle: 'Share onboarding checklist', subtaskCompleted: false, onEdit: false }
    ]
  },
  {
    key: 'tt-02',
    title: 'Design login banner',
    description: 'Draft responsive login banner variants and prepare final export assets.',
    dueOffsetDays: 2,
    status: 'in-progress',
    priority: 'urgent',
    category: { category: 2, categoryProperties: [{ name: 'Design', color: '#1FD7C1' }] },
    subTasks: [
      { subtaskTitle: 'Create desktop version', subtaskCompleted: true, onEdit: false },
      { subtaskTitle: 'Create mobile version', subtaskCompleted: false, onEdit: false }
    ]
  },
  {
    key: 'tt-03',
    title: 'Implement contact search',
    description: 'Add debounced search logic and ensure empty-state behavior is correct.',
    dueOffsetDays: 3,
    status: 'await-feedback',
    priority: 'medium',
    category: { category: 3, categoryProperties: [{ name: 'Technical Task', color: '#9327FF' }] },
    subTasks: [
      { subtaskTitle: 'Add search input signal', subtaskCompleted: true, onEdit: false },
      { subtaskTitle: 'Validate filtering in contacts list', subtaskCompleted: true, onEdit: false }
    ]
  },
  {
    key: 'tt-04',
    title: 'Write regression checklist',
    description: 'Document key board and contact flows for pre-release validation.',
    dueOffsetDays: 4,
    status: 'to-do',
    priority: 'low',
    category: { category: 4, categoryProperties: [{ name: 'Review', color: '#FF7A00' }] },
    subTasks: [
      { subtaskTitle: 'List smoke test cases', subtaskCompleted: false, onEdit: false },
      { subtaskTitle: 'Define pass/fail criteria', subtaskCompleted: false, onEdit: false }
    ]
  },
  {
    key: 'tt-05',
    title: 'Release prep sync',
    description: 'Summarize open blockers and align final release timeline with team leads.',
    dueOffsetDays: 5,
    status: 'done',
    priority: 'urgent',
    category: { category: 5, categoryProperties: [{ name: 'Management', color: '#FF5EC4' }] },
    subTasks: [
      { subtaskTitle: 'Prepare agenda', subtaskCompleted: true, onEdit: false },
      { subtaskTitle: 'Share action items', subtaskCompleted: true, onEdit: false }
    ]
  }
];
