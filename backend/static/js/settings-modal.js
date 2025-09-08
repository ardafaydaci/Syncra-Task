document.addEventListener('DOMContentLoaded', () => {
    // --- Element Seçimleri ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalCloseBtn = document.getElementById('settings-modal-close-btn');
    const settingsMenuItems = document.querySelectorAll('.settings-menu-item');
    const settingsTabContents = document.querySelectorAll('.settings-tab-content');

    const profileForm = document.getElementById('profile-settings-form');
    const profilePicInput = document.getElementById('profile-pic-upload');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profileMessageDiv = document.getElementById('profile-message');
    const profilePicDeleteBtn = document.getElementById('profile-pic-delete-btn');

    // YENİ: Modal içindeki çıkış butonu seçicisi
    const logoutBtnModal = document.getElementById('logout-btn-modal');

    // Eğer temel modal elementleri sayfada yoksa, kodu çalıştırma.
    if (!settingsBtn || !settingsModal || !settingsModalCloseBtn) return;

    // --- Fonksiyonlar ---

    // Sunucudan profil verilerini yükler ve form alanlarını doldurur.
    const loadProfileData = async() => {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) {
                profileMessageDiv.textContent = 'Profil bilgileri yüklenemedi.';
                profileMessageDiv.className = 'profile-message error';
                return;
            }
            const data = await response.json();
            document.getElementById('profile-username').value = data.username || '';
            document.getElementById('profile-fullname').value = data.full_name || '';
            document.getElementById('profile-email').value = data.email || '';
            document.getElementById('profile-phone').value = data.phone_number || '';
            document.getElementById('profile-birthday').value = data.birthday || '';

            if (data.profile_picture) {
                // Tarayıcı önbelleğini atlatmak için zaman damgası ekle
                profilePicPreview.src = `/static/profile_pics/${data.profile_picture}?t=${new Date().getTime()}`;
            } else {
                profilePicPreview.src = '/static/default_avatar.png';
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
            profileMessageDiv.textContent = 'Bir hata oluştu.';
            profileMessageDiv.className = 'profile-message error';
        }
    };

    // Ayarlar modalını açar.
    const openSettingsModal = () => {
        settingsModal.style.display = 'flex';
        loadProfileData(); // Açıldığında güncel verileri yükle.
    }

    // Ayarlar modalını kapatır ve formları temizler.
    const closeSettingsModal = () => {
        settingsModal.style.display = 'none';
        profileMessageDiv.textContent = '';
        profileMessageDiv.className = 'profile-message';
        document.getElementById('profile-old-password').value = '';
        document.getElementById('profile-new-password').value = '';
    };

    // --- Olay Dinleyicileri (Event Listeners) ---

    // Ana menüdeki "Ayarlar" butonuna tıklama olayı.
    settingsBtn.addEventListener('click', openSettingsModal);

    // Modalın kapatma (X) butonuna tıklama olayı.
    settingsModalCloseBtn.addEventListener('click', closeSettingsModal);

    // Modalın dışındaki gri alana tıklayınca kapatma olayı.
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // Modal içindeki sol menü (Profil, Görünüm vs.) sekmelerine tıklama olayı.
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            // Tıklanan öğe bir sekme ise (çıkış butonu değilse) içeriği değiştir.
            if (tabId) {
                settingsMenuItems.forEach(i => i.classList.remove('active'));
                settingsTabContents.forEach(c => c.classList.remove('active'));
                item.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            }
        });
    });

    // Profil resmi yükleme inputu değiştiğinde önizlemeyi günceller.
    if (profilePicInput && profilePicPreview) {
        profilePicInput.addEventListener('change', () => {
            const file = profilePicInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePicPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Profil ayarları formunu gönderme olayı.
    if (profileForm) {
        profileForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            profileMessageDiv.textContent = 'Kaydediliyor...';
            profileMessageDiv.className = 'profile-message info';
            const formData = new FormData(profileForm);
            try {
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    profileMessageDiv.textContent = result.message;
                    profileMessageDiv.className = 'profile-message success';
                    // Değişikliklerin (örn. kullanıcı adı) yansıtılması için sayfayı yeniden yükle
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    profileMessageDiv.textContent = result.error || 'Bir hata oluştu.';
                    profileMessageDiv.className = 'profile-message error';
                }
            } catch (error) {
                console.error('Profil güncelleme hatası:', error);
                profileMessageDiv.textContent = 'Ağ hatası, lütfen tekrar deneyin.';
                profileMessageDiv.className = 'profile-message error';
            }
        });
    }

    // Profil fotoğrafını silme butonu olayı.
    if (profilePicDeleteBtn) {
        profilePicDeleteBtn.addEventListener('click', async() => {
            if (!confirm('Profil fotoğrafınızı kalıcı olarak silmek istediğinizden emin misiniz?')) {
                return;
            }
            profileMessageDiv.textContent = 'Fotoğraf siliniyor...';
            profileMessageDiv.className = 'profile-message info';
            try {
                const response = await fetch('/api/profile/picture', { method: 'DELETE' });
                const result = await response.json();
                if (response.ok) {
                    profileMessageDiv.textContent = result.message;
                    profileMessageDiv.className = 'profile-message success';
                    profilePicPreview.src = `/static/profile_pics/default_avatar.png`;
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    profileMessageDiv.textContent = result.error || 'Bir hata oluştu.';
                    profileMessageDiv.className = 'profile-message error';
                }
            } catch (error) {
                console.error('Profil fotoğrafı silme hatası:', error);
                profileMessageDiv.textContent = 'Ağ hatası, lütfen tekrar deneyin.';
                profileMessageDiv.className = 'profile-message error';
            }
        });
    }

    // YENİ EKLENEN ÇIKIŞ BUTONU İŞLEVSELLİĞİ
    if (logoutBtnModal) {
        logoutBtnModal.addEventListener('click', async() => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/'; // Kullanıcıyı giriş sayfasına yönlendir.
        });
    }
});