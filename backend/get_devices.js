import mongoose from 'mongoose';

mongoose.connect('mongodb://globaldatabase:VeryStrongPassword12345@5.189.167.55:27017/raidware_db?authSource=admin').then(async () => {
  const db = mongoose.connection.db;
  const devices = await db.collection('devices').find({}).toArray();
  console.log(JSON.stringify(devices, null, 2));
  process.exit(0);
});
