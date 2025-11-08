// Dashboard Page
const Dashboard = {
    render() {
        const user = Auth.getUser();
        const inquiries = Storage.getInquiries().filter(i => 
            user.role === 'admin' || i.employeeId === user.id
        );
        const bookings = Storage.getBookings().filter(b => 
            user.role === 'admin' || b.employeeId === user.id
        );

        const successfulCount = inquiries.filter(i => i.status === 'Successful').length;
        const underProcessCount = inquiries.filter(i => i.status === 'Under Process').length;
        const upcomingDepartures = bookings.filter(b => new Date(b.travelDate) > new Date()).length;

        const content = `
            <div class="space-y-6">
                <div class="grid grid-cols-4">
                    <div class="card metric-card">
                        <div class="metric-card-header">
                            <div class="metric-card-title">Total Bookings</div>
                            <div>📅</div>
                        </div>
                        <div class="metric-value" style="color: var(--primary)">${bookings.length}</div>
                        <div class="metric-label">This month</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-card-header">
                            <div class="metric-card-title">Successful</div>
                            <div style="color: var(--success)">✓</div>
                        </div>
                        <div class="metric-value" style="color: var(--success)">${successfulCount}</div>
                        <div class="metric-label">Inquiries closed</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-card-header">
                            <div class="metric-card-title">Under Process</div>
                            <div style="color: var(--warning)">⏱</div>
                        </div>
                        <div class="metric-value" style="color: var(--warning)">${underProcessCount}</div>
                        <div class="metric-label">Active inquiries</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-card-header">
                            <div class="metric-card-title">Upcoming Departures</div>
                            <div>✈️</div>
                        </div>
                        <div class="metric-value">${upcomingDepartures}</div>
                        <div class="metric-label">Scheduled trips</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Quick Actions</div>
                        <div class="card-description">Frequently used actions</div>
                    </div>
                    <div class="card-content">
                        <div class="actions-flex">
                            ${user.role === 'admin' ? '<button class="btn btn-primary" onclick="Dashboard.showAddEmployee()">➕ Add Employee</button>' : ''}
                            <button class="btn btn-primary" onclick="Router.navigate('inquiries')">📝 New Inquiry</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Check PNR Status</div>
                        <div class="card-description">Search booking by PNR number</div>
                    </div>
                    <div class="card-content">
                        <div class="flex gap-2">
                            <input type="text" id="pnrSearch" class="form-input" placeholder="Enter Airline or GDS PNR">
                            <button class="btn btn-primary" onclick="Dashboard.searchPNR()">🔍 Search</button>
                        </div>
                        <div id="pnrResult"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Recent Inquiries</div>
                        <div class="card-description">Latest inquiry submissions</div>
                    </div>
                    <div class="card-content">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Client Name</th>
                                        <th>Destination</th>
                                        <th>Travel Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${inquiries.slice(0, 5).map(inquiry => `
                                        <tr>
                                            <td class="font-mono">${inquiry.id}</td>
                                            <td>${inquiry.clientName}</td>
                                            <td>${inquiry.destination}</td>
                                            <td>${Utils.formatDate(inquiry.travelDate)}</td>
                                            <td><span class="badge ${Utils.getStatusBadgeClass(inquiry.status)}">${inquiry.status}</span></td>
                                            <td>
                                                <button class="btn btn-ghost btn-sm" onclick="Router.navigate('inquiries')">👁 View</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return Layout.render('Dashboard', content);
    },

    searchPNR() {
        const pnr = document.getElementById('pnrSearch').value.trim();
        const resultDiv = document.getElementById('pnrResult');

        if (!pnr) {
            Utils.showToast('Error', 'Please enter a PNR', 'error');
            return;
        }

        const user = Auth.getUser();
        const bookings = Storage.getBookings().filter(b => 
            user.role === 'admin' || b.employeeId === user.id
        );

        const found = bookings.find(b => 
            b.airlinePNR.toLowerCase() === pnr.toLowerCase() ||
            b.gdsPNR.toLowerCase() === pnr.toLowerCase()
        );

        if (found) {
            resultDiv.innerHTML = `
                <div class="info-box">
                    <h4 style="font-weight: 600; margin-bottom: 12px;">Booking Details</h4>
                    <div class="info-grid">
                        <div>Client: ${found.clientName}</div>
                        <div>Invoice: ${found.invoiceNumber}</div>
                        <div>Destination: ${found.destination}</div>
                        <div>Travel Date: ${Utils.formatDate(found.travelDate)}</div>
                        <div>Payment: ${found.paymentStatus}</div>
                        <div>Amount: ${Utils.formatCurrency(found.amount, found.currency)}</div>
                    </div>
                </div>
            `;
        } else {
            Utils.showToast('Not Found', 'No booking found with this PNR', 'error');
            resultDiv.innerHTML = '';
        }
    },

    showAddEmployee() {
        const modalContent = `
            <form id="addEmployeeForm">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input type="text" id="empName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="empEmail" class="form-input" required>
                </div>
                <button type="submit" class="btn btn-primary w-full">Add Employee</button>
            </form>
        `;

        const modal = Modal.show('Add New Employee', modalContent, 'Enter employee details');
        
        document.getElementById('addEmployeeForm').onsubmit = (e) => {
            e.preventDefault();
            const employee = {
                id: Date.now().toString(),
                name: document.getElementById('empName').value,
                email: document.getElementById('empEmail').value,
                role: 'employee'
            };
            Storage.saveEmployee(employee);
            Utils.showToast('Success', 'Employee added successfully');
            Modal.close(modal);
        };
    }
};
