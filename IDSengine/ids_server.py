import os
import sys
import datetime
import numpy as np
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)

blocked_ips = set()

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

SUSPICIOUS_PORTS = {
    23,   
    445,  
    3389, 
    5900, 
    6379, 
    27017,
    1433, 
}

COMMON_SCAN_PORTS = {
    21, 22, 23, 25, 53, 80, 110, 443, 8080, 8443
}

def rule_based_predict(src_ip, dst_ip, protocol, src_port, dst_port,
                       packet_count, byte_count, flow_duration):
    """
    Rule-based IDS for metadata-only logs.
    Returns (prediction_label, confidence, action).
    """
    score = 0.0
    label = 'BENIGN'

    if src_ip in blocked_ips:
        return 'PortScan', 0.95, 'BLOCK'

    if dst_port in SUSPICIOUS_PORTS:
        score += 0.4
        label = 'Brute Force'

    if packet_count > 0 and byte_count > 0:
        bytes_per_pkt = byte_count / packet_count
        if bytes_per_pkt < 50 and packet_count > 100:
            score += 0.35
            label = 'DoS Hulk'

    if dst_port in COMMON_SCAN_PORTS and packet_count > 200:
        score += 0.25
        label = 'PortScan'

    if byte_count > 100_000 and dst_port not in COMMON_SCAN_PORTS:
        score += 0.2
        label = 'Botnet'

    if flow_duration and flow_duration > 300 and packet_count > 500:
        score += 0.15
        label = 'DDoS'

    if protocol == 'UDP' and dst_port != 53 and packet_count > 50:
        score += 0.2
        label = 'DDoS'

    confidence = min(0.55 + score, 0.97)

    if label == 'BENIGN':
        confidence = max(0.80, 1.0 - score)
        action = 'ALLOW'
    elif confidence >= 0.75:
        action = 'BLOCK'
        if src_ip and src_ip not in ('0.0.0.0', 'unknown'):
            blocked_ips.add(src_ip)
    else:
        action = 'FLAG'

    return label, confidence, action

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
    """Full ML analysis — requires 76-element feature vector."""
    try:
        data = request.get_json(force=True, silent=True) or {}

        src_ip = data.get('src_ip', 'unknown')
        mac_address = data.get('mac_address', 'unknown')
        device_name = data.get('device_name', 'unknown')
        org_id = data.get('org_id', 'unknown')
        features = data.get('features')

        if not isinstance(features, list) or len(features) != 76:
            return jsonify({"error": "features must be array of 76 floats"}), 400

        try:
            features = [float(f) for f in features]
        except (ValueError, TypeError):
            return jsonify({"error": "features must be array of 76 floats"}), 400

        scaled = scaler.transform(np.array(features).reshape(1, -1))

        proba = model.predict_proba(scaled)[0]

        pred_idx = np.argmax(proba)
        label = le.inverse_transform([pred_idx])[0]

        confidence = float(proba[pred_idx])

        if label == 'BENIGN':
            action = 'ALLOW'
        else:
            if confidence >= 0.70:
                action = 'BLOCK'
            else:
                action = 'FLAG'

        if action == 'BLOCK' and src_ip != 'unknown':
            blocked_ips.add(src_ip)

        if action in ['BLOCK', 'FLAG']:
            print(f"[IDS] {action} | IP: {src_ip} | Label: {label} | Confidence: {confidence:.4f}")

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

@app.route('/predict', methods=['POST'])
def predict_basic():
    """
    Rule-based analysis for metadata-only logs (no 76-feature vector).
    Accepts basic telemetry from IoT devices that cannot compute CICIDS features.
    Always returns a prediction so every log entry has an action.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}

        src_ip    = data.get('src_ip',    '0.0.0.0')
        dst_ip    = data.get('dst_ip',    '0.0.0.0')
        protocol  = data.get('protocol',  'TCP')
        src_port  = int(data.get('src_port',  0))
        dst_port  = int(data.get('dst_port',  0))
        packet_count = int(data.get('packet_count', 0))
        byte_count   = int(data.get('byte_count',   0))
        flow_duration = float(data.get('flow_duration', 0))
        mac_address = data.get('mac_address', 'unknown')
        device_name = data.get('device_name', 'unknown')
        org_id      = data.get('org_id',      'unknown')

        label, confidence, action = rule_based_predict(
            src_ip, dst_ip, protocol, src_port, dst_port,
            packet_count, byte_count, flow_duration
        )

        if action in ['BLOCK', 'FLAG']:
            print(f"[IDS/predict] {action} | IP: {src_ip} | Label: {label} | Conf: {confidence:.4f}")

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return jsonify({
            "src_ip":      src_ip,
            "mac_address": mac_address,
            "device_name": device_name,
            "org_id":      org_id,
            "prediction":  label,
            "confidence":  confidence,
            "action":      action,
            "method":      "rule_based",
            "timestamp":   timestamp
        }), 200

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9632)
