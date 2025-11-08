// Common Utilities and Components
const Utils = {
    showToast(title, description, type = 'success') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-description">${description}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    },

    formatCurrency(amount, currency = 'USD') {
        return `${currency} ${amount.toLocaleString()}`;
    },

    getStatusBadgeClass(status) {
        const map = {
            'Successful': 'badge-success',
            'Under Process': 'badge-warning',
            'Unsuccessful': 'badge-destructive',
            'Pending': 'badge-warning'
        };
        return map[status] || 'badge-secondary';
    }
};

const Modal = {
    show(title, content, description = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    ${description ? `<div class="modal-description">${description}</div>` : ''}
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        return overlay;
    },

    close(overlay) {
        if (overlay) {
            overlay.remove();
        }
    }
};

const Layout = {
    render(pageTitle, content) {
        const user = Auth.getUser();
        
        return `
            <div class="app-container">
                <aside class="sidebar" id="sidebar">
                    <div class="sidebar-header">
                        <div class="sidebar-logo">✈️</div>
                        <div class="sidebar-title">
                            <h2>A J Travels</h2>
                            <p>Travel Portal</p>
                        </div>
                    </div>
                    <nav class="sidebar-nav">
                        <button class="nav-item" data-page="dashboard">
                            📊 Dashboard
                        </button>
                        <button class="nav-item" data-page="my-bookings">
                            📖 My Bookings
                        </button>
                        <button class="nav-item" data-page="inquiries">
                            📝 Inquiries
                        </button>
                        <button class="nav-item" data-page="reports">
                            📈 Reports
                        </button>
                    </nav>
                    <div class="sidebar-footer">
                        <div class="user-info">
                            <p>${user.name}</p>
                            <small>${user.email}</small>
                            <div class="user-role">${user.role}</div>
                        </div>
                        <button class="btn btn-outline w-full" onclick="handleLogout()">
                            🚪 Logout
                        </button>
                    </div>
                </aside>
                <div class="main-content">
                    <header class="header">
                        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">
                            ☰
                        </button>
                        <h1>${pageTitle}</h1>
                    </header>
                    <main class="content">
                        ${content}
                    </main>
                </div>
            </div>
        `;
    },

    updateActiveNav(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.toggle('open');
    
    if (isOpen) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    } else {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.remove();
    }
}

function handleLogout() {
    Auth.logout();
    Router.navigate('login');
}
