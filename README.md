# SignConnect — Gesture Communication Assistant

A hackathon-ready web prototype that uses a laptop webcam and MediaPipe Hands to detect selected hand shapes and show suggested messages.

## Features
- Live webcam hand tracking and landmark overlay
- Five simple hand-shape classes: open palm, closed fist, index finger up, two fingers up, thumbs up
- Builds a short message from stable detections
- Text-to-speech and copy-message controls
- Flask API records recent recognized gestures in memory
- Webcam frames are processed in the browser; the app does not upload frames to Flask

## Important limitation
This is a hand-shape demonstration, **not a complete sign-language translator**. Labels such as “Hello” and “Thank you” are suggested message meanings for the demo and are not claims that these shapes correspond to those signs in every sign language. Real sign-language translation requires language-specific, validated datasets and often temporal motion and facial cues.

## Requirements
- Python 3.10 or newer recommended
- VS Code
- A modern browser (Chrome or Edge recommended)
- Internet connection on first load to download MediaPipe JavaScript files from jsDelivr
- Laptop webcam

## Run in VS Code (Windows)
1. Extract `SignConnect.zip`.
2. Open VS Code → **File → Open Folder** → choose the `SignConnect` folder.
3. Open **Terminal → New Terminal**.
4. Create a virtual environment:
   ```powershell
   py -m venv .venv
   ```
5. Activate it:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks activation, use Command Prompt terminal and run:
   ```bat
   .venv\Scripts\activate.bat
   ```
6. Install dependencies:
   ```powershell
   python -m pip install -r requirements.txt
   ```
7. Start the app:
   ```powershell
   python app.py
   ```
8. Open this address in Chrome or Edge:
   `http://127.0.0.1:5000`
9. Click **Start camera** and allow camera permission.

## Run on macOS / Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```
Then open `http://127.0.0.1:5000`.

## Troubleshooting
- **Camera permission denied:** click the lock/camera icon in the browser address bar and allow camera access, then refresh.
- **MediaPipe not loading:** check internet access, refresh the page, and check the browser console.
- **Black camera preview:** close apps already using the webcam and restart the browser.
- **PowerShell activation error:** use the Command Prompt activation command shown above.
- **Port already in use:** stop the other Flask app or change the port in `app.py`.
- **Gesture labels flicker:** improve lighting, keep your hand fully in frame, and hold a gesture steady.

## Project structure
```text
SignConnect/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── app.js
```

## Suggested next improvements
- Collect a consented dataset for a clearly specified sign language.
- Train and evaluate a temporal gesture model rather than relying only on hand-shape rules.
- Add language selection, accessible keyboard controls, and user testing with sign-language experts.
