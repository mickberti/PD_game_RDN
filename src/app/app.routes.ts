import { Routes } from "@angular/router";
import { AuthGuard } from "./core/guards/auth.guard";
import { AdminGuard } from "./core/guards/admin.guard";
import { EffectPlaygroundGuard } from "./core/guards/effect-playground.guard";
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
    path: "welcome",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/welcome/welcome.page").then((m) => m.WelcomePage),
  },
  {
  	path: 'profile',
  	canActivate: [AuthGuard],
  	loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage)
  },
  {
    path: "utils/data-mock",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/data-mock/data-mock.page").then(
        (m) => m.DataMockPage,
      ),
  },

  {
    path: "utils/chest-items-test",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/data-mock/chest-items-test.page").then((m) => m.ChestItemsTestPage),
  },
  {
    path: "utils/shop-progress-test",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/data-mock/shop-progress-test.page").then((m) => m.ShopProgressTestPage),
  },
  {
    path: "utils/resource-milestone",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/data-mock/resourseMilestone.page").then((m) => m.ResourseMilestonePage),
  },
  {
    path: "utils/component-viewer-icons",
	canActivate: [AdminGuard],
    loadComponent: () =>
      import("./pages/utils/components/components/viewer-icons.page").then(
        (m) => m.ViewerIconsPage,
      ),
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
    canActivate: [AdminGuard, EffectPlaygroundGuard],
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
    path: "stats-hero",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero/hero.page").then(
        (m) => m.HeroPage,
      ),
  },
  {
    path: "hero",
  canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero/hero.page").then(
        (m) => m.HeroPage,
      ),
  },
  {
    path: "hero/:view",
  canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero/hero.page").then(
        (m) => m.HeroPage,
      ),
  },
  {
    path: "hero/:view/:type",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero/hero.page").then(
        (m) => m.HeroPage,
      ),
  },
  {
    path: "hero-upgrade",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero-upgrade/hero-upgrade.page").then(
        (m) => m.HeroUpgradePage,
      ),
  },
  {
    path: "hero-equip/:type",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/hero-equip/hero-equip.page").then(
        (m) => m.HeroEquipPage,
      ),
  },
  {
    path: "pause",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/pause/pause.page").then((m) => m.PausePage),
  },
  {
    path: "results/:status",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/results/results.page").then((m) => m.ResultsPage),
  },
  {
    path: "ranking",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/ranking/ranking.page").then((m) => m.RankingPage),
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
      path: "reward",
	  canActivate: [AuthGuard],
      loadComponent: () =>
        import("./pages/award/award.page").then((m) => m.AwardPage),
  },
  {
    path: "award/event/:category",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/award/award.page").then((m) => m.AwardPage),
  },
  {
    path: "award/:category",
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/award/award.page").then((m) => m.AwardPage),
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
	canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/shop/shop.page").then(
        (m) => m.ShopPage,
      ),
  },
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
