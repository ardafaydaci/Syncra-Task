document.addEventListener('DOMContentLoaded', () => {
    const notificationBell = document.getElementById('notification-bell');
    const notificationCounter = document.getElementById('notification-counter');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (!notificationBell || !notificationCounter || !notificationDropdown) {
        // Eğer sayfada bildirim elementleri yoksa, kodu çalıştırma.
        return;
    }

    // Bildirimleri kontrol eden fonksiyon
    const checkNotifications = async() => {
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) return;

            const notifications = await response.json();

            if (notifications.length > 0) {
                notificationCounter.textContent = notifications.length;
                notificationCounter.style.display = 'block';
            } else {
                notificationCounter.style.display = 'none';
            }

            notificationDropdown.innerHTML = '<div class="notification-dropdown-header">Bildirimler</div>';
            if (notifications.length === 0) {
                notificationDropdown.innerHTML += '<div class="no-notifications">Okunmamış bildiriminiz yok.</div>';
            } else {
                notifications.forEach(n => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';

                    const notificationDate = new Date(n.timestamp);
                    const now = new Date();
                    const diffSeconds = Math.round((now - notificationDate) / 1000);
                    const diffMinutes = Math.round(diffSeconds / 60);
                    const diffHours = Math.round(diffMinutes / 60);
                    const diffDays = Math.round(diffHours / 24);

                    let timeText = '';
                    if (diffSeconds < 60) {
                        timeText = 'şimdi';
                    } else if (diffMinutes < 60) {
                        timeText = `${diffMinutes} dakika önce`;
                    } else if (diffHours < 24) {
                        timeText = `${diffHours} saat önce`;
                    } else {
                        timeText = `${diffDays} gün önce`;
                    }

                    item.innerHTML = `
                        <p>${n.message}</p>
                        <span class="notification-item-time">${timeText}</span>
                    `;
                    notificationDropdown.appendChild(item);
                });
            }

        } catch (error) {
            console.error("Bildirimler alınırken hata oluştu:", error);
        }
    };

    // Çan ikonuna tıklama olayı
    notificationBell.addEventListener('click', async() => {
        const isHidden = notificationDropdown.style.display === 'none';
        notificationDropdown.style.display = isHidden ? 'block' : 'none';

        if (isHidden && notificationCounter.style.display !== 'none' && parseInt(notificationCounter.textContent) > 0) {
            try {
                await fetch('/api/notifications/mark-as-read', { method: 'POST' });
                // Sayaç hemen gizlenir, bir sonraki kontrolde zaten sıfır gelecektir.
                notificationCounter.style.display = 'none';
                notificationCounter.textContent = '0';
            } catch (error) {
                console.error("Bildirimler okunmuş olarak işaretlenemedi:", error);
            }
        }
    });

    // Dropdown dışına tıklandığında kapat
    document.addEventListener('click', (event) => {
        if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
            notificationDropdown.style.display = 'none';
        }
    });

    // Sayfa yüklendiğinde ve ardından her 30 saniyede bir bildirimleri kontrol et
    checkNotifications();
    setInterval(checkNotifications, 30000);
});