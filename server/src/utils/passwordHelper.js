import bcrypt from "bcrypt";

export const hashPassword = async (pass) => {
  return await bcrypt.hash(pass, 12);
};

export const comparePassword = async (stored, candidate) => {
  return await bcrypt.compare(stored, candidate);
};
