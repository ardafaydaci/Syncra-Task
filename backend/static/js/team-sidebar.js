document.addEventListener('DOMContentLoaded', () => {
    // Panel Tetikleyici
    const teamMenuTrigger = document.getElementById('team-menu-trigger');
    if (!teamMenuTrigger) return;

    // Kayar Panel Elementleri
    const teamPanel = document.getElementById('team-panel');
    const teamPanelCloseBtn = document.getElementById('team-panel-close-btn');
    const teamPanelOverlay = document.getElementById('team-panel-overlay');
    const teamMembersListPanel = document.getElementById('team-members-list-panel');

    // Kartvizit Modal Elementleri
    const userCardModal = document.getElementById('user-card-modal');
    const userCardCloseBtn = document.getElementById('user-card-close-btn');
    const userCardPhoto = document.getElementById('user-card-photo');
    const userCardFullname = document.getElementById('user-card-fullname');
    const userCardEmail = document.getElementById('user-card-email');
    const userCardPhone = document.getElementById('user-card-phone');
    const userCardBirthday = document.getElementById('user-card-birthday');

    // Paneli aç/kapat fonksiyonları
    const openTeamPanel = () => {
        teamPanel.classList.add('open');
        teamPanelOverlay.style.display = 'block';
    };

    const closeTeamPanel = () => {
        teamPanel.classList.remove('open');
        teamPanelOverlay.style.display = 'none';
    };

    // Olay Dinleyicileri
    teamMenuTrigger.addEventListener('click', openTeamPanel);

    // === İSTEDİĞİNİZ İŞLEVSELLİK BU SATIRDA SAĞLANIYOR ===
    teamPanelCloseBtn.addEventListener('click', closeTeamPanel);

    teamPanelOverlay.addEventListener('click', closeTeamPanel);

    // Kullanıcı kartını açan fonksiyon
    const openUserCard = async(userId) => {
        try {
            const response = await fetch(`/api/user-profile/${userId}`);
            if (!response.ok) return;
            const data = await response.json();
            let formattedBirthday = 'Belirtilmemiş';
            if (data.birthday && data.birthday !== 'Belirtilmemiş') {
                const date = new Date(data.birthday);
                const monthName = date.toLocaleString('tr-TR', { month: 'long' });
                formattedBirthday = `${date.getDate()} ${monthName}`;
            }
            userCardPhoto.src = `/static/profile_pics/${data.profile_picture}?t=${new Date().getTime()}`;
            userCardFullname.textContent = data.full_name;
            userCardEmail.textContent = data.email;
            userCardPhone.textContent = data.phone_number;
            userCardBirthday.textContent = formattedBirthday;
            userCardModal.style.display = 'flex';
        } catch (error) {
            console.error("Kullanıcı profili alınamadı:", error);
        }
    };

    // Kartvizit Modalını kapatma olayları
    const closeUserCard = () => {
        userCardModal.style.display = 'none';
    };
    if (userCardCloseBtn) userCardCloseBtn.addEventListener('click', closeUserCard);
    if (userCardModal) userCardModal.addEventListener('click', (event) => {
        if (event.target === userCardModal) {
            closeUserCard();
        }
    });

    // Takım üyelerini sunucudan çek ve paneli doldur
    const loadTeamMembers = async() => {
        try {
            const response = await fetch('/api/team-members');
            const members = await response.json();
            teamMembersListPanel.innerHTML = ''; // Listeyi temizle
            members.forEach(member => {
                const li = document.createElement('li');
                li.className = 'team-member-panel';
                li.dataset.userId = member.id;
                let avatarHtml = '';
                if (member.profile_picture && member.profile_picture !== 'default_avatar.png') {
                    avatarHtml = `<img src="/static/profile_pics/${member.profile_picture}?t=${new Date().getTime()}" alt="${member.full_name}" class="team-member-avatar">`;
                } else {
                    const initials = member.full_name ? member.full_name.charAt(0).toUpperCase() : '?';
                    avatarHtml = `<div class="team-member-initials">${initials}</div>`;
                }
                li.innerHTML = `
                    ${avatarHtml}
                    <span class="team-member-name">${member.full_name}</span>
                `;
                li.addEventListener('click', () => {
                    openUserCard(member.id);
                });
                teamMembersListPanel.appendChild(li);
            });
        } catch (error) {
            console.error('Takım üyeleri yüklenemedi:', error);
        }
    };

    loadTeamMembers();
});