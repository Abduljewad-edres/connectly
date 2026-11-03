import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Follow from './models/Follow.js';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectly';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Clear existing collections
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Follow.deleteMany({})
    ]);

    console.log('Creating demo users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const user1 = await User.create({
      fullName: 'Abdul Rahman',
      username: 'abdul_dev',
      email: 'abdul@example.com',
      passwordHash,
      bio: 'Full-stack software engineer & open source enthusiast. Building Connectly!',
      profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
    });

    const user2 = await User.create({
      fullName: 'Sarah Connor',
      username: 'sarah_designs',
      email: 'sarah@example.com',
      passwordHash,
      bio: 'UI/UX Designer • Visual Thinker • Passionate about clean digital interfaces.',
      profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80'
    });

    const user3 = await User.create({
      fullName: 'Alex Morgan',
      username: 'alex_tech',
      email: 'alex@example.com',
      passwordHash,
      bio: 'Tech lead & cloud enthusiast. Exploring microservices and scalable web apps.',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
    });

    console.log('Creating follow relationships...');
    // Abdul follows Sarah & Alex
    await Follow.create({ follower: user1._id, following: user2._id });
    await Follow.create({ follower: user1._id, following: user3._id });
    // Sarah follows Abdul
    await Follow.create({ follower: user2._id, following: user1._id });

    console.log('Creating demo posts...');
    const post1 = await Post.create({
      author: user1._id,
      content: 'Hello Connectly world! 🚀 Super excited to share our brand new social media platform built with React, Node.js, Express, and MongoDB. Connect. Share. Belong.',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      likes: [user2._id, user3._id]
    });

    const post2 = await Post.create({
      author: user2._id,
      content: 'Design is not just what it looks like and feels like. Design is how it works. Refining user experiences today! ✨',
      imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
      likes: [user1._id]
    });

    const post3 = await Post.create({
      author: user3._id,
      content: 'What are your favorite full-stack architectural patterns in 2026? Drop your thoughts below! 👇',
      imageUrl: '',
      likes: [user1._id, user2._id]
    });

    console.log('Creating comments...');
    await Comment.create({
      post: post1._id,
      author: user2._id,
      content: 'Welcome to Connectly, Abdul! The UI looks amazingly clean!'
    });

    await Comment.create({
      post: post1._id,
      author: user3._id,
      content: 'Solid work on the architecture and REST APIs!'
    });

    await Comment.create({
      post: post3._id,
      author: user1._id,
      content: 'Clean modular controllers, separated routes, and Mongoose ODM compound indices!'
    });

    console.log('==============================================');
    console.log('  Database seeded successfully!');
    console.log('  Test credentials:');
    console.log('  User 1: abdul@example.com / password123 (@abdul_dev)');
    console.log('  User 2: sarah@example.com / password123 (@sarah_designs)');
    console.log('  User 3: alex@example.com / password123 (@alex_tech)');
    console.log('==============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();

