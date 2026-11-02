import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const file = (path) => readFile(resolve(root, path), 'utf8');
const capture = (text, regex, label, errors) => { const value = text.match(regex)?.[1]; if (!value) errors.push(`Missing ${label}`); return value; };
const errors = [];
try {
  const [cap, gradle, variables, google] = await Promise.all([
    file('capacitor.config.ts'), file('android/app/build.gradle'), file('android/variables.gradle'), file('android/app/google-services.json')
  ]);
  const appId = capture(cap, /appId:\s*['"]([^'"]+)/, 'Capacitor appId', errors);
  const applicationId = capture(gradle, /applicationId\s+['"]([^'"]+)/, 'Gradle applicationId', errors);
  const namespace = capture(gradle, /namespace\s*=\s*['"]([^'"]+)/, 'Gradle namespace', errors);
  const versionCode = capture(gradle, /versionCode\s+(\d+)/, 'versionCode', errors);
  const versionName = capture(gradle, /versionName\s+['"]([^'"]+)/, 'versionName', errors);
  const minSdk = capture(variables, /minSdkVersion\s*=\s*(\d+)/, 'minSdk', errors);
  const targetSdk = capture(variables, /targetSdkVersion\s*=\s*(\d+)/, 'targetSdk', errors);
  const webDir = capture(cap, /webDir:\s*['"]([^'"]+)/, 'webDir', errors);
  const packages = JSON.parse(google).client?.map((client) => client.client_info?.android_client_info?.package_name).filter(Boolean) ?? [];
  if (appId !== applicationId || appId !== namespace) errors.push('Capacitor appId, Gradle applicationId and namespace disagree');
  if (!packages.includes(appId)) errors.push('google-services.json has no client for appId');
  if (webDir !== 'www') errors.push(`Unexpected webDir: ${webDir}`);
  const expectedIndex = process.argv.indexOf('--expected-app-id');
  if (expectedIndex >= 0 && appId !== process.argv[expectedIndex + 1]) errors.push('Configured appId differs from expected appId');
  console.log(JSON.stringify({ appId, applicationId, namespace, versionCode, versionName, minSdk, targetSdk, webDir, googleClientMatch: packages.includes(appId), errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
