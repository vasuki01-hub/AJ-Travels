// Authentication Management
const Auth = {
    USER_KEY: 'ajTravelsUser',
    currentUser: null,

    init() {
        const storedUser = localStorage.getItem(this.USER_KEY);
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    },

    login(email, password) {
        const demoUsers = {
            'admin@ajtravels.com': { id: '1', name: 'Admin User', email: 'admin@ajtravels.com', role: 'admin' },
            'employee@ajtravels.com': { id: '2', name: 'Employee User', email: 'employee@ajtravels.com', role: 'employee' }
        };

        if (demoUsers[email] && password === 'password') {
            this.currentUser = demoUsers[email];
            localStorage.setItem(this.USER_KEY, JSON.stringify(this.currentUser));
            return { success: true };
        }
        return { success: false, error: 'Invalid credentials' };
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.USER_KEY);
    },

    isAuthenticated() {
        return this.currentUser !== null;
    },

    getUser() {
        return this.currentUser;
    }
};

Auth.init();
