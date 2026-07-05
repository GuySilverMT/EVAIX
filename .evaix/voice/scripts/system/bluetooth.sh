#!/bin/bash

# Bluetooth control script using bluetoothctl

ACTION=$1

# Get current Bluetooth status (yes or no for Powered)
# 'bluetoothctl show' has a line like 'Powered: yes' or 'Powered: no'
STATUS=$(bluetoothctl show | grep "Powered:" | awk '{print $2}')

case "$ACTION" in
    on)
        if [ "$STATUS" = "yes" ]; then
            echo "Bluetooth is already on."
        else
            bluetoothctl power on > /dev/null 2>&1
            echo "Bluetooth turned on."
        fi
        ;;
    off)
        if [ "$STATUS" = "no" ]; then
            echo "Bluetooth is already off."
        else
            bluetoothctl power off > /dev/null 2>&1
            echo "Bluetooth turned off."
        fi
        ;;
    toggle)
        if [ "$STATUS" = "yes" ]; then
            bluetoothctl power off > /dev/null 2>&1
            echo "Bluetooth toggled off."
        else
            bluetoothctl power on > /dev/null 2>&1
            echo "Bluetooth toggled on."
        fi
        ;;
    *)
        echo "Usage: $0 {on|off|toggle}"
        exit 1
        ;;
esac
