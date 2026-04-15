import NetworkLog from '../models/NetworkLog.js';
import redis from '../config/redis.js';

const IDS_URL = process.env.IDS_ENGINE_URL || 'http://127.0.0.1:9632';

async function callIDS(logData) {
  const {
    orgId, macAddress, deviceName,
    srcIp, dstIp, protocol, srcPort, dstPort,
    flowDuration, packetCount, byteCount,
    features,
  } = logData;

  const hasFullFeatures = Array.isArray(features) && features.length === 76;

  try {
    if (hasFullFeatures) {

      const res = await fetch(`${IDS_URL}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          src_ip:      srcIp,
          mac_address: macAddress,
          device_name: deviceName,
          org_id:      orgId,
          features,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const result = await res.json();
        return {
          prediction:  result.prediction  || 'BENIGN',
          confidence:  result.confidence  ?? 0,
          action:      result.action      || 'ALLOW',
          rawFeatures: true,
        };
      }

      console.warn(`[NetworkLog] IDS /analyze returned ${res.status} — falling back to /predict`);
    }

    const res = await fetch(`${IDS_URL}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        src_ip:       srcIp,
        dst_ip:       dstIp,
        protocol:     protocol  || 'TCP',
        src_port:     srcPort   || 0,
        dst_port:     dstPort   || 0,
        packet_count: packetCount || 0,
        byte_count:   byteCount   || 0,
        flow_duration: flowDuration || 0,
        mac_address:  macAddress,
        device_name:  deviceName,
        org_id:       orgId,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const result = await res.json();
      return {
        prediction:  result.prediction  || 'BENIGN',
        confidence:  result.confidence  ?? 0,
        action:      result.action      || 'ALLOW',
        rawFeatures: false,
      };
    }

    console.warn(`[NetworkLog] IDS /predict returned ${res.status}`);
  } catch (err) {
    console.warn(`[NetworkLog] IDS unreachable (${IDS_URL}): ${err.message}`);
  }

  return { prediction: 'BENIGN', confidence: 0.5, action: 'ALLOW', rawFeatures: false };
}

export const saveAndAnalyzeLog = async (logData) => {
  try {
    const {
      orgId, macAddress, deviceName,
      srcIp, dstIp, protocol, srcPort, dstPort,
      flowDuration, packetCount, byteCount,
      features,
    } = logData;

    const { prediction, confidence, action, rawFeatures } = await callIDS(logData);

    if (action === 'BLOCK' || action === 'FLAG') {
      console.log(
        `[NetworkLog] ${action} VERDICT | IP: ${srcIp} | Device: ${deviceName} ` +
        `| Prediction: ${prediction} (${(confidence * 100).toFixed(1)}%)`
      );
    }

    const newLog = await NetworkLog.create({
      orgId,
      macAddress,
      deviceName,
      srcIp,
      dstIp,
      protocol,
      srcPort,
      dstPort,
      flowDuration,
      packetCount,
      byteCount,
      features:   features || [],
      prediction,
      confidence,
      action,
      rawFeatures,
    });

    return newLog;
  } catch (err) {
    console.error(`[NetworkLog] Error in saveAndAnalyzeLog: ${err.message}`);
    return null;
  }
};

export const getLogsForOrg = async (orgId, options = {}) => {
  try {
    const { limit = 50, skip = 0, alertsOnly = false } = options;

    const query = { orgId };

    if (alertsOnly) {
      query.action = { $in: ['FLAG', 'BLOCK'] };
    }

    const logs = await NetworkLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return logs;
  } catch (err) {
    console.error(`[NetworkLog] Error in getLogsForOrg: ${err.message}`);
    return [];
  }
};
