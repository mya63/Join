import { User } from '@angular/fire/auth';

const CONTACT_COLORS = ['#FF7A00', '#9327FF', '#6E52FF', '#FC71FF', '#FFBB2B', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8', '#FF5EC4', '#3DFF8A'];

export function buildSelfContactPayload(user: User, name: string, surname: string): Record<string, unknown> {
  const fallbackName = getFallbackName(user.email || '');
  return {
    ownerId: user.uid,
    uid: user.uid,
    date: new Date(),
    color: getRandomColor(),
    name: name || fallbackName,
    surname: surname || '',
    email: user.email || '',
    phone: '',
  };
}

function getFallbackName(email: string): string {
  const local = email.split('@')[0] || 'User';
  if (!local) return 'User';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function getRandomColor(): string {
  return CONTACT_COLORS[Math.floor(Math.random() * CONTACT_COLORS.length)];
}