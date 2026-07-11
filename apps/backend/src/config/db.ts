import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('Falta MONGO_URI en las variables de entorno');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[db] Conectado a MongoDB');

  mongoose.connection.on('error', (err) => {
    console.error('[db] Error de conexion:', err);
  });
}
