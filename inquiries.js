// Inquiries Page
const Inquiries = {
    currentInquiries: [],

    render() {
        this.loadInquiries();

        const content = `
            <div class="space-y-6">
                <div class="card">
                    <div class="card-header card-header-flex">
                        <div>
                            <div class="card-title">Inquiries Management</div>
                            <div class="card-description">Manage all client inquiries</div>
                        </div>
                        <button class="btn btn-primary" onclick="Inquiries.showAddDialog()">➕ New Inquiry</button>
                    </div>
                    <div class="card-content">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Client</th>
                                        <th>Destination</th>
                                        <th>Travel Date</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderInquiriesRows()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return Layout.render('Inquiries', content);
    },

    loadInquiries() {
        const user = Auth.getUser();
        const allInquiries = Storage.getInquiries();
        this.currentInquiries = user.role === 'admin' 
            ? allInquiries 
            : allInquiries.filter(i => i.employeeId === user.id);
    },

    renderInquiriesRows() {
        if (this.currentInquiries.length === 0) {
            return '<tr><td colspan="7" class="text-center" style="color: var(--muted-foreground)">No inquiries found</td></tr>';
        }

        return this.currentInquiries.map(inquiry => `
            <tr>
                <td class="font-mono">${inquiry.id}</td>
                <td>${inquiry.clientName}</td>
                <td>${inquiry.destination}</td>
                <td>${Utils.formatDate(inquiry.travelDate)}</td>
                <td>${inquiry.inquiryFor}</td>
                <td><span class="badge ${Utils.getStatusBadgeClass(inquiry.status)}">${inquiry.status}</span></td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-ghost btn-sm" onclick="Inquiries.updateStatus('${inquiry.id}', 'process')" title="Mark as Under Process">⏱</button>
                        <button class="btn btn-ghost btn-sm" onclick="Inquiries.updateStatus('${inquiry.id}', 'success')" title="Mark as Successful">✓</button>
                        <button class="btn btn-ghost btn-sm" onclick="Inquiries.updateStatus('${inquiry.id}', 'unsuccessful')" title="Mark as Unsuccessful">✗</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    showAddDialog() {
        const modalContent = `
            <form id="addInquiryForm" class="space-y-4">
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Client Name *</label>
                        <input type="text" id="clientName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contact Number *</label>
                        <input type="text" id="contactNumber" class="form-input" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="email" class="form-input">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Inquiry For *</label>
                        <select id="inquiryFor" class="form-select" required>
                            <option value="Tickets">Tickets</option>
                            <option value="Tour Package">Tour Package</option>
                            <option value="Hotel">Hotel</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Destination *</label>
                        <input type="text" id="destination" class="form-input" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Travel Date *</label>
                    <input type="date" id="travelDate" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="description" class="form-textarea" rows="4"></textarea>
                </div>
                <button type="submit" class="btn btn-primary w-full">Create Inquiry</button>
            </form>
        `;

        const modal = Modal.show('Add New Inquiry', modalContent, 'Enter client inquiry details');
        
        document.getElementById('addInquiryForm').onsubmit = (e) => {
            e.preventDefault();
            const user = Auth.getUser();
            const inquiry = {
                id: 'INQ' + Date.now(),
                clientName: document.getElementById('clientName').value,
                contactNumber: document.getElementById('contactNumber').value,
                email: document.getElementById('email').value,
                inquiryFor: document.getElementById('inquiryFor').value,
                destination: document.getElementById('destination').value,
                travelDate: document.getElementById('travelDate').value,
                description: document.getElementById('description').value,
                status: 'Under Process',
                inquiryDate: new Date().toISOString(),
                employeeId: user.id,
                employeeName: user.name
            };
            Storage.saveInquiry(inquiry);
            Utils.showToast('Success', 'Inquiry created successfully');
            Modal.close(modal);
            Router.navigate('inquiries');
        };
    },

    updateStatus(inquiryId, action) {
        const inquiry = this.currentInquiries.find(i => i.id === inquiryId);
        if (!inquiry) return;

        if (action === 'process') {
            inquiry.status = 'Under Process';
            Storage.saveInquiry(inquiry);
            Utils.showToast('Success', 'Status updated to Under Process');
            Router.navigate('inquiries');
        } else if (action === 'success') {
            this.showSuccessDialog(inquiry);
        } else if (action === 'unsuccessful') {
            this.showUnsuccessfulDialog(inquiry);
        }
    },

    showSuccessDialog(inquiry) {
        const modalContent = `
            <form id="successForm" class="space-y-4">
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Closing Date</label>
                        <input type="date" id="closingDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Invoice Number</label>
                        <input type="text" id="invoiceNumber" class="form-input" required>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Airline PNR</label>
                        <input type="text" id="airlinePNR" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">GDS PNR</label>
                        <input type="text" id="gdsPNR" class="form-input" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Booking Details</label>
                    <textarea id="bookingDetails" class="form-textarea" rows="3"></textarea>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Amount</label>
                        <input type="number" id="amount" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Currency</label>
                        <select id="currency" class="form-select">
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="INR">INR</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Mode</label>
                        <select id="paymentMode" class="form-select">
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Online">Online</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Payment Status</label>
                    <select id="paymentStatus" class="form-select">
                        <option value="Pending">Pending</option>
                        <option value="Successful">Successful</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary w-full">Create Booking</button>
            </form>
        `;

        const modal = Modal.show('Mark as Successful', modalContent);
        
        document.getElementById('successForm').onsubmit = (e) => {
            e.preventDefault();
            const user = Auth.getUser();
            const booking = {
                id: 'BK' + Date.now(),
                inquiryId: inquiry.id,
                clientName: inquiry.clientName,
                contactNumber: inquiry.contactNumber,
                email: inquiry.email,
                inquiryDate: inquiry.inquiryDate,
                closingDate: document.getElementById('closingDate').value,
                invoiceNumber: document.getElementById('invoiceNumber').value,
                airlinePNR: document.getElementById('airlinePNR').value,
                gdsPNR: document.getElementById('gdsPNR').value,
                bookingDetails: document.getElementById('bookingDetails').value,
                paymentStatus: document.getElementById('paymentStatus').value,
                amount: parseFloat(document.getElementById('amount').value),
                currency: document.getElementById('currency').value,
                paymentMode: document.getElementById('paymentMode').value,
                employeeId: user.id,
                employeeName: user.name,
                destination: inquiry.destination,
                travelDate: inquiry.travelDate
            };
            Storage.saveBooking(booking);
            inquiry.status = 'Successful';
            inquiry.closingDate = booking.closingDate;
            Storage.saveInquiry(inquiry);
            Utils.showToast('Success', 'Booking created successfully');
            Modal.close(modal);
            Router.navigate('inquiries');
        };
    },

    showUnsuccessfulDialog(inquiry) {
        const modalContent = `
            <form id="unsuccessfulForm">
                <div class="form-group">
                    <label class="form-label">Reason for Unsuccessful</label>
                    <textarea id="unsuccessfulReason" class="form-textarea" rows="4" placeholder="Enter reason why this inquiry was unsuccessful..." required></textarea>
                </div>
                <button type="submit" class="btn btn-primary w-full">Mark as Unsuccessful</button>
            </form>
        `;

        const modal = Modal.show('Mark as Unsuccessful', modalContent);
        
        document.getElementById('unsuccessfulForm').onsubmit = (e) => {
            e.preventDefault();
            inquiry.status = 'Unsuccessful';
            inquiry.unsuccessfulReason = document.getElementById('unsuccessfulReason').value;
            Storage.saveInquiry(inquiry);
            Utils.showToast('Success', 'Inquiry marked as unsuccessful');
            Modal.close(modal);
            Router.navigate('inquiries');
        };
    }
};
