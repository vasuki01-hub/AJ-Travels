// Storage Management
const Storage = {
    INQUIRIES_KEY: 'ajTravelsInquiries',
    BOOKINGS_KEY: 'ajTravelsBookings',
    EMPLOYEES_KEY: 'ajTravelsEmployees',

    initializeDemoData() {
        if (!localStorage.getItem(this.INQUIRIES_KEY)) {
            const demoInquiries = [
                {
                    id: 'INQ001',
                    clientName: 'John Doe',
                    contactNumber: '+1234567890',
                    email: 'john@example.com',
                    inquiryFor: 'Tickets',
                    description: 'Need tickets to London',
                    destination: 'London',
                    travelDate: '2025-12-15',
                    status: 'Under Process',
                    inquiryDate: new Date().toISOString(),
                    employeeId: '2',
                    employeeName: 'Employee User'
                },
                {
                    id: 'INQ002',
                    clientName: 'Jane Smith',
                    contactNumber: '+1987654321',
                    email: 'jane@example.com',
                    inquiryFor: 'Tour Package',
                    description: 'Family vacation package to Dubai',
                    destination: 'Dubai',
                    travelDate: '2025-11-20',
                    status: 'Successful',
                    inquiryDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                    closingDate: new Date(Date.now() - 86400000).toISOString(),
                    employeeId: '2',
                    employeeName: 'Employee User'
                }
            ];
            localStorage.setItem(this.INQUIRIES_KEY, JSON.stringify(demoInquiries));
        }

        if (!localStorage.getItem(this.BOOKINGS_KEY)) {
            const demoBookings = [
                {
                    id: 'BK001',
                    inquiryId: 'INQ002',
                    clientName: 'Jane Smith',
                    contactNumber: '+1987654321',
                    email: 'jane@example.com',
                    inquiryDate: new Date(Date.now() - 86400000 * 2).toISOString(),
                    closingDate: new Date(Date.now() - 86400000).toISOString(),
                    invoiceNumber: 'INV-2025-001',
                    airlinePNR: 'ABC123',
                    gdsPNR: 'GDS456',
                    bookingDetails: '2 Adults, 1 Child - Dubai Premium Package including hotel and tours',
                    paymentStatus: 'Successful',
                    amount: 3500,
                    currency: 'USD',
                    paymentMode: 'Card',
                    employeeId: '2',
                    employeeName: 'Employee User',
                    destination: 'Dubai',
                    travelDate: '2025-11-20'
                }
            ];
            localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify(demoBookings));
        }

        if (!localStorage.getItem(this.EMPLOYEES_KEY)) {
            const demoEmployees = [
                { id: '1', name: 'Admin User', email: 'admin@ajtravels.com', role: 'admin' },
                { id: '2', name: 'Employee User', email: 'employee@ajtravels.com', role: 'employee' }
            ];
            localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(demoEmployees));
        }
    },

    getInquiries() {
        this.initializeDemoData();
        const data = localStorage.getItem(this.INQUIRIES_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveInquiry(inquiry) {
        const inquiries = this.getInquiries();
        const existingIndex = inquiries.findIndex(i => i.id === inquiry.id);
        
        if (existingIndex >= 0) {
            inquiries[existingIndex] = inquiry;
        } else {
            inquiries.push(inquiry);
        }
        
        localStorage.setItem(this.INQUIRIES_KEY, JSON.stringify(inquiries));
    },

    deleteInquiry(id) {
        const inquiries = this.getInquiries();
        const filtered = inquiries.filter(i => i.id !== id);
        localStorage.setItem(this.INQUIRIES_KEY, JSON.stringify(filtered));
    },

    getBookings() {
        this.initializeDemoData();
        const data = localStorage.getItem(this.BOOKINGS_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveBooking(booking) {
        const bookings = this.getBookings();
        const existingIndex = bookings.findIndex(b => b.id === booking.id);
        
        if (existingIndex >= 0) {
            bookings[existingIndex] = booking;
        } else {
            bookings.push(booking);
        }
        
        localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify(bookings));
    },

    getEmployees() {
        this.initializeDemoData();
        const data = localStorage.getItem(this.EMPLOYEES_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveEmployee(employee) {
        const employees = this.getEmployees();
        const existingIndex = employees.findIndex(e => e.id === employee.id);
        
        if (existingIndex >= 0) {
            employees[existingIndex] = employee;
        } else {
            employees.push(employee);
        }
        
        localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
    }
};
