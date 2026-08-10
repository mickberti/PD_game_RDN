import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-progress-login',
  standalone: true,
  template: `<div class="bar"><div class="fill" [style.width.%]="value"></div></div>`,
  styles: [`.bar { width:min(78vw,360px); height:18px; border-radius:999px; padding:3px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); overflow:hidden; } .fill { height:100%; border-radius:999px; background:linear-gradient(90deg, #22c55e, #86efac); box-shadow:0 0 18px rgba(34,197,94,.85); transition:width .16s linear; }`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressLoginComponent { @Input() value = 0; }
