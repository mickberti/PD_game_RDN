export const environment = {
  production: true,
  firebase: {
	apiKey: "AIzaSyAxGRpy2g6MCUF1Z5JhXvoiqyswPPBBCg0",
	authDomain: "vg-game-workflow-ui.firebaseapp.com",
	projectId: "vg-game-workflow-ui",
	storageBucket: "vg-game-workflow-ui.firebasestorage.app",
	messagingSenderId: "543668190170",
	appId: "1:543668190170:web:772f957813b41cb20edee3"
  },
  webClientId: '543668190170-cdis5geelincbllvu79kplh8qn1a4mad.apps.googleusercontent.com',
  remoteConfigDocumentPath: 'gameConfigs/public',
  signInWithPopup: false, // se true usa signInWithPopup, altrimenti signInWithRedirect (necessario su mobile)
  enableCapacitorSocialLogin: true, // se true abilita il login sociale su mobile con Capacitor, altrimenti usa Firebase standard (signInWithRedirect)
  loggingLevel: 'Errors', // possibili livelli: 'None', 'Errors', 'Warnings', 'Info', 'Debug', 'Verbose'
  skillUnlockEveryPlayerLevels: 10,
  skillGemEveryPlayerLevels: 10,
  skillUnlockLevelBySkillLevel: {
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    5: 50
  }
};
