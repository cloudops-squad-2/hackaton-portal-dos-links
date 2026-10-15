@echo off
setlocal
set "EXIT_CODE=0"
cd /d "%~dp0"
echo ================================================
echo   ENCOLHE! - VERIFICACAO ANTES DE PUBLICAR
 echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 goto :nonode
where npm >nul 2>nul
if errorlevel 1 goto :nonode

echo [1/4] Instalando dependencias do package-lock (npm ci)...
call npm ci
if errorlevel 1 goto :failed

echo.
echo [2/4] Executando testes (npm test)...
call npm test
if errorlevel 1 goto :failed

echo.
echo [3/4] Verificando lint (npm run lint)...
call npm run lint
if errorlevel 1 goto :failed

echo.
echo [4/4] Gerando build (npm run build)...
call npm run build
if errorlevel 1 goto :failed

echo.
echo ================================================
echo  OK: testes, lint e build passaram.
echo  Pode preparar a publicacao no Portal.
echo  A integracao com API/GitOps ainda nao foi testada.
echo ================================================
goto :end

:nonode
set "EXIT_CODE=1"
echo ERRO: Node.js/npm nao encontrados no PATH.
goto :end

:failed
set "EXIT_CODE=1"
echo.
echo ================================================
echo  ATENCAO: uma verificacao falhou.
echo  NAO PUBLIQUE AINDA. Copie o erro e envie no chat.
echo ================================================

:end
echo.
pause
endlocal & exit /b %EXIT_CODE%
