import NetworkLog from '../models/NetworkLog.js';
// Assuming redis is exported from a config file. If the path differs, adjust accordingly.
import redis from '../config/redis.js';

export const saveAndAnalyzeLog = async (logData) => {
  try {
    const {
      orgId, macAddress, deviceName,
      srcIp, dstIp, protocol, srcPort, dstPort,
      flowDuration, packetCount, byteCount,
      features
    } = logData;

    let prediction = 'UNKNOWN';
    let confidence = 0;
    let action = 'ALLOW';
    
    const isValidFeatures = Array.isArray(features) && features.length === 76;
    const rawFeatures = isValidFeatures;

    if (rawFeatures) {
      try {
        const idsUrl = process.env.IDS_ENGINE_URL || 'http://127.0.0.1:9632';
        const response = await fetch(`${idsUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            src_ip: srcIp,
            mac_address: macAddress,
            device_name: deviceName,
            org_id: orgId,
            features: features
          })
        });

        if (response.ok) {
          const result = await response.json();
          prediction = result.prediction || 'BENIGN';
          confidence = result.confidence || 0;
          action = result.action || 'ALLOW';
          
          if (action === 'BLOCK' || action === 'FLAG') {
            console.log(`[NetworkLog] ${action} VERDICT | IP: ${srcIp} | Device: ${deviceName} | Prediction: ${prediction} (${confidence})`);
          }
        } else {
          console.warn(`[NetworkLog] IDS engine returned non-200 status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`[NetworkLog] IDS engine unreachable: ${error.message}`);
      }
    } else {
      console.log("[NetworkLog] No features provided — skipping IDS analysis");
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
      features: features || [],
      prediction,
      confidence,
      action,
      rawFeatures
    });

    return newLog;
  } catch (error) {
    console.error(`[NetworkLog] Error in saveAndAnalyzeLog: ${error.message}`);
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
  } catch (error) {
    console.error(`[NetworkLog] Error in getLogsForOrg: ${error.message}`);
    return [];
  }
};
