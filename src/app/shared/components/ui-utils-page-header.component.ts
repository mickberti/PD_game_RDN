import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

type UtilityGroup = "frame" | "component" | "data" | "admin" | "game";

interface UtilityHeaderLink {
  label: string;
  route: string;
}

const FRAME_LINKS: UtilityHeaderLink[] = [
  { label: "Frame Fix", route: "/utils/frame-fix" },  
  { label: "Frame Animation", route: "/utils/frame-animation" },
];

const COMPONENT_LINKS: UtilityHeaderLink[] = [
  { label: "Component Atlas Icon", route: "/utils/component-atlas-icon" },
  { label: "Component Viewer Icons", route: "/utils/component-viewer-icons" },
  { label: "Component Sprite Tester", route: "/utils/component-sprite-tester" },
  { label: "Component Animation", route: "/utils/component-animation" },
];

const ADMIN_LINKS: UtilityHeaderLink[] = [
  { label: "Collection editor", route: "/admin/collections" },
  { label: "Document Viewer", route: "/admin/documents" },
  { label: "Query Tester", route: "/admin/query-tester" },
  { label: "Seed DB", route: "/admin/seed-db" },
];

const DATA_LINKS: UtilityHeaderLink[] = [
  { label: "Mock Data Explorer", route: "/utils/data-mock" },
  { label: "Chest Item Tester", route: "/utils/chest-items-test" },
  { label: "Shop Progress Tester", route: "/utils/shop-progress-test" },
  { label: "Resource Milestone", route: "/utils/resource-milestone" },
];

const GAME_LINKS: UtilityHeaderLink[] = [
  { label: "Soluzioni Avventura", route: "/utils/rnd-solutions/adventure" },
  { label: "Soluzioni Time Attack", route: "/utils/rnd-solutions/time-attack" },
  { label: "Effetti Avventura", route: "/utils/rnd-effects/adventure" },
  { label: "Effetti Time Attack", route: "/utils/rnd-effects/time-attack" },
];

@Component({
  selector: "ui-utils-page-header",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="utils-page-header">
      <div class="utils-page-heading">
        <span class="utils-page-kicker">{{ groupLabel }}</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>

      <nav class="utils-page-menu" [attr.aria-label]="menuLabel">
        @for (link of links; track link.route) {
          <a
            [routerLink]="link.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >{{ link.label }}</a>
        }
      </nav>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: 18px;
      color: #f8fafc;
    }

    .utils-page-header {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 22px;
      padding: clamp(16px, 3vw, 24px);
      background:
        radial-gradient(circle at top left, rgba(125, 211, 252, 0.24), transparent 26rem),
        linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(30, 27, 75, 0.82));
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
    }

    .utils-page-heading {
      display: grid;
      gap: 6px;
    }

    .utils-page-kicker {
      color: #facc15;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(28px, 5vw, 42px);
      font-weight: 950;
      line-height: 1.04;
    }

    p {
      max-width: 860px;
      margin: 0;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.45;
    }

    .utils-page-menu {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .utils-page-menu a {
      border: 1px solid rgba(125, 211, 252, 0.52);
      border-radius: 999px;
      padding: 9px 14px;
      color: #e0f2fe;
      text-decoration: none;
      background: rgba(14, 165, 233, 0.12);
      font-weight: 850;
      transition: border-color 160ms ease, color 160ms ease, background 160ms ease, transform 160ms ease;
    }

    .utils-page-menu a:hover {
      transform: translateY(-1px);
      border-color: rgba(250, 204, 21, 0.7);
    }

    .utils-page-menu a.active {
      border-color: #facc15;
      color: #111827;
      background: linear-gradient(180deg, #fde68a, #f59e0b);
      box-shadow: 0 10px 22px rgba(245, 158, 11, 0.24);
    }
  `],
})
export class UiUtilsPageHeaderComponent {
  @Input({ required: true }) title = "";
  @Input({ required: true }) description = "";
  @Input({ required: true }) group: UtilityGroup = "component";

  get links(): UtilityHeaderLink[] {
    if (this.group === "frame") {
      return FRAME_LINKS;
    }

    if (this.group === "data") {
      return DATA_LINKS;
    }
	
	if (this.group === "admin") {
	      return ADMIN_LINKS;
	    }

    if (this.group === "game") {
      return GAME_LINKS;
    }

    return COMPONENT_LINKS;
  }

  get groupLabel(): string {
    if (this.group === "frame") {
      return "Frame utilities";
    }

    if (this.group === "data") {
      return "Dati utilities";
    }

    if (this.group === "game") {
      return "Game utilities";
    }

    return "Component utilities";
  }

  get menuLabel(): string {
    if (this.group === "frame") {
      return "Navigazione utility frame";
    }

    if (this.group === "data") {
      return "Navigazione utility dati";
    }

    if (this.group === "game") {
      return "Navigazione utility game";
    }

    return "Navigazione utility componenti";
  }
}
