#!/bin/bash

# Notifications control script using dunstctl
# 'on' means notifications are enabled (not paused)
# 'off' means notifications are disabled (paused)

ACTION=$1

# Get current notifications status (true or false for paused)
# 'dunstctl is-paused' outputs 'true' (if paused/off) or 'false' (if not paused/on)
STATUS=$(dunstctl is-paused)

case "$ACTION" in
    on)
        if [ "$STATUS" = "false" ]; then
            echo "Notifications are already on."
        else
            dunstctl set-paused false
            echo "Notifications turned on."
        fi
        ;;
    off)
        if [ "$STATUS" = "true" ]; then
            echo "Notifications are already off."
        else
            dunstctl set-paused true
            echo "Notifications turned off."
        fi
        ;;
    toggle)
        if [ "$STATUS" = "false" ]; then
            dunstctl set-paused true
            echo "Notifications toggled off."
        else
            dunstctl set-paused false
            echo "Notifications toggled on."
        fi
        ;;
    *)
        echo "Usage: $0 {on|off|toggle}"
        exit 1
        ;;
esac
