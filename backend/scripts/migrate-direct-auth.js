import mongoose from 'mongoose';
import Device from '../models/Device.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrateToDirectAuth() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Starting migration: Adding direct connection support...');

    // Update all devices to have direct connection type
    const result = await Device.updateMany(
      { connectionType: { $exists: false } },
      {
        $set: { connectionType: 'direct' },
        $unset: { parentMac: 1 }  // Remove parent requirement
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} devices`);
    console.log('Migration complete!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateToDirectAuth();
