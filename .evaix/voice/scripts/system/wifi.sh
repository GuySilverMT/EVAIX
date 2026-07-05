#!/bin/bash

# Wi-Fi control script using nmcli

ACTION=$1

# Get current Wi-Fi status (enabled or disabled)
# The output of nmcli radio wifi is usually 'enabled' or 'disabled'
STATUS=$(nmcli radio wifi)

case "$ACTION" in
    on)
        if [ "$STATUS" = "enabled" ]; then
            echo "Wi-Fi is already on."
        else
            nmcli radio wifi on
            echo "Wi-Fi turned on."
        fi
        ;;
    off)
        if [ "$STATUS" = "disabled" ]; then
            echo "Wi-Fi is already off."
        else
            nmcli radio wifi off
            echo "Wi-Fi turned off."
        fi
        ;;
    toggle)
        if [ "$STATUS" = "enabled" ]; then
            nmcli radio wifi off
            echo "Wi-Fi toggled off."
        else
            nmcli radio wifi on
            echo "Wi-Fi toggled on."
        fi
        ;;
    *)
        echo "Usage: $0 {on|off|toggle}"
        exit 1
        ;;
esac
