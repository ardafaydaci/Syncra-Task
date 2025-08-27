document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (!themeToggleBtn) return;

    const themeToggleIcon = document.getElementById('theme-toggle-icon');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggleBtn.classList.add('active');
            if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun';
        } else {
            document.body.removeAttribute('data-theme');
            themeToggleBtn.classList.remove('active');
            if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon';
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
});