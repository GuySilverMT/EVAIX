#!/usr/bin/env python3
"""
Voice Input - System-Wide Speech-to-Text
A lightweight alternative using Python and system tools
"""

import subprocess
import sys
import os
import tempfile
from pathlib import Path

try:
    import pyautogui
    import speech_recognition as sr
    from pynput import keyboard
    import tkinter as tk
    from tkinter import ttk
except ImportError:
    print("📦 Installing required Python packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", 
                          "pyautogui", "SpeechRecognition", "pynput", "pyaudio"])
    print("✅ Packages installed! Please run the script again.")
    sys.exit(0)

class VoiceInputApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Voice Input")
        self.root.geometry("400x300")
        self.root.attributes('-topmost', True)
        self.root.configure(bg='#1e1e28')
        
        # Make window appear near cursor
        x, y = pyautogui.position()
        self.root.geometry(f"+{x-200}+{y-150}")
        
        self.recognizer = sr.Recognizer()
        self.is_listening = False
        self.transcript_text = ""
        
        self.setup_ui()
        self.setup_hotkey()
        
    def setup_ui(self):
        """Create the UI"""
        # Status label
        self.status_label = tk.Label(
            self.root,
            text="Click microphone to start",
            font=("Segoe UI", 14),
            bg='#1e1e28',
            fg='white'
        )
        self.status_label.pack(pady=20)
        
        # Microphone button
        self.mic_button = tk.Button(
            self.root,
            text="🎤",
            font=("Segoe UI", 48),
            bg='#667eea',
            fg='white',
            activebackground='#f5576c',
            border=0,
            command=self.toggle_listening
        )
        self.mic_button.pack(pady=10)
        
        # Transcript display
        self.transcript = tk.Text(
            self.root,
            height=4,
            width=40,
            font=("Segoe UI", 10),
            bg='#2a2a3a',
            fg='white',
            border=0,
            padx=10,
            pady=10
        )
        self.transcript.pack(pady=10)
        self.transcript.insert('1.0', 'Your speech will appear here...')
        self.transcript.config(state='disabled')
        
        # Buttons frame
        button_frame = tk.Frame(self.root, bg='#1e1e28')
        button_frame.pack(pady=10)
        
        self.insert_btn = tk.Button(
            button_frame,
            text="Insert Text",
            font=("Segoe UI", 10, "bold"),
            bg='#667eea',
            fg='white',
            activebackground='#764ba2',
            border=0,
            padx=20,
            pady=10,
            command=self.insert_text,
            state='disabled'
        )
        self.insert_btn.pack(side='left', padx=5)
        
        cancel_btn = tk.Button(
            button_frame,
            text="Cancel",
            font=("Segoe UI", 10, "bold"),
            bg='#3a3a4a',
            fg='white',
            activebackground='#4a4a5a',
            border=0,
            padx=20,
            pady=10,
            command=self.cancel
        )
        cancel_btn.pack(side='left', padx=5)
        
        # Hint label
        hint = tk.Label(
            self.root,
            text="Press Ctrl+Shift+Space anywhere to activate",
            font=("Segoe UI", 8),
            bg='#1e1e28',
            fg='#888888'
        )
        hint.pack(side='bottom', pady=5)
        
    def setup_hotkey(self):
        """Setup global hotkey"""
        def on_activate():
            self.root.deiconify()
            self.root.lift()
            self.root.focus_force()
            
        # Define the hotkey combination
        hotkey = keyboard.HotKey(
            keyboard.HotKey.parse('<ctrl>+<shift>+<space>'),
            on_activate
        )
        
        # Start listening for the hotkey
        listener = keyboard.Listener(
            on_press=lambda k: hotkey.press(listener.canonical(k)),
            on_release=lambda k: hotkey.release(listener.canonical(k))
        )
        listener.start()
        
    def toggle_listening(self):
        """Toggle speech recognition"""
        if self.is_listening:
            self.stop_listening()
        else:
            self.start_listening()
            
    def start_listening(self):
        """Start speech recognition"""
        self.is_listening = True
        self.status_label.config(text="Listening...")
        self.mic_button.config(bg='#f5576c')
        
        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.listen(source, timeout=10)
                
            # Recognize speech
            text = self.recognizer.recognize_google(audio)
            self.transcript_text = text
            
            # Update transcript display
            self.transcript.config(state='normal')
            self.transcript.delete('1.0', 'end')
            self.transcript.insert('1.0', text)
            self.transcript.config(state='disabled')
            
            # Enable insert button
            self.insert_btn.config(state='normal')
            self.status_label.config(text="Ready to insert")
            
        except sr.WaitTimeoutError:
            self.status_label.config(text="No speech detected")
        except sr.UnknownValueError:
            self.status_label.config(text="Could not understand audio")
        except sr.RequestError as e:
            self.status_label.config(text=f"Error: {e}")
        except Exception as e:
            self.status_label.config(text=f"Error: {e}")
        finally:
            self.stop_listening()
            
    def stop_listening(self):
        """Stop speech recognition"""
        self.is_listening = False
        self.mic_button.config(bg='#667eea')
        
    def insert_text(self):
        """Insert the transcribed text"""
        if self.transcript_text:
            # Hide window
            self.root.withdraw()
            
            # Wait a bit for focus to return to previous app
            self.root.after(100, lambda: pyautogui.write(self.transcript_text, interval=0.01))
            
            # Reset
            self.transcript_text = ""
            self.transcript.config(state='normal')
            self.transcript.delete('1.0', 'end')
            self.transcript.insert('1.0', 'Your speech will appear here...')
            self.transcript.config(state='disabled')
            self.insert_btn.config(state='disabled')
            self.status_label.config(text="Click microphone to start")
            
    def cancel(self):
        """Cancel and hide window"""
        self.root.withdraw()
        
    def run(self):
        """Run the application"""
        print("🎤 Voice Input Started!")
        print("📌 Press Ctrl+Shift+Space from anywhere to activate")
        print("📌 Window will appear near your cursor")
        print("")
        self.root.mainloop()

if __name__ == "__main__":
    app = VoiceInputApp()
    app.run()
