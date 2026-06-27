export const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  const payload = {
    success: true,
    message,
  };
  
  if (data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};
