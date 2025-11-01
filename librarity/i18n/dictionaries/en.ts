export default {
  // Navigation
  nav: {
    home: 'Home',
    pricing: 'Pricing',
    admin: 'Admin',
    chat: 'Chat',
  },
  
  // Landing Page
  landing: {
    welcome: 'Meet with',
    subtitle: 'Your AI-Powered Book Analysis Assistant',
    description: 'Transform your reading experience with AI. Upload any book and chat with it in 4 intelligent modes.',
    cta: 'Get Started',
    features: {
      title: 'Why Choose Lexent AI?',
      smart: {
        title: '🤖 Smart Analysis',
        description: 'Advanced AI algorithms analyze your books and provide deep insights',
      },
      fast: {
        title: '⚡ Lightning Fast',
        description: 'Get summaries and answers in seconds, not hours',
      },
      secure: {
        title: '🔒 Secure & Private',
        description: 'Your books and data are encrypted and protected',
      },
    },
    modes: {
      bookBrain: '📖 Book Brain',
      author: '✍️ Author Mode',
      coach: '🎯 Coach Mode',
      citation: '📝 With Citations',
    },
  },
  
  // Authentication
  auth: {
    login: 'Sign In',
    register: 'Sign Up',
    logout: 'Sign Out',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Full Name',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    loginButton: 'Sign In',
    registerButton: 'Sign Up',
    loggingIn: 'Signing in...',
    registering: 'Creating account...',
    googleAuth: 'Continue with Google',
    or: 'or',
    loginTitle: 'Sign in to your account',
    registerTitle: 'Create an account',
    loginDescription: 'Enter your email to sign in',
    registerDescription: 'Enter your details to create a new account',
    passwordMismatch: 'Passwords do not match',
    loginError: 'Login error. Please check your credentials.',
    registerError: 'Registration error. Please try again.',
    googleError: 'Error connecting to Google. Please try again.',
  },
  
  // Subscription
  subscription: {
    free: 'Free',
    pro: 'Pro',
    ultimate: 'Ultimate',
    plan: 'Plan',
    perMonth: '/month',
    currentPlan: 'Current Plan',
    upgrade: 'Upgrade',
    features: 'Features',
    selectPlan: 'Select Plan',
  },
  
  // Books
  books: {
    myBooks: 'My Books',
    upload: 'Upload Book',
    uploadButton: 'Upload',
    processing: 'Processing...',
    noBooks: 'No books yet',
    uploadFirst: 'Upload your first book to get started',
  },
  
  // Chat
  chat: {
    title: 'Chat with Your Books',
    placeholder: 'Ask anything about your books...',
    send: 'Send',
    selectBook: 'Select a book to start chatting',
    thinking: 'Thinking...',
  },
  
  // Sidebar
  sidebar: {
    newChat: 'New Chat',
    chats: 'Chats',
    noChats: 'No chats yet',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
  },
  
  // Profile
  profile: {
    title: 'Profile',
    email: 'Email',
    fullName: 'Full Name',
    subscription: 'Subscription',
    plan: 'Plan',
    tokensUsed: 'Tokens Used',
    tokensRemaining: 'Tokens Remaining',
    upgrade: 'Upgrade Plan',
    manageSubscription: 'Manage Subscription',
    cancelSubscription: 'Cancel Subscription',
    editProfile: 'Edit Profile',
    changePassword: 'Change Password',
    deleteAccount: 'Delete Account',
  },
  
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    close: 'Close',
    perMonth: '/ month',
    get: 'Get',
    moreBooks: 'More books',
    morePossibilities: 'More possibilities',
  },
} as const;
