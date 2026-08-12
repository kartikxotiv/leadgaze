const pathsConfig = {
  auth: {
    signIn: '/auth/sign-in',
    callback: '/auth/callback',
  },
  app: {
    home: '/dashboard',
  },
} as const;

export default pathsConfig;
