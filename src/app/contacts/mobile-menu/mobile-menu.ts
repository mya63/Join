import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FbService } from '../../services/fb-service';

@Component({
  selector: 'app-mobile-menu',
  imports: [CommonModule],
  templateUrl: './mobile-menu.html',
  styleUrls: ['./mobile-menu.scss'],
})
export class MobileMenu {
  fbService = inject(FbService);

  isClosing = signal(false);

  @Input() contactId!: string;
  @Input() inline = false;
  /**
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  /**
   * Emits edit action for the selected contact.
   * @returns {void} No return value.
   */
  onEdit(): void {
    this.edit.emit(this.contactId ?? '');
    this.startClosingAnimation();
  }

  /**
   * Emits delete action and starts overlay closing animation.
   * @returns {void} No return value.
   */
  onDelete(): void {
    this.delete.emit(this.contactId ?? '');
    this.fbService.contactlistHidden = false;
    this.startClosingAnimation();
  }

  /**
   * Closes the overlay when the backdrop is clicked.
   * @param {MouseEvent} ev - Backdrop click event.
   * @returns {void} No return value.
   */
  onBackdropClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('overlay')) {
      this.startClosingAnimation();
    }
  }

  /**
   * Starts the closing animation state.
   * @returns {void} No return value.
   */
  startClosingAnimation(): void {
    this.isClosing.set(true);
  }

  /**
   * Emits close event after closing animation finishes.
   * @returns {void} No return value.
   */
  onAnimationEnd(): void {
    if (this.isClosing()) {
      this.close.emit();
    }
  }
}
