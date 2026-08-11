import { registerRootComponent } from 'expo';
import React from 'react';

import App from './App';
import { installCrashReporter, trackEvent } from './lib/telemetry';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

installCrashReporter();
void trackEvent('app_opened');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
function SaturatedRoot() {
  return React.createElement(
    AppErrorBoundary,
    null,
    React.createElement(App),
  );
}

registerRootComponent(SaturatedRoot);
