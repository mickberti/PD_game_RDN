import { Routes } from "@angular/router";
import { AuthGuard } from "./core/guards/auth.guard";
import { AdminGuard } from "./core/guards/admin.guard";
import { AdminShellPage } from "./pages/utils/admin/admin-shell.page";

export const routes: Routes = [
  { path: "", redirectTo: "boot", pathMatch: "full" },
  {
  	path: 'boot',
  	loadComponent: () => import('./pages/boot/boot.page').then((m) => m.BootPage)
  },
  {
  	path: 'login',
  	loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
  	path: 'login0',
  	loadComponent: () => import('./pages/login/login0.page').then((m) => m.Login0Page)
  },
  {
  	path: 'login1',
  	loadComponent: () => import('./pages/login/login1.page').then((m) => m.Login1Page)
  },
  {
  	path: 'login2',
  	loadComponent: () => import('./pages/login/login2.page').then((m) => m.Login2Page)
  },
  {
  	path: 'profile',
  	canActivate: [AuthGuard],
  	loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage)
  },
  {
    path: "utils/component-sprite-tester",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/components/sprite/sprite-tester.page").then(
        (m) => m.SpriteTesterPage,
      ),
  },
  {
    path: "utils/component-atlas-icon",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/components/atlas/atlas-icons.page").then(
        (m) => m.AtlasIconsPage,
      ),
  },
  {
    path: "utils/frame-animation",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/components/atlas/atlas-icons.page").then(
        (m) => m.AtlasIconsPage,
      ),
    data: { atlasScope: "heroes" },
  },
  {
    path: "utils/frame-fix",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/frame/frame-fix/frame-fix.page").then(
        (m) => m.FrameFixPage,
      ),
  },
  {
    path: "gameplay",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/gameplay/gameplay-page.component").then(
        (m) => m.GameplayPageComponent,
      ),
  },
  {
    path: "utils/effect-playground",
    // The playground is an admin tool, including in the Capacitor production build.
    canActivate: [AdminGuard],
    loadComponent: () => import("./pages/gameplay/gameplay-page.component").then((m) => m.GameplayPageComponent),
  },
  {
    path: "utils/rnd-solutions/adventure",
    canActivate: [AdminGuard],
    loadComponent: () => import("./pages/utils/rnd-solutions/rnd-solution-table.page").then((m) => m.RdnSolutionTablePage),
    data: { variant: "adventure" },
  },
  {
    path: "utils/rnd-solutions/time-attack",
    canActivate: [AdminGuard],
    loadComponent: () => import("./pages/utils/rnd-solutions/rnd-solution-table.page").then((m) => m.RdnSolutionTablePage),
    data: { variant: "time-attack" },
  },
  {
    path: "utils/rnd-effects/adventure",
    canActivate: [AdminGuard],
    loadComponent: () => import("./pages/utils/rnd-effects-summary/rnd-effects-summary.page").then((m) => m.RdnEffectsSummaryPage),
    data: { variant: "adventure" },
  },
  {
    path: "utils/rnd-effects/time-attack",
    canActivate: [AdminGuard],
    loadComponent: () => import("./pages/utils/rnd-effects-summary/rnd-effects-summary.page").then((m) => m.RdnEffectsSummaryPage),
    data: { variant: "time-attack" },
  },
  {
    path: "game-guide",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/game-guide/game-guide.page").then((m) => m.GameGuidePage),
  },
  {
    path: "pause",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/pause/pause.page").then((m) => m.PausePage),
  },
  {
    path: "hub",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hub/hub.page").then((m) => m.HubPage),
  },
  {
    path: "settings",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/settings/settings.page").then((m) => m.SettingsPage),
  },
  {
    path: "inventory",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/inventory/inventory.page").then(
        (m) => m.InventoryPage,
      ),
  },
  {
    path: "shop",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/shop/shop.page").then(
        (m) => m.ShopPage,
      ),
  },
  {
    path: "shop/:category",
    pathMatch: "full",
    redirectTo: "shop",
  },
  {
    path: "award",
    canActivate: [AuthGuard],
    loadComponent: () => import("./pages/award/award.page").then((m) => m.AwardPage),
  },
  { path: "reward", pathMatch: "full", redirectTo: "award" },
  {
  	path: 'admin',
	canActivate: [AdminGuard],
  	component: AdminShellPage,
  	children: [
  		{ path: '', pathMatch: 'full', redirectTo: 'collections' },
  		{
  			path: 'collections',
  			canActivate: [AdminGuard],
  			loadComponent: () => import('./pages/utils/admin/collection-editor/collection-editor.page').then((m) => m.CollectionEditorPage)
  		},
  		{
  			path: 'documents',
  			canActivate: [AdminGuard],
  			loadComponent: () => import('./pages/utils/admin/document-editor/document-editor.page').then((m) => m.DocumentEditorPage)
  		},
  		{
  			path: 'query-tester',
  			canActivate: [AdminGuard],
  			loadComponent: () => import('./pages/utils/admin/query-tester/query-tester.page').then((m) => m.QueryTesterPage)
		},
		{
			path: 'seed-db',
			canActivate: [AdminGuard],
			loadComponent: () => import('./pages/utils/admin/seed-db/seed-db.page').then((m) => m.SeedDbPage)
		}
  	]
  },
  { path: "**", redirectTo: "hub" },
];
