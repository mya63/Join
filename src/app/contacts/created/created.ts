import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-created',
  imports: [CommonModule],
  templateUrl: './created.html',
  styleUrls: ['./created.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Created {
  @Input() show = false; // Sichtbarkeit durch [show]="toastOpen"
}
