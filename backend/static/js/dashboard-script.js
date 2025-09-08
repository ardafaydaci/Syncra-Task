document.addEventListener('DOMContentLoaded', () => {

    const loadDashboardData = async() => {
        try {
            const response = await fetch('/api/dashboard-stats');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/';
                }
                throw new Error('İstatistik verileri alınamadı.');
            }
            const data = await response.json();

            document.getElementById('stats-total').textContent = data.total_tasks;
            document.getElementById('stats-completed').textContent = data.completed_tasks;
            document.getElementById('stats-inprogress').textContent = data.in_progress_tasks;
            document.getElementById('stats-overdue').textContent = data.overdue_tasks;

            const recentTasksList = document.getElementById('recent-tasks-list');
            recentTasksList.innerHTML = '';

            if (data.recent_tasks.length > 0) {
                data.recent_tasks.forEach(task => {
                    const li = document.createElement('li');
                    li.className = 'recent-task-item';
                    li.innerHTML = `
                        <span class="task-text">${task.text}</span>
                        <span class="assigned-user"><strong>Atanan:</strong> ${task.assignedToUsername}</span>
                    `;
                    recentTasksList.appendChild(li);
                });
            } else {
                recentTasksList.innerHTML = '<li>Gösterilecek yeni görev bulunmuyor.</li>';
            }

        } catch (error) {
            console.error('Dashboard verileri yüklenirken hata:', error);
        }
    };

    // Sayfa yüklendiğinde dashboard verilerini yükle
    loadDashboardData();
});