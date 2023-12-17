import mongoose from 'mongoose';

const connect = () =>
  mongoose
    .connect(String(process.env.DB_URL))
    .then(() => console.log('db connected successfully'));

export default { connect };
