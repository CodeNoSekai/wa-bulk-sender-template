import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your apikey",
  authDomain: "your authdomain",
  projectId: "your projectid",
  storageBucket: "your storagebucket",
  messagingSenderId: "your messagingSenderId",
  appId: "your appid",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const githubProvider = new GithubAuthProvider();

export { auth, githubProvider };