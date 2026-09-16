from flask import Flask, jsonify

app = Flask(__name__)

data = [
    {"name": "Tirupati", "state": "Andhra Pradesh", "crowd": 65},
    {"name": "Varanasi", "state": "Uttar Pradesh", "crowd": 80},
    {"name": "Rameshwaram", "state": "Tamil Nadu", "crowd": 45}
]

@app.route("/api/destinations")
def get_destinations():
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True, port=5000)