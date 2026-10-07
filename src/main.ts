import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from './app/app.config';
import { AppComponent } from "./app/app.component";
import { STARTUP_SPLASH_DURATION_MS, STARTUP_SPLASH_ENABLED } from "./app/core/config/startup-splash.config";

const waitForStartupSplash = () => new Promise<void>((resolve) => {
  if (!STARTUP_SPLASH_ENABLED) {
    document.getElementById("startup-splash")?.remove();
    resolve();
    return;
  }

  window.setTimeout(resolve, STARTUP_SPLASH_DURATION_MS);
});

async function startApplication(): Promise<void> {
  try {
    // Prepare the boot route behind the publisher splash so it is immediately
    // visible when the configured presentation time has elapsed.
    await waitForStartupSplash();
    document.getElementById("startup-splash")?.remove();
    const bootstrap = bootstrapApplication(AppComponent, appConfig);
    await bootstrap;
  } catch (err) {
    console.error(err);
  }
}

void startApplication();
