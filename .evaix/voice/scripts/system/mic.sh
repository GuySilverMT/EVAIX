#!/bin/bash

# Microphone control script using wpctl (default source)
# 'on' means mic is unmuted
# 'off' means mic is muted

ACTION=$1

# Get current microphone status
# 'wpctl get-volume @DEFAULT_AUDIO_SOURCE@' outputs something like 'Volume: 0.50 [MUTED]' or 'Volume: 0.50'
STATUS=$(wpctl get-volume @DEFAULT_AUDIO_SOURCE@)

case "$ACTION" in
    on)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 0
            echo "Microphone turned on (unmuted)."
        else
            echo "Microphone is already on."
        fi
        ;;
    off)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            echo "Microphone is already off (muted)."
        else
            wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 1
            echo "Microphone turned off (muted)."
        fi
        ;;
    toggle)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 0
            echo "Microphone toggled on."
        else
            wpctl set-mute @DEFAULT_AUDIO_SOURCE@ 1
            echo "Microphone toggled off."
        fi
        ;;
    *)
        echo "Usage: $0 {on|off|toggle}"
        exit 1
        ;;
esac
