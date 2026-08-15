export const environment = {
  production: true,
  firebase: {
  apiKey: "AIzaSyC0-i1frwPVMgJ4pUwGQAWyTzKC78QiGKc",
  authDomain: "pd-game-rdn.firebaseapp.com",
  projectId: "pd-game-rdn",
  storageBucket: "pd-game-rdn.firebasestorage.app",
  messagingSenderId: "594225946642",
  appId: "1:594225946642:web:0abc1fc3acab5eda3138cb"
  },
  webClientId: '594225946642-qcc462fq8tkkp9208c70n9mar4o84dfj.apps.googleusercontent.com',
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
