#!/bin/bash

# Script to manage the Ollama Deep Researcher MCP server Docker container

# Function to display usage information
show_usage() {
  echo "Usage: $0 [command]"
  echo "Commands:"
  echo "  start       - Build and start the Docker container"
  echo "  stop        - Stop the Docker container"
  echo "  restart     - Restart the Docker container"
  echo "  logs        - Show logs from the Docker container"
  echo "  status      - Check the status of the Docker container"
  echo "  help        - Show this help message"
}

# Check if Docker is installed
check_docker() {
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker from https://www.docker.com/products/docker-desktop/"
    exit 1
  fi

  if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed or not in PATH"
    echo "It should be included with Docker Desktop, or you can install it separately"
    exit 1
  fi
}

# Check if .env file exists, create from example if not
check_env_file() {
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      echo "Creating .env file from .env.example..."
      cp .env.example .env
      echo "Please edit .env file to add your API keys"
    else
      echo "Error: .env.example file not found"
      exit 1
    fi
  fi
}

# Start the Docker container
start_container() {
  echo "Building and starting the Docker container..."
  docker-compose up -d
  echo "Container started. Use '$0 logs' to view logs"
}

# Stop the Docker container
stop_container() {
  echo "Stopping the Docker container..."
  docker-compose down
}

# Restart the Docker container
restart_container() {
  echo "Restarting the Docker container..."
  docker-compose restart
}

# Show logs from the Docker container
show_logs() {
  echo "Showing logs from the Docker container (Ctrl+C to exit)..."
  docker-compose logs -f
}

# Check the status of the Docker container
check_status() {
  echo "Checking status of the Docker container..."
  docker-compose ps
}

# Main script logic
check_docker

case "$1" in
  start)
    check_env_file
    start_container
    ;;
  stop)
    stop_container
    ;;
  restart)
    restart_container
    ;;
  logs)
    show_logs
    ;;
  status)
    check_status
    ;;
  help|--help|-h)
    show_usage
    ;;
  *)
    echo "Unknown command: $1"
    show_usage
    exit 1
    ;;
esac

exit 0
