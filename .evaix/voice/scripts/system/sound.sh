#!/bin/bash

# Sound control script using wpctl (default sink)
# 'on' means sound is unmuted
# 'off' means sound is muted

ACTION=$1

# Get current sound status
# 'wpctl get-volume @DEFAULT_AUDIO_SINK@' outputs something like 'Volume: 0.50 [MUTED]' or 'Volume: 0.50'
STATUS=$(wpctl get-volume @DEFAULT_AUDIO_SINK@)

case "$ACTION" in
    on)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            wpctl set-mute @DEFAULT_AUDIO_SINK@ 0
            echo "Sound turned on (unmuted)."
        else
            echo "Sound is already on."
        fi
        ;;
    off)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            echo "Sound is already off (muted)."
        else
            wpctl set-mute @DEFAULT_AUDIO_SINK@ 1
            echo "Sound turned off (muted)."
        fi
        ;;
    toggle)
        if [[ "$STATUS" == *"[MUTED]"* ]]; then
            wpctl set-mute @DEFAULT_AUDIO_SINK@ 0
            echo "Sound toggled on."
        else
            wpctl set-mute @DEFAULT_AUDIO_SINK@ 1
            echo "Sound toggled off."
        fi
        ;;
    *)
        echo "Usage: $0 {on|off|toggle}"
        exit 1
        ;;
esac
