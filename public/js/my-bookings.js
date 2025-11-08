// My Bookings Page
const MyBookings = {
    render() {
        const user = Auth.getUser();
        const bookings = Storage.getBookings().filter(b => 
            user.role === 'admin' || b.employeeId === user.id
        );

        const content = `
            <div class="space-y-6">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">My Bookings</div>
                        <div class="card-description">View all your bookings and their details</div>
                    </div>
                    <div class="card-content">
                        <div class="mb-4">
                            <div class="search-box">
                                <span class="search-icon">🔍</span>
                                <input type="text" id="bookingSearch" class="form-input" placeholder="Search by client, invoice, PNR, or destination..." oninput="MyBookings.filterBookings()">
                            </div>
                        </div>

                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Destination</th>
                                        <th>Travel Date</th>
                                        <th>Airline PNR</th>
                                        <th>GDS PNR</th>
                                        <th>Amount</th>
                                        <th>Payment</th>
                                        <th>Mode</th>
                                    </tr>
                                </thead>
                                <tbody id="bookingsTableBody">
                                    ${this.renderBookingsRows(bookings)}
                                </tbody>
                            </table>
                        </div>

                        <div class="summary-box">
                            <p>Total Bookings: <span id="totalBookings">${bookings.length}</span></p>
                            <p>Total Revenue: <span id="totalRevenue">${Utils.formatCurrency(
                                bookings.reduce((sum, b) => sum + (b.currency === 'USD' ? b.amount : 0), 0)
                            )}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return Layout.render('My Bookings', content);
    },

    renderBookingsRows(bookings) {
        if (bookings.length === 0) {
            return '<tr><td colspan="9" class="text-center" style="color: var(--muted-foreground)">No bookings found</td></tr>';
        }

        return bookings.map(booking => `
            <tr>
                <td class="font-mono">${booking.invoiceNumber}</td>
                <td>${booking.clientName}</td>
                <td>${booking.destination}</td>
                <td>${Utils.formatDate(booking.travelDate)}</td>
                <td class="font-mono">${booking.airlinePNR}</td>
                <td class="font-mono">${booking.gdsPNR}</td>
                <td>${Utils.formatCurrency(booking.amount, booking.currency)}</td>
                <td><span class="badge ${Utils.getStatusBadgeClass(booking.paymentStatus)}">${booking.paymentStatus}</span></td>
                <td>${booking.paymentMode}</td>
            </tr>
        `).join('');
    },

    filterBookings() {
        const searchTerm = document.getElementById('bookingSearch').value.toLowerCase();
        const user = Auth.getUser();
        const bookings = Storage.getBookings().filter(b => 
            user.role === 'admin' || b.employeeId === user.id
        );

        const filtered = bookings.filter(booking =>
            booking.clientName.toLowerCase().includes(searchTerm) ||
            booking.invoiceNumber.toLowerCase().includes(searchTerm) ||
            booking.airlinePNR.toLowerCase().includes(searchTerm) ||
            booking.destination.toLowerCase().includes(searchTerm)
        );

        document.getElementById('bookingsTableBody').innerHTML = this.renderBookingsRows(filtered);
        document.getElementById('totalBookings').textContent = filtered.length;
        document.getElementById('totalRevenue').textContent = Utils.formatCurrency(
            filtered.reduce((sum, b) => sum + (b.currency === 'USD' ? b.amount : 0), 0)
        );
    }
};
