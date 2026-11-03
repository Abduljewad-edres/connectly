import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupAdmin() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Promote existing accounts so current logged-in user has admin rights immediately
  await User.updateMany(
    { email: { $in: ['abdul@gmai.com', 'ab@gmail.com'] } },
    { $set: { role: 'admin', isVerified: true, verificationStatus: 'verified' } }
  );
  console.log('Promoted abdul@gmai.com and ab@gmail.com to Admin role.');

  // 2. Create dedicated admin account: admin@connectly.com / admin123
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  let adminUser = await User.findOne({ email: 'admin@connectly.com' });
  if (!adminUser) {
    adminUser = await User.create({
      fullName: 'System Administrator',
      username: 'admin',
      email: 'admin@connectly.com',
      passwordHash,
      role: 'admin',
      isVerified: true,
      verificationStatus: 'verified',
      bio: 'Connectly Platform Super Administrator'
    });
    console.log('Created dedicated admin account: admin@connectly.com');
  } else {
    adminUser.passwordHash = passwordHash;
    adminUser.role = 'admin';
    adminUser.isVerified = true;
    adminUser.verificationStatus = 'verified';
    await adminUser.save();
    console.log('Updated existing admin account password to admin123.');
  }

  const allAdmins = await User.find({ role: 'admin' }).select('email username role isVerified');
  console.log('\n--- Active Admin Accounts ---');
  allAdmins.forEach(u => {
    console.log(`- Username: @${u.username} | Email: ${u.email} | Role: ${u.role} | Verified: ${u.isVerified}`);
  });

  await mongoose.disconnect();
  console.log('Database configuration complete.');
}

setupAdmin().catch((err) => {
  console.error('Setup error:', err);
  process.exit(1);
});
