@echo off

REM Python'un Flask paketinin yüklü olup olmadığını kontrol et
pip show flask >nul 2>nul

REM Eğer Flask yüklü değilse, yükle
if %errorlevel% neq 0 (
    echo Flask yuklu degil, yukleniyor...
    pip install flask
)

REM app.py dosyasını çalıştır
echo Flask uygulamasi baslatiliyor...
python app.py

pause