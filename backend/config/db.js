import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectly');
    console.log(`[Connectly Backend] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Connectly Backend] MongoDB Connection Error: ${error.message}`);
    console.error(`Please verify your MongoDB instance is running locally or provide a valid MONGODB_URI in backend/.env`);
  }
};

export default connectDB;

