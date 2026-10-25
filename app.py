from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)
history = []

@app.get("/")
def home():
    return render_template("index.html")

@app.post("/api/recognition")
def recognition():
    data = request.get_json(silent=True) or {}
    gesture = str(data.get("gesture", "Unknown"))[:80]
    meaning = str(data.get("meaning", ""))[:160]
    if gesture and gesture != "No hand detected":
        history.insert(0, {
            "gesture": gesture,
            "meaning": meaning,
            "time": datetime.now().strftime("%H:%M:%S")
        })
        del history[20:]
    return jsonify({"ok": True, "count": len(history)})

@app.get("/api/history")
def get_history():
    return jsonify(history)

@app.post("/api/history/clear")
def clear_history():
    history.clear()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True)
