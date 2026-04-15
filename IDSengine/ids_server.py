import os
import sys
import datetime
import numpy as np
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Note: blocked_ips is an in-memory set. 
# This is acceptable for the FYP (Final Year Project) scope.
# For production, this would be backed by Redis or a database.
blocked_ips = set()

# --- Startup: Load Models ---
MODEL_DIR = os.environ.get('MODEL_DIR', './models')

try:
    print(f"[IDS] Loading models from {MODEL_DIR}...")
    model = joblib.load(f'{MODEL_DIR}/ids_lgbm_model.pkl')
    le = joblib.load(f'{MODEL_DIR}/label_encoder.pkl')
    scaler = joblib.load(f'{MODEL_DIR}/scaler.pkl')
    print("[IDS] Models loaded successfully.")
except Exception as e:
    print(f"[IDS] ERROR: Failed to load models from {MODEL_DIR}.")
    print(f"[IDS] Exception: {e}")
    print("[IDS] Exiting.")
    sys.exit(1)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "model": "LightGBM CICIDS2017"
    }), 200

@app.route('/blocked', methods=['GET'])
def get_blocked():
    return jsonify({
        "blocked_ips": list(blocked_ips)
    }), 200

@app.route('/unblock', methods=['POST'])
def unblock():
    data = request.get_json(force=True, silent=True) or {}
    ip = data.get('ip')
    
    if not ip:
        return jsonify({"error": "Missing 'ip' in request body"}), 400
        
    if ip in blocked_ips:
        blocked_ips.remove(ip)
        
    return jsonify({
        "status": "unblocked", 
        "ip": ip
    }), 200

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        src_ip = data.get('src_ip', 'unknown')
        mac_address = data.get('mac_address', 'unknown')
        device_name = data.get('device_name', 'unknown')
        org_id = data.get('org_id', 'unknown')
        features = data.get('features')
        
        # 1. Validate features array is present and has exactly 76 values
        if not isinstance(features, list) or len(features) != 76:
            return jsonify({"error": "features must be array of 76 floats"}), 400
            
        # Ensure all features are floats
        try:
            features = [float(f) for f in features]
        except (ValueError, TypeError):
            return jsonify({"error": "features must be array of 76 floats"}), 400
            
        # 2. Scale
        scaled = scaler.transform(np.array(features).reshape(1, -1))
        
        # 3. Predict
        proba = model.predict_proba(scaled)[0]
        
        # 4. Get label
        pred_idx = np.argmax(proba)
        label = le.inverse_transform([pred_idx])[0]
        
        # 5. Get confidence
        confidence = float(proba[pred_idx])
        
        # 6. Determine action
        if label == 'BENIGN':
            action = 'ALLOW'
        else:
            if confidence >= 0.70:
                action = 'BLOCK'
            else:
                action = 'FLAG'
                
        # Update blocked_ips set if action is BLOCK
        if action == 'BLOCK' and src_ip != 'unknown':
            blocked_ips.add(src_ip)
            
        # Log BLOCK and FLAG to stdout
        if action in ['BLOCK', 'FLAG']:
            print(f"[IDS] {action} | IP: {src_ip} | Label: {label} | Confidence: {confidence:.4f}")
            
        # 7. Return 200
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        return jsonify({
            "src_ip": src_ip,
            "mac_address": mac_address,
            "device_name": device_name,
            "org_id": org_id,
            "prediction": label,
            "confidence": confidence,
            "action": action,
            "timestamp": timestamp
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    # Run on host 0.0.0.0, port 8000 (internal only)
    app.run(host='0.0.0.0', port=9632)
