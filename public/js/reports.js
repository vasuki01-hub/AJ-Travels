// Reports Page
const Reports = {
    currentPeriod: 'monthly',
    currentEmployee: 'all',
    charts: {},

    render() {
        const user = Auth.getUser();
        const employees = Storage.getEmployees();

        const content = `
            <div class="space-y-6">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Performance Reports</div>
                        <div class="card-description">Visualize employee performance metrics</div>
                    </div>
                    <div class="card-content">
                        <div class="flex gap-4 mb-4">
                            <div style="flex: 1">
                                <select id="periodSelect" class="form-select" onchange="Reports.changePeriod(this.value)">
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly" selected>Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            ${user.role === 'admin' ? `
                                <div style="flex: 1">
                                    <select id="employeeSelect" class="form-select" onchange="Reports.changeEmployee(this.value)">
                                        <option value="all">All Employees</option>
                                        ${employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
                                    </select>
                                </div>
                            ` : ''}
                        </div>

                        <div class="space-y-6">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Inquiry Status Distribution</h3>
                                <div class="chart-container">
                                    <canvas id="statusChart"></canvas>
                                </div>
                            </div>

                            <div>
                                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Revenue Trend</h3>
                                <div class="chart-container">
                                    <canvas id="revenueChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-3">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title" style="font-size: 14px;">Total Inquiries</div>
                        </div>
                        <div class="card-content">
                            <div class="text-3xl font-bold" style="color: var(--primary); font-size: 32px; font-weight: bold;" id="totalInquiries">0</div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title" style="font-size: 14px;">Success Rate</div>
                        </div>
                        <div class="card-content">
                            <div class="text-3xl font-bold" style="color: var(--success); font-size: 32px; font-weight: bold;" id="successRate">0%</div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title" style="font-size: 14px;">Total Revenue</div>
                        </div>
                        <div class="card-content">
                            <div class="text-3xl font-bold" style="color: var(--accent); font-size: 32px; font-weight: bold;" id="totalRevenue">$0</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.updateCharts();
        }, 100);

        return Layout.render('Reports', content);
    },

    changePeriod(period) {
        this.currentPeriod = period;
        this.updateCharts();
    },

    changeEmployee(employeeId) {
        this.currentEmployee = employeeId;
        this.updateCharts();
    },

    getFilteredInquiries() {
        const user = Auth.getUser();
        let inquiries = Storage.getInquiries();
        
        if (user.role === 'employee') {
            inquiries = inquiries.filter(i => i.employeeId === user.id);
        } else if (this.currentEmployee !== 'all') {
            inquiries = inquiries.filter(i => i.employeeId === this.currentEmployee);
        }

        return inquiries;
    },

    getChartData() {
        const inquiries = this.getFilteredInquiries();
        const dataMap = new Map();

        inquiries.forEach(inquiry => {
            const date = new Date(inquiry.inquiryDate);
            let key = '';

            if (this.currentPeriod === 'weekly') {
                const week = Math.floor(date.getDate() / 7) + 1;
                key = `Week ${week}`;
            } else if (this.currentPeriod === 'monthly') {
                key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            } else {
                key = date.getFullYear().toString();
            }

            if (!dataMap.has(key)) {
                dataMap.set(key, { successful: 0, underProcess: 0, unsuccessful: 0 });
            }

            const stats = dataMap.get(key);
            if (inquiry.status === 'Successful') stats.successful++;
            else if (inquiry.status === 'Under Process') stats.underProcess++;
            else if (inquiry.status === 'Unsuccessful') stats.unsuccessful++;
        });

        return Array.from(dataMap.entries()).slice(-12);
    },

    getRevenueData() {
        const user = Auth.getUser();
        let bookings = Storage.getBookings();
        
        if (user.role === 'employee') {
            bookings = bookings.filter(b => b.employeeId === user.id);
        } else if (this.currentEmployee !== 'all') {
            bookings = bookings.filter(b => b.employeeId === this.currentEmployee);
        }

        const dataMap = new Map();

        bookings.forEach(booking => {
            const date = new Date(booking.closingDate);
            let key = '';

            if (this.currentPeriod === 'weekly') {
                const week = Math.floor(date.getDate() / 7) + 1;
                key = `Week ${week}`;
            } else if (this.currentPeriod === 'monthly') {
                key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            } else {
                key = date.getFullYear().toString();
            }

            if (!dataMap.has(key)) {
                dataMap.set(key, 0);
            }

            const amount = booking.currency === 'USD' ? booking.amount : booking.amount;
            dataMap.set(key, dataMap.get(key) + amount);
        });

        return Array.from(dataMap.entries()).slice(-12);
    },

    updateCharts() {
        const chartData = this.getChartData();
        const revenueData = this.getRevenueData();
        const inquiries = this.getFilteredInquiries();

        // Update summary stats
        const totalInquiries = inquiries.length;
        const successfulCount = inquiries.filter(i => i.status === 'Successful').length;
        const successRate = totalInquiries > 0 ? Math.round((successfulCount / totalInquiries) * 100) : 0;
        const totalRevenue = revenueData.reduce((sum, [, revenue]) => sum + revenue, 0);

        document.getElementById('totalInquiries').textContent = totalInquiries;
        document.getElementById('successRate').textContent = successRate + '%';
        document.getElementById('totalRevenue').textContent = '$' + Math.round(totalRevenue).toLocaleString();

        // Status Chart
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            this.charts.status = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: chartData.map(([name]) => name),
                    datasets: [
                        {
                            label: 'Successful',
                            data: chartData.map(([, data]) => data.successful),
                            backgroundColor: 'hsl(142, 76%, 36%)'
                        },
                        {
                            label: 'Under Process',
                            data: chartData.map(([, data]) => data.underProcess),
                            backgroundColor: 'hsl(38, 92%, 50%)'
                        },
                        {
                            label: 'Unsuccessful',
                            data: chartData.map(([, data]) => data.unsuccessful),
                            backgroundColor: 'hsl(0, 72%, 51%)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Revenue Chart
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            this.charts.revenue = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: revenueData.map(([name]) => name),
                    datasets: [{
                        label: 'Revenue (USD)',
                        data: revenueData.map(([, revenue]) => Math.round(revenue)),
                        borderColor: 'hsl(200, 95%, 42%)',
                        backgroundColor: 'hsla(200, 95%, 42%, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }
};
