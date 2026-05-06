import { Routes } from '@angular/router';
import { crud } from './crud/crud';
import { Tasktest } from './tasktest/tasktest';
import { Contacts } from './contacts/contacts';
import { Board } from './board/board';
import { BoardCard } from './board/board-card/board-card';
import { Login } from './login/login';
import { SignUp } from './login/sign-up/sign-up';
import { Intro } from './login/intro/intro';
import { AppShell } from './shared/layout/app-shell/app-shell';
import { LegalNotice } from './legal/legal-notice/legal-notice';
import { PrivacyPolicy } from './legal/privacy-policy/privacy-policy';
import { Summary } from './summary/summary';
import { Help } from './help/help';
import { AddTask } from './addtask/addtask';

export const routes: Routes = [

   { path: '', component: Intro },
   { path: 'login', component: Login },
   { path: 'sign-up', component: SignUp },
   { path: 'summary', component: Summary },
   { path: 'help', component: Help },
   { path: 'contacts', component: Contacts },
   { path: 'board', component: Board },
   { path: 'add-task', component: AddTask },
   { path: 'addtask', component: AddTask },
   { path: 'crud', component: crud },
   { path: 'tasktest', component: Tasktest },
   // { path: 'addc', component: AddContactComponent },
   { path: 'legal-notice', component: LegalNotice },
   { path: 'privacy-policy', component: PrivacyPolicy },


];
