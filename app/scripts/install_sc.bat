@echo off
echo 正在安装服务请稍等...
set curdir=%~dp0
cd /d %curdir%
sc create FuxaService binpath= "%curdir%\fuxa-app.exe" start= auto displayname= "Fuxa Service"
sc description FuxaService "FuxaService服务，不要删除"
echo -----------------------------
echo    服务安装成功
echo -----------------------------
echo 正在启动服务请稍等...
net start FuxaService
echo -----------------------------
echo    服务启动成功
echo -----------------------------
pause