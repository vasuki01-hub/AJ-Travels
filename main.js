// Main Application Router
const Router = {
    currentPage: null,

    init() {
        // Check authentication
        if (!Auth.isAuthenticated()) {
            this.renderLogin();
            return;
        }

        // Get initial route from URL hash or default to dashboard
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigate(hash);

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.slice(1) || 'dashboard';
            this.navigate(page);
        });

        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.dataset.page) {
                e.preventDefault();
                this.navigate(navItem.dataset.page);
            }
        });
    },

    navigate(page) {
        if (!Auth.isAuthenticated() && page !== 'login') {
            this.renderLogin();
            return;
        }

        this.currentPage = page;
        window.location.hash = page;

        const app = document.getElementById('app');
        
        switch(page) {
            case 'login':
                this.renderLogin();
                break;
            case 'dashboard':
                app.innerHTML = Dashboard.render();
                Layout.updateActiveNav('dashboard');
                break;
            case 'my-bookings':
                app.innerHTML = MyBookings.render();
                Layout.updateActiveNav('my-bookings');
                break;
            case 'inquiries':
                app.innerHTML = Inquiries.render();
                Layout.updateActiveNav('inquiries');
                break;
            case 'reports':
                app.innerHTML = Reports.render();
                Layout.updateActiveNav('reports');
                break;
            default:
                this.navigate('dashboard');
        }
    },

    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container">
                <div class="card login-card">
                    <div class="card-content">
                        <div class="login-header">
                            <div class="login-logo">✈️</div>
                            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">A J Travels</h1>
                            <p style="color: var(--muted-foreground);">Sign in to your account</p>
                        </div>
                        <form id="loginForm">
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" id="loginEmail" class="form-input" placeholder="Enter your email" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Password</label>
                                <input type="password" id="loginPassword" class="form-input" placeholder="Enter your password" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-full">Sign In</button>
                        </form>
                        <div class="demo-credentials">
                            <p>Demo Credentials:</p>
                            <p>Admin: admin@ajtravels.com</p>
                            <p>Employee: employee@ajtravels.com</p>
                            <p>Password: password</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('loginForm').onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const result = Auth.login(email, password);
            if (result.success) {
                Utils.showToast('Success', 'Logged in successfully');
                this.navigate('dashboard');
            } else {
                Utils.showToast('Error', result.error, 'error');
            }
        };
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});
