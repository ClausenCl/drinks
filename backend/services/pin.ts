import bcrypt from "bcryptjs";

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, pinHash: string) {
  return bcrypt.compare(pin, pinHash);
}

