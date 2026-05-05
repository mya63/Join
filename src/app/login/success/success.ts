import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-success',
  imports: [CommonModule],
  templateUrl: './success.html',
  styleUrls: ['./success.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginSuccess {
  @Input() show = false;
  @Input() message = 'You successfully signed up. Please log in.';
}
