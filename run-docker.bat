@echo off
REM Script to manage the Ollama Deep Researcher MCP server Docker container on Windows

REM Function to display usage information
:show_usage
echo Usage: %0 [command]
echo Commands:
echo   start       - Build and start the Docker container
echo   stop        - Stop the Docker container
echo   restart     - Restart the Docker container
echo   logs        - Show logs from the Docker container
echo   status      - Check the status of the Docker container
echo   help        - Show this help message
goto :eof

REM Check if Docker is installed
:check_docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not installed or not in PATH
    echo Please install Docker from https://www.docker.com/products/docker-desktop/
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: docker-compose is not installed or not in PATH
    echo It should be included with Docker Desktop, or you can install it separately
    exit /b 1
)
goto :eof

REM Check if .env file exists, create from example if not
:check_env_file
if not exist .env (
    if exist .env.example (
        echo Creating .env file from .env.example...
        copy .env.example .env
        echo Please edit .env file to add your API keys
    ) else (
        echo Error: .env.example file not found
        exit /b 1
    )
)
goto :eof

REM Start the Docker container
:start_container
echo Building and starting the Docker container...
docker-compose up -d
echo Container started. Use '%0 logs' to view logs
goto :eof

REM Stop the Docker container
:stop_container
echo Stopping the Docker container...
docker-compose down
goto :eof

REM Restart the Docker container
:restart_container
echo Restarting the Docker container...
docker-compose restart
goto :eof

REM Show logs from the Docker container
:show_logs
echo Showing logs from the Docker container (Ctrl+C to exit)...
docker-compose logs -f
goto :eof

REM Check the status of the Docker container
:check_status
echo Checking status of the Docker container...
docker-compose ps
goto :eof

REM Main script logic
call :check_docker

if "%1"=="" (
    call :show_usage
    exit /b 1
)

if "%1"=="start" (
    call :check_env_file
    call :start_container
) else if "%1"=="stop" (
    call :stop_container
) else if "%1"=="restart" (
    call :restart_container
) else if "%1"=="logs" (
    call :show_logs
) else if "%1"=="status" (
    call :check_status
) else if "%1"=="help" (
    call :show_usage
) else if "%1"=="--help" (
    call :show_usage
) else if "%1"=="-h" (
    call :show_usage
) else (
    echo Unknown command: %1
    call :show_usage
    exit /b 1
)

exit /b 0
