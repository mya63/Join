import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-help',
  imports: [CommonModule],
  templateUrl: './help.html',
  styleUrl: './help.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Help {
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
