document.addEventListener('DOMContentLoaded', () => {
    const personnelListElement = document.getElementById('performance-personnel-list');
    const statsWelcomeMessage = document.getElementById('stats-welcome-message');
    const statsContentArea = document.getElementById('stats-content-area');
    const selectedPersonnelName = document.getElementById('selected-personnel-name');
    const logoutBtn = document.getElementById('logout-btn');

    // --- YENİ EKLENEN YARDIMCI FONKSİYON ---
    // Bir görevin gecikmiş olup olmadığını kontrol eder
    const isOverdue = (task) => {
        if (task.completed || !task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Sadece tarihleri karşılaştırmak için saati sıfırla
        return new Date(task.dueDate) < today;
    };

    // API'den tüm personelleri (sadece employee rolündekileri) çeker
    const fetchPersonnel = async() => {
        try {
            const response = await fetch('/api/personnel');
            const personnel = await response.json();
            renderPersonnelList(personnel);
        } catch (error) {
            console.error('Personel listesi alınamadı:', error);
        }
    };

    // Gelen personel listesini sol menüye ekler
    const renderPersonnelList = (personnel) => {
        personnelListElement.innerHTML = '';
        personnel.forEach(p => {
            const li = document.createElement('li');
            li.className = 'personnel-list-item-selectable';
            li.dataset.id = p.id;
            li.dataset.username = p.username;
            li.innerHTML = `
                <span class="assigned-user-badge">${p.username.charAt(0)}</span>
                <span>${p.username}</span>
            `;
            personnelListElement.appendChild(li);
        });
    };

    // Belirli bir personelin performans verilerini çeker ve arayüzü günceller
    const fetchAndDisplayStats = async(userId, username) => {
        statsWelcomeMessage.classList.add('hidden');
        statsContentArea.classList.remove('hidden');
        selectedPersonnelName.textContent = `${username} Performans Analizi`;

        try {
            const response = await fetch(`/api/personnel-stats/${userId}`);
            const stats = await response.json();
            updateStatsCards(stats);
        } catch (error) {
            console.error('Performans verileri alınamadı:', error);
        }
    };

    // API'den gelen verilerle istatistik kartlarını doldurur
    const updateStatsCards = (stats) => {
        document.getElementById('stats-completed-rate').textContent = `${stats.completion_rate}%`;
        document.getElementById('stats-completed-count').textContent = `${stats.completed_count}/${stats.total_assigned} Görev`;

        document.getElementById('stats-ontime-rate').textContent = `${stats.on_time_rate}%`;
        document.getElementById('stats-ontime-count').textContent = `${stats.on_time_count}/${stats.completed_count} Görev`;

        document.getElementById('stats-overdue-count').textContent = stats.overdue_count;
        document.getElementById('stats-inprogress-count').textContent = stats.in_progress_count;

        // =================================================================
        // === GÜNCELLENEN BÖLÜM BURASI ===
        // =================================================================
        const recentTasksList = document.getElementById('personnel-recent-tasks-list');
        recentTasksList.innerHTML = '';
        if (stats.recent_activity && stats.recent_activity.length > 0) {
            stats.recent_activity.forEach(task => {
                const li = document.createElement('li');
                li.className = 'recent-task-item';

                let statusText = 'Bekliyor';
                let statusClass = 'status-bekliyor'; // Varsayılan

                if (task.status === 'done' || task.completed) {
                    statusText = 'Tamamlandı';
                    statusClass = 'status-tamamlandi';
                } else if (isOverdue(task)) {
                    statusText = 'Tamamlanmadı';
                    statusClass = 'status-tamamlanmadi';
                } else if (task.status === 'inprogress') {
                    statusText = 'Devam Ediyor';
                    statusClass = 'status-devam-ediyor';
                }
                // 'Bekliyor' durumu zaten varsayılan olduğu için else bloğuna gerek yok

                li.innerHTML = `<span>${task.text}</span> <span class="priority-tag ${statusClass}">${statusText}</span>`;
                recentTasksList.appendChild(li);
            });
        } else {
            recentTasksList.innerHTML = '<li>Bu personele atanmış görev bulunmuyor.</li>';
        }
        // =================================================================
        // === GÜNCELLEME SONU ===
        // =================================================================
    };

    // Sol menüdeki bir personele tıklandığında olayları yönetir
    personnelListElement.addEventListener('click', (e) => {
        const selectedItem = e.target.closest('.personnel-list-item-selectable');
        if (!selectedItem) return;

        // Daha önce seçili olanı kaldır
        document.querySelectorAll('.personnel-list-item-selectable.active').forEach(item => item.classList.remove('active'));
        // Yenisini seçili yap
        selectedItem.classList.add('active');

        const userId = selectedItem.dataset.id;
        const username = selectedItem.dataset.username;
        fetchAndDisplayStats(userId, username);
    });

    // Çıkış butonu
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    // Sayfa yüklendiğinde personel listesini çekerek başla
    fetchPersonnel();
});