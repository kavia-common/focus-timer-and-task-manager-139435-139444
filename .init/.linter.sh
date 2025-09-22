#!/bin/bash
cd /home/kavia/workspace/code-generation/focus-timer-and-task-manager-139435-139444/pomodoro_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

